import "server-only";
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/firebase-admin";

const COOKIE_NAME = "elia_admin_session";
const SESSION_TTL = 14400;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 900000;
const scrypt = promisify(scryptCallback);
type AuthState = { passwordHash?: string; sessionVersion: number };

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
async function state(): Promise<AuthState> {
  const data = (await getDatabase().doc("system/auth").get()).data() as Partial<AuthState> | undefined;
  return { passwordHash: data?.passwordHash, sessionVersion: Number(data?.sessionVersion ?? 1) };
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
    tx.set(ref, { passwordHash: nextHash, sessionVersion: Number(data?.sessionVersion ?? 1) + 1 });
    return true;
  });
}
