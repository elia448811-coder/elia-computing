import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import QRCode from "qrcode";
import { getDatabase } from "@/lib/firebase-admin";

const COOKIE_NAME = "elia_admin_session";
const SESSION_TTL = 14400;
const RECENT_LOGIN_SECONDS = 300;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 900000;
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const scrypt = promisify(scryptCallback);
type AuthState = {
  loginUsername?: string;
  passwordHash?: string;
  sessionVersion: number;
  totpEnabled?: boolean;
  totpSecretCipher?: string | null;
  totpPendingSecretCipher?: string | null;
  totpPendingExpiresAt?: number | null;
  totpPendingSessionVersion?: number | null;
  totpPendingSessionId?: string | null;
  totpPendingFailures?: number;
  lastGoogleAuthTime?: number;
  totpManagementFailures?: number;
  totpManagementExpiresAt?: number;
  recoveryCodeHashes?: string[];
  lastLoginTotpCounter?: number | null;
  revokedSessions?: { id: string; expires: number }[];
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be configured in production");
  return value ?? "development-only-change-me";
}
function safeEqual(a: string, b: string) {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function credentialsEqual(submitted: string, expected: string) {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(submitted), digest(expected));
}
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("base64url"); }
export function hashIdentifier(value: string) { return createHmac("sha256", secret()).update(value).digest("hex"); }
export type SecurityActivity = { id: string; createdAt: string; kind: "login"; device: string; ipHint: string };
export async function recordSecurityLogin(userAgent: string, ipAddress: string) {
  const id = randomBytes(12).toString("hex"), ipHash = hashIdentifier(ipAddress);
  await getDatabase().doc(`securityEvents/${id}`).create({ id, createdAt: new Date().toISOString(), kind: "login", device: userAgent.slice(0, 220) || "דפדפן לא ידוע", ipHint: ipHash.slice(0, 8) });
}
export async function getSecurityActivity(): Promise<SecurityActivity[]> {
  const snapshot = await getDatabase().collection("securityEvents").orderBy("createdAt", "desc").limit(8).get();
  return snapshot.docs.map((item) => item.data() as SecurityActivity);
}
async function state(): Promise<AuthState> {
  const data = (await getDatabase().doc("system/auth").get()).data() as Partial<AuthState> | undefined;
  return {
    passwordHash: data?.passwordHash,
    loginUsername: data?.loginUsername,
    sessionVersion: Number(data?.sessionVersion ?? 1),
    revokedSessions: data?.revokedSessions ?? [],
    totpEnabled: data?.totpEnabled === true,
    totpSecretCipher: data?.totpSecretCipher,
    totpPendingSecretCipher: data?.totpPendingSecretCipher,
    totpPendingExpiresAt: data?.totpPendingExpiresAt,
    totpPendingSessionVersion: data?.totpPendingSessionVersion,
    recoveryCodeHashes: Array.isArray(data?.recoveryCodeHashes) ? data.recoveryCodeHashes : [],
  };
}

export function deviceDraftKey(device: string) {
  return createHmac("sha256", secret()).update(`elia-local-draft-key-v1:\0${device}`).digest("base64");
}

function encryptionKey() { return createHash("sha256").update(secret()).digest(); }
function encryptSecret(value: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}
function decryptSecret(value: string) {
  const [ivValue, tagValue, bodyValue] = value.split(".");
  if (!ivValue || !tagValue || !bodyValue) throw new Error("invalid-encrypted-secret");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(bodyValue, "base64url")), decipher.final()]).toString("utf8");
}
function toBase32(value: Buffer) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, buffer = 0, result = "";
  for (const byte of value) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) result += alphabet[(buffer << (5 - bits)) & 31];
  return result;
}
function fromBase32(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, buffer = 0;
  const bytes: number[] = [];
  for (const character of value.replace(/=+$/g, "").toUpperCase()) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("invalid-base32-secret");
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}
function totpAt(secretKey: string, counter: number) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", fromBase32(secretKey)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 15;
  const number = (digest.readUInt32BE(offset) & 0x7fffffff) % (10 ** TOTP_DIGITS);
  return String(number).padStart(TOTP_DIGITS, "0");
}
function unusedTotpCounter(secretKey: string, code: string, previous = -1) {
  if (!/^\d{6}$/.test(code)) return undefined;
  const current = Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS);
  return [current, current - 1, current + 1].find((counter) =>
    counter > previous && safeEqual(totpAt(secretKey, counter), code));
}
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}
async function passwordMatches(password: string, encoded?: string) {
  if (!encoded) return Boolean(password && process.env.ADMIN_PASSWORD && credentialsEqual(password, process.env.ADMIN_PASSWORD));
  const [algorithm, salt, expected] = encoded.split(":");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = (await scrypt(password, salt, 64) as Buffer).toString("hex");
  return safeEqual(actual, expected);
}
async function reservePasswordAttempt(key: string) {
  const db = getDatabase(), ref = db.doc(`loginAttempts/${key}`);
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data();
    const active = Number(data?.expiresAt ?? 0) > Date.now();
    const count = active ? Number(data?.count ?? 0) : 0;
    if (count >= MAX_ATTEMPTS) return false;
    tx.set(ref, { count: count + 1, expiresAt: active ? data!.expiresAt : Date.now() + LOCK_MS });
    return true;
  });
}

export async function authenticate(username: string, password: string, key: string) {
  if (!(await reservePasswordAttempt(key))) return { ok: false as const, locked: true };
  const auth = await state();
  const expected = auth.loginUsername || process.env.ADMIN_USERNAME || "";
  const validUsername = credentialsEqual(username, expected);
  // One account has one verifier. Run it for every admitted username.
  const validPassword = await passwordMatches(password, auth.passwordHash);
  if (!expected || !password || !validUsername || !validPassword) {
    return { ok: false as const, locked: false };
  }
  await getDatabase().doc(`loginAttempts/${key}`).delete();
  return { ok: true as const, locked: false, sessionVersion: auth.sessionVersion };
}

export async function createSession(version: number, loginTime = 0) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const payload = `admin.${expires}.${version}.${loginTime}.${randomBytes(18).toString("hex")}`;
  (await cookies()).set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: SESSION_TTL, priority: "high",
  });
}

// Firebase can issue multiple ID tokens for one sign-in. Redeem the sign-in itself once.
export async function redeemGoogleLogin(authTime: number, version: number) {
  const db = getDatabase(), ref = db.doc("system/auth");
  return db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as Partial<AuthState> | undefined;
    if (!hasRecentLogin(authTime) || version !== Number(current?.sessionVersion ?? 1) || authTime <= (current?.lastGoogleAuthTime ?? 0)) return false;
    tx.set(ref, { lastGoogleAuthTime: authTime }, { merge: true });
    return true;
  });
}

export async function getTwoFactorStatus() {
  const auth = await state();
  return { enabled: auth.totpEnabled === true && Boolean(auth.totpSecretCipher), recoveryCodesRemaining: auth.recoveryCodeHashes?.length ?? 0 };
}

function normalizeRecoveryCode(value: string) { return value.toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function recoveryCodeHash(value: string) { return createHmac("sha256", secret()).update(`recovery:${normalizeRecoveryCode(value)}`).digest("hex"); }
function createRecoveryCodes() {
  return Array.from({ length: 8 }, () => {
    const value = randomBytes(9).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "").padEnd(12, "X").slice(0, 12);
    return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}`;
  });
}

export async function beginTwoFactorEnrollment(sessionId: string, expectedVersion: number) {
  const secretKey = toBase32(randomBytes(20));
  const expiresAt = Date.now() + (10 * 60 * 1000);
  const db = getDatabase(), ref = db.doc("system/auth");
  await db.runTransaction(async (transaction) => {
    const auth = (await transaction.get(ref)).data() as Partial<AuthState> | undefined;
    if (expectedVersion !== undefined && Number(auth?.sessionVersion ?? 1) !== expectedVersion) throw new Error("stale-session");
    if (auth?.totpEnabled) throw new Error("two-factor-already-enabled");
    if (auth?.totpPendingSecretCipher && Number(auth.totpPendingExpiresAt) > Date.now() && auth.totpPendingSessionVersion === expectedVersion && auth.totpPendingSessionId && auth.totpPendingSessionId !== sessionId) throw new Error("enrollment-in-progress");
    transaction.set(ref, {
      totpPendingSecretCipher: encryptSecret(secretKey),
      totpPendingSessionId: sessionId,
      totpPendingFailures: 0,
      totpPendingExpiresAt: expiresAt,
      totpPendingSessionVersion: Number(auth?.sessionVersion ?? 1),
    }, { merge: true });
  });
  const issuer = "Elia Computing";
  const account = "elia448811@gmail.com";
  const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secretKey}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
  return {
    secretKey,
    qrDataUrl: await QRCode.toDataURL(uri, { width: 260, margin: 1, errorCorrectionLevel: "M" }),
  };
}

export async function confirmTwoFactorEnrollment(code: string, sessionId: string, expectedVersion: number) {
  const db = getDatabase(), ref = db.doc("system/auth");
  return db.runTransaction(async (transaction) => {
    const auth = (await transaction.get(ref)).data() as Partial<AuthState> | undefined;
    if ((expectedVersion !== undefined && Number(auth?.sessionVersion ?? 1) !== expectedVersion) || auth?.totpEnabled || !auth?.totpPendingSecretCipher || Number(auth.totpPendingExpiresAt ?? 0) < Date.now() ||
        auth.totpPendingSessionVersion !== Number(auth.sessionVersion ?? 1)) return { ok: false as const, recoveryCodes: [] };
    if (auth.totpPendingSessionId !== sessionId || (auth.totpPendingFailures ?? 0) >= MAX_ATTEMPTS) return { ok: false as const, recoveryCodes: [] };
    const secretKey = decryptSecret(auth.totpPendingSecretCipher);
    const counter = unusedTotpCounter(secretKey, code);
    if (counter === undefined) {
      transaction.set(ref, { totpPendingFailures: (auth.totpPendingFailures ?? 0) + 1 }, { merge: true });
      return { ok: false as const, recoveryCodes: [] };
    }
    const recoveryCodes = createRecoveryCodes();
    transaction.set(ref, {
      totpEnabled: true,
      lastLoginTotpCounter: counter,
      totpSecretCipher: encryptSecret(secretKey),
      totpPendingSecretCipher: null,
      totpPendingExpiresAt: null,
      totpPendingSessionVersion: null,
      totpPendingSessionId: null,
      totpPendingFailures: 0,
      recoveryCodeHashes: recoveryCodes.map(recoveryCodeHash),
      sessionVersion: Number(auth.sessionVersion ?? 1) + 1,
    }, { merge: true });
    return { ok: true as const, recoveryCodes, sessionVersion: Number(auth.sessionVersion ?? 1) + 1 };
  });
}

export async function cancelTwoFactorEnrollment(sessionId: string, expectedVersion: number) {
  const db = getDatabase(), ref = db.doc("system/auth");
  await db.runTransaction(async (tx) => {
    const auth = (await tx.get(ref)).data();
    if (Number(auth?.sessionVersion ?? 1) !== expectedVersion || auth?.totpPendingSessionId !== sessionId) return;
    tx.set(ref, { totpPendingSecretCipher: null, totpPendingExpiresAt: null, totpPendingSessionVersion: null, totpPendingSessionId: null, totpPendingFailures: 0 }, { merge: true });
  });
}

// Reuse the existing management window for every proof of the enrolled factor.
function accountFactorWindow(auth: Partial<AuthState>) {
  const now = Date.now();
  const expiresAt = Number(auth.totpManagementExpiresAt ?? 0);
  return expiresAt > now
    ? { failures: Number(auth.totpManagementFailures ?? 0), expiresAt }
    : { failures: 0, expiresAt: now + LOCK_MS };
}

export async function disableTwoFactor(code: string, expectedVersion?: number) {
  const db = getDatabase(), ref = db.doc("system/auth");
  return db.runTransaction(async (transaction) => {
    const data = (await transaction.get(ref)).data() as Partial<AuthState> | undefined;
    if ((expectedVersion !== undefined && Number(data?.sessionVersion ?? 1) !== expectedVersion) || !data?.totpEnabled || !data.totpSecretCipher) return false;
    const { failures, expiresAt } = accountFactorWindow(data);
    if (failures >= MAX_ATTEMPTS) return false;
    if (unusedTotpCounter(decryptSecret(data.totpSecretCipher), code, data.lastLoginTotpCounter ?? -1) === undefined) {
      transaction.set(ref, { totpManagementFailures: failures + 1, totpManagementExpiresAt: expiresAt }, { merge: true });
      return false;
    }
    transaction.set(ref, {
      totpEnabled: false,
      totpSecretCipher: null,
      totpPendingSecretCipher: null,
      totpPendingExpiresAt: null,
      totpPendingSessionVersion: null,
      totpPendingSessionId: null,
      totpPendingFailures: 0,
      totpManagementFailures: 0,
      totpManagementExpiresAt: 0,
      recoveryCodeHashes: [],
      sessionVersion: Number(data.sessionVersion ?? 1) + 1,
    }, { merge: true });
    return true;
  });
}

export async function verifyLoginTwoFactor(code: string, attemptKey: string, expectedVersion?: number) {
  const db = getDatabase(), ref = db.doc("system/auth"), limit = db.doc(`loginAttempts/totp-${attemptKey}`);
  return db.runTransaction(async (tx) => {
    const auth = (await tx.get(ref)).data() as Partial<AuthState> | undefined;
    const sessionVersion = Number(auth?.sessionVersion ?? 1);
    const required = auth?.totpEnabled === true;
    const denied = { required, ok: false, locked: false, sessionVersion };
    if (expectedVersion !== undefined && expectedVersion !== sessionVersion) return denied;
    if (!required) return { ...denied, ok: true };
    if (!auth?.totpSecretCipher) return denied;
    const attempts = (await tx.get(limit)).data();
    const active = Number(attempts?.expiresAt ?? 0) > Date.now();
    const count = active ? Number(attempts?.count ?? 0) : 0;
    const account = accountFactorWindow(auth);
    if (count >= MAX_ATTEMPTS || account.failures >= MAX_ATTEMPTS) return { ...denied, locked: true };
    const counter = unusedTotpCounter(decryptSecret(auth.totpSecretCipher), code, auth.lastLoginTotpCounter ?? -1);
    let proof: Pick<AuthState, "lastLoginTotpCounter" | "recoveryCodeHashes">;
    if (counter !== undefined) {
      proof = { lastLoginTotpCounter: counter };
    } else {
      const hashes = auth.recoveryCodeHashes ?? [];
      const hash = normalizeRecoveryCode(code).length === 12 ? recoveryCodeHash(code) : "";
      if (!hash || !hashes.some((value) => safeEqual(value, hash))) {
        tx.set(limit, { count: count + 1, expiresAt: active ? attempts!.expiresAt : Date.now() + LOCK_MS });
        tx.set(ref, { totpManagementFailures: account.failures + 1, totpManagementExpiresAt: account.expiresAt }, { merge: true });
        return denied;
      }
      proof = { recoveryCodeHashes: hashes.filter((value) => !safeEqual(value, hash)) };
    }
    tx.set(ref, { ...proof, totpManagementFailures: 0, totpManagementExpiresAt: 0 }, { merge: true });
    tx.delete(limit);
    return { ...denied, ok: true };
  });
}

async function signedSession() {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value || value.length > 240) return undefined;
  const parts = value.split(".");
  // Cookies issued before step-up support can still open the dashboard until expiry.
  if (![4, 5, 6].includes(parts.length)) return undefined;
  const signature = parts.pop()!, [role, expires, version] = parts;
  if (role !== "admin" || !Number.isSafeInteger(Number(expires)) || Number(expires) <= Math.floor(Date.now() / 1000) ||
      !safeEqual(signature, sign(parts.join(".")))) return undefined;
  return { id: hashIdentifier(value), expires: Number(expires), version: Number(version), loginTime: parts.length === 5 ? Number(parts[3]) : 0 };
}
export async function clearSession() {
  const session = await signedSession();
  if (session) {
    const db = getDatabase(), ref = db.doc("system/auth");
    await db.runTransaction(async (tx) => {
      const data = (await tx.get(ref)).data() as Partial<AuthState> | undefined;
      if (session.version !== Number(data?.sessionVersion ?? 1)) return;
      const now = Math.floor(Date.now() / 1000);
      const revoked = (data?.revokedSessions ?? []).filter((entry) => entry.expires > now && entry.id !== session.id);
      tx.set(ref, { revokedSessions: [...revoked, { id: session.id, expires: session.expires }] }, { merge: true });
    });
  }
  (await cookies()).delete(COOKIE_NAME);
}
export async function authenticatedSession() {
  const session = await signedSession();
  if (!session) return undefined;
  const auth = await state();
  return session.version === auth.sessionVersion && !auth.revokedSessions?.some((entry) => entry.id === session.id) ? session : undefined;
}
export function hasRecentLogin(loginTime: number) {
  const now = Math.floor(Date.now() / 1000);
  return Number.isSafeInteger(loginTime) && loginTime > 0 && loginTime <= now && now - loginTime < RECENT_LOGIN_SECONDS;
}
export async function authenticatedVersion() { return (await authenticatedSession())?.version; }
export async function isAuthenticated() { return (await authenticatedVersion()) !== undefined; }
export function validateNewPassword(password: string, username: string) {
  if (password.length < 12) return "short";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) return "weak";
  if (username && password.toLowerCase().includes(username.toLowerCase())) return "username";
  return null;
}
export async function changePassword(current: string, next: string, expectedVersion: number) {
  const db = getDatabase(), ref = db.doc("system/auth"), nextHash = await hashPassword(next);
  return db.runTransaction(async tx => {
    const data = (await tx.get(ref)).data() as Partial<AuthState> | undefined;
    if (Number(data?.sessionVersion ?? 1) !== expectedVersion || !(await passwordMatches(current, data?.passwordHash))) return false;
    tx.set(ref, { passwordHash: nextHash, sessionVersion: Number(data?.sessionVersion ?? 1) + 1 }, { merge: true });
    return true;
  });
}

export async function setLoginCredentials(username: string, password: string, expectedVersion?: number) {
  if (!/^[A-Za-z0-9_.@-]{3,160}$/.test(username) || validateNewPassword(password, username)) throw new Error("invalid-credentials");
  const passwordHash = await hashPassword(password), db = getDatabase(), ref = db.doc("system/auth");
  await db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as Partial<AuthState> | undefined;
    if (expectedVersion !== undefined && Number(current?.sessionVersion ?? 1) !== expectedVersion) throw new Error("stale-session");
    tx.set(ref, { loginUsername: username, passwordHash, sessionVersion: Number(current?.sessionVersion ?? 1) + 1 }, { merge: true });
  });
}
