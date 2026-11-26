"use server";
import {
  authenticate,
  createSession,
  hashIdentifier,
  recordSecurityLogin,
  verifyLoginTwoFactor,
} from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
export async function loginAction(formData: FormData) {
  const reauthenticate = formData.get("reauth") === "1";
  const loginUrl = reauthenticate ? "/login?reauth=1&error=" : "/login?error=";
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || username.length > 160 || !password || password.length > 256)
    redirect(`${loginUrl}invalid`);
  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    "local";
  const key = hashIdentifier(ip);
  let failure = "";
  try {
    const result = await authenticate(username, password, key);
    if (!result.ok) failure = result.locked ? "locked" : "invalid";
    else {
      const verification = await verifyLoginTwoFactor(
        String(formData.get("totpCode") ?? "")
          .trim()
          .toUpperCase(),
        key,
        result.sessionVersion,
      );
      if (!verification.ok) failure = verification.locked ? "locked" : "totp";
      else {
        await recordSecurityLogin(requestHeaders.get("user-agent") ?? "", ip);
        await createSession(verification.sessionVersion, Math.floor(Date.now() / 1000));
      }
    }
  } catch {
    failure = "unavailable";
  }
  if (failure) redirect(`${loginUrl}${failure}`);
  redirect(reauthenticate ? "/dashboard#security" : "/dashboard#quotes");
}
