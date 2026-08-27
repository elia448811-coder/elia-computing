"use server";

import { beginTwoFactorEnrollment, cancelTwoFactorEnrollment, confirmTwoFactorEnrollment, createSession, disableTwoFactor, isAuthenticated } from "@/lib/auth";

export async function beginTwoFactorAction() {
  if (!(await isAuthenticated())) return { ok: false as const, error: "unauthorized" };
  try {
    return { ok: true as const, ...(await beginTwoFactorEnrollment()) };
  } catch (error) {
    console.error("Could not start two-factor enrollment", error);
    return { ok: false as const, error: "setup-failed" };
  }
}

export async function confirmTwoFactorAction(code: string) {
  if (!(await isAuthenticated())) return { ok: false as const, error: "unauthorized" };
  if (!/^\d{6}$/.test(code)) return { ok: false as const, error: "invalid-code" };
  try {
    if (!(await confirmTwoFactorEnrollment(code))) return { ok: false as const, error: "invalid-code" };
    await createSession();
    return { ok: true as const };
  } catch (error) {
    console.error("Could not confirm two-factor enrollment", error);
    return { ok: false as const, error: "setup-failed" };
  }
}

export async function cancelTwoFactorAction() {
  if (!(await isAuthenticated())) return { ok: false as const };
  await cancelTwoFactorEnrollment();
  return { ok: true as const };
}

export async function disableTwoFactorAction(code: string) {
  if (!(await isAuthenticated())) return { ok: false as const, error: "unauthorized" };
  if (!/^\d{6}$/.test(code)) return { ok: false as const, error: "invalid-code" };
  try {
    if (!(await disableTwoFactor(code))) return { ok: false as const, error: "invalid-code" };
    await createSession();
    return { ok: true as const };
  } catch (error) {
    console.error("Could not disable two-factor authentication", error);
    return { ok: false as const, error: "disable-failed" };
  }
}
