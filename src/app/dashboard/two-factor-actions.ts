"use server";

import { beginTwoFactorEnrollment, cancelTwoFactorEnrollment, confirmTwoFactorEnrollment, createSession, disableTwoFactor, authenticatedVersion } from "@/lib/auth";

export async function beginTwoFactorAction() {
  const version = await authenticatedVersion();
  if (version === undefined) return { ok: false as const, error: "unauthorized" };
  try {
    return { ok: true as const, ...(await beginTwoFactorEnrollment(version)) };
  } catch (error) {
    console.error("Could not start two-factor enrollment", error);
    return { ok: false as const, error: "setup-failed" };
  }
}

export async function confirmTwoFactorAction(code: string) {
  const version = await authenticatedVersion();
  if (version === undefined) return { ok: false as const, error: "unauthorized" };
  if (!/^\d{6}$/.test(code)) return { ok: false as const, error: "invalid-code" };
  try {
    const confirmation = await confirmTwoFactorEnrollment(code, version);
    if (!confirmation.ok) return { ok: false as const, error: "invalid-code" };
    await createSession(version + 1);
    return { ok: true as const, recoveryCodes: confirmation.recoveryCodes };
  } catch (error) {
    console.error("Could not confirm two-factor enrollment", error);
    return { ok: false as const, error: "setup-failed" };
  }
}

export async function cancelTwoFactorAction() {
  const version = await authenticatedVersion();
  if (version === undefined) return { ok: false as const };
  await cancelTwoFactorEnrollment(version);
  return { ok: true as const };
}

export async function disableTwoFactorAction(code: string) {
  const version = await authenticatedVersion();
  if (version === undefined) return { ok: false as const, error: "unauthorized" };
  if (!/^\d{6}$/.test(code)) return { ok: false as const, error: "invalid-code" };
  try {
    if (!(await disableTwoFactor(code, version))) return { ok: false as const, error: "invalid-code" };
    await createSession(version + 1);
    return { ok: true as const };
  } catch (error) {
    console.error("Could not disable two-factor authentication", error);
    return { ok: false as const, error: "disable-failed" };
  }
}
