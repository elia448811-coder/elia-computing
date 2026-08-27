import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import QRCode from "qrcode";
import { getDatabase } from "@/lib/firebase-admin";

const COOKIE_NAME = "elia_admin_session";
const SESSION_TTL = 14400;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 900000;
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const scrypt = promisify(scryptCallback);
type AuthState = {
  passwordHash?: string;
  sessionVersion: number;
  totpEnabled?: boolean;
  totpSecretCipher?: string | null;
  totpPendingSecretCipher?: string | null;
  totpPendingExpiresAt?: number | null;
  recoveryCodeHashes?: string[];
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
    sessionVersion: Number(data?.sessionVersion ?? 1),
    totpEnabled: data?.totpEnabled === true,
    totpSecretCipher: data?.totpSecretCipher,
    totpPendingSecretCipher: data?.totpPendingSecretCipher,
    totpPendingExpiresAt: data?.totpPendingExpiresAt,
    recoveryCodeHashes: Array.isArray(data?.recoveryCodeHashes) ? data.recoveryCodeHashes : [],
  };
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
function validTotp(secretKey: string, code: string) {
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS);
  return [-1, 0, 1].some((offset) => safeEqual(totpAt(secretKey, counter + offset), code));
}
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}
async function passwordMatches(password: string, encoded?: string) {
  if (!encoded) return safeEqual(password, process.env.ADMIN_PASSWORD ?? "");
  const [algorithm, salt, expected] = encoded.split(":");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = (await scrypt(password, salt, 64) as Buffer).toString("hex");
  return safeEqual(actual, expected);
}
async function attemptCount(key: string) {
  const data = (await getDatabase().doc(`loginAttempts/${key}`).get()).data() as { count?: number; expiresAt?: number } | undefined;
  return Number(data?.expiresAt ?? 0) > Date.now() ? Number(data?.count ?? 0) : 0;
}
async function fail(key: string) {
  const db = getDatabase(), ref = db.doc(`loginAttempts/${key}`);
  await db.runTransaction(async tx => {
    const data = (await tx.get(ref)).data() as { count?: number; expiresAt?: number } | undefined;
    const count = Number(data?.expiresAt ?? 0) > Date.now() ? Number(data?.count ?? 0) : 0;
    tx.set(ref, { count: count + 1, expiresAt: Date.now() + LOCK_MS });
  });
}
export async function authenticate(username: string, password: string, key: string) {
  if (await attemptCount(key) >= MAX_ATTEMPTS) return { ok: false, locked: true };
  const expected = process.env.ADMIN_USERNAME ?? "";
  const valid = Boolean(expected && safeEqual(username, expected) && await passwordMatches(password, (await state()).passwordHash));
  if (!valid) { await fail(key); return { ok: false, locked: false }; }
  await getDatabase().doc(`loginAttempts/${key}`).delete();
  return { ok: true, locked: false };
}
export async function createSession() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const payload = `admin.${expires}.${(await state()).sessionVersion}`;
  (await cookies()).set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: SESSION_TTL, priority: "high",
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

export async function beginTwoFactorEnrollment() {
  const secretKey = toBase32(randomBytes(20));
  const expiresAt = Date.now() + (10 * 60 * 1000);
  await getDatabase().doc("system/auth").set({
    totpPendingSecretCipher: encryptSecret(secretKey),
    totpPendingExpiresAt: expiresAt,
  }, { merge: true });
  const issuer = "Elia Computing";
  const account = "elia448811@gmail.com";
  const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secretKey}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
  return {
    secretKey,
    qrDataUrl: await QRCode.toDataURL(uri, { width: 260, margin: 1, errorCorrectionLevel: "M" }),
  };
}

export async function confirmTwoFactorEnrollment(code: string) {
  const auth = await state();
  if (!auth.totpPendingSecretCipher || Number(auth.totpPendingExpiresAt ?? 0) < Date.now()) return { ok: false as const, recoveryCodes: [] };
  const secretKey = decryptSecret(auth.totpPendingSecretCipher);
  if (!validTotp(secretKey, code)) return { ok: false as const, recoveryCodes: [] };
  const recoveryCodes = createRecoveryCodes();
  await getDatabase().doc("system/auth").set({
    totpEnabled: true,
    totpSecretCipher: encryptSecret(secretKey),
    totpPendingSecretCipher: null,
    totpPendingExpiresAt: null,
    recoveryCodeHashes: recoveryCodes.map(recoveryCodeHash),
    sessionVersion: auth.sessionVersion + 1,
  }, { merge: true });
  return { ok: true as const, recoveryCodes };
}

export async function cancelTwoFactorEnrollment() {
  await getDatabase().doc("system/auth").set({ totpPendingSecretCipher: null, totpPendingExpiresAt: null }, { merge: true });
}

export async function disableTwoFactor(code: string) {
  const db = getDatabase(), ref = db.doc("system/auth");
  return db.runTransaction(async (transaction) => {
    const data = (await transaction.get(ref)).data() as Partial<AuthState> | undefined;
    if (!data?.totpEnabled || !data.totpSecretCipher || !validTotp(decryptSecret(data.totpSecretCipher), code)) return false;
    transaction.set(ref, {
      totpEnabled: false,
      totpSecretCipher: null,
      totpPendingSecretCipher: null,
      totpPendingExpiresAt: null,
      recoveryCodeHashes: [],
      sessionVersion: Number(data.sessionVersion ?? 1) + 1,
    }, { merge: true });
    return true;
  });
}

export async function verifyLoginTwoFactor(code: string, attemptKey: string) {
  const auth = await state();
  if (!auth.totpEnabled || !auth.totpSecretCipher) return { required: false, ok: true, locked: false };
  if (await attemptCount(`totp-${attemptKey}`) >= MAX_ATTEMPTS) return { required: true, ok: false, locked: true };
  let ok = validTotp(decryptSecret(auth.totpSecretCipher), code);
  if (!ok && normalizeRecoveryCode(code).length === 12) {
    const codeHash = recoveryCodeHash(code), ref = getDatabase().doc("system/auth");
    ok = await getDatabase().runTransaction(async (transaction) => {
      const current = (await transaction.get(ref)).data() as Partial<AuthState> | undefined;
      const codes = Array.isArray(current?.recoveryCodeHashes) ? current.recoveryCodeHashes : [];
      if (!codes.some((value) => safeEqual(value, codeHash))) return false;
      transaction.set(ref, { recoveryCodeHashes: codes.filter((value) => !safeEqual(value, codeHash)) }, { merge: true });
      return true;
    });
  }
  if (!ok) {
    await fail(`totp-${attemptKey}`);
    return { required: true, ok: false, locked: false };
  }
  await getDatabase().doc(`loginAttempts/totp-${attemptKey}`).delete();
  return { required: true, ok: true, locked: false };
}
export async function clearSession() { (await cookies()).delete(COOKIE_NAME); }
export async function isAuthenticated() {
  const parts = (await cookies()).get(COOKIE_NAME)?.value.split(".") ?? [];
  if (parts.length !== 4) return false;
  const [role, expires, version, signature] = parts, payload = `${role}.${expires}.${version}`;
  const auth = await state();
  return role === "admin" && Number(expires) > Math.floor(Date.now() / 1000) &&
    Number(version) === auth.sessionVersion && safeEqual(signature, sign(payload));
}
export function validateNewPassword(password: string, username: string) {
  if (password.length < 12) return "short";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) return "weak";
  if (username && password.toLowerCase().includes(username.toLowerCase())) return "username";
  return null;
}
export async function changePassword(current: string, next: string) {
  const db = getDatabase(), ref = db.doc("system/auth"), nextHash = await hashPassword(next);
  return db.runTransaction(async tx => {
    const data = (await tx.get(ref)).data() as Partial<AuthState> | undefined;
    if (!(await passwordMatches(current, data?.passwordHash))) return false;
    tx.set(ref, { passwordHash: nextHash, sessionVersion: Number(data?.sessionVersion ?? 1) + 1 }, { merge: true });
    return true;
  });
}
