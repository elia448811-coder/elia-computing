"use server";

import { beginTwoFactorEnrollment, cancelTwoFactorEnrollment, confirmTwoFactorEnrollment, createSession, disableTwoFactor, authenticatedSession, hasRecentLogin } from "@/lib/auth";

export async function beginTwoFactorAction() {
  const session = await authenticatedSession();
  if (!session) return { ok: false as const, error: "unauthorized" };
  try {
    if (!hasRecentLogin(session.loginTime)) return { ok: false as const, error: "reauthenticate" };
    return { ok: true as const, ...(await beginTwoFactorEnrollment(session.id, session.version)) };
  } catch (error) {
    console.error("Could not start two-factor enrollment", error);
    return { ok: false as const, error: "setup-failed" };
  }
}

export async function confirmTwoFactorAction(code: string) {
  const session = await authenticatedSession();
  if (!session) return { ok: false as const, error: "unauthorized" };
  if (!/^\d{6}$/.test(code)) return { ok: false as const, error: "invalid-code" };
  try {
    const confirmation = await confirmTwoFactorEnrollment(code, session.id, session.version);
    if (!confirmation.ok) return { ok: false as const, error: "invalid-code" };
    await createSession(session.version + 1);
    return { ok: true as const, recoveryCodes: confirmation.recoveryCodes };
  } catch (error) {
    console.error("Could not confirm two-factor enrollment", error);
    return { ok: false as const, error: "setup-failed" };
  }
}

export async function cancelTwoFactorAction() {
  const session = await authenticatedSession();
  if (!session) return { ok: false as const };
  await cancelTwoFactorEnrollment(session.id, session.version);
  return { ok: true as const };
}

export async function disableTwoFactorAction(code: string) {
  const session = await authenticatedSession();
  if (!session) return { ok: false as const, error: "unauthorized" };
  if (!/^\d{6}$/.test(code)) return { ok: false as const, error: "invalid-code" };
  try {
    if (!(await disableTwoFactor(code, session.version))) return { ok: false as const, error: "invalid-code" };
    await createSession(session.version + 1);
    return { ok: true as const };
  } catch (error) {
    console.error("Could not disable two-factor authentication", error);
    return { ok: false as const, error: "disable-failed" };
  }
}
