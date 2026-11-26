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
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || username.length > 160 || !password || password.length > 256)
    redirect("/login?error=invalid");
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
        await createSession(verification.sessionVersion);
      }
    }
  } catch {
    failure = "unavailable";
  }
  if (failure) redirect(`/login?error=${failure}`);
  redirect("/dashboard#quotes");
}
