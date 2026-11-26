import { createSession, getTwoFactorStatus, hashIdentifier, recordSecurityLogin, redeemGoogleLogin, verifyLoginTwoFactor } from "@/lib/auth";
import { readLimitedText } from "@/lib/request-body";
import { sameOrigin } from "@/lib/request-origin";
import { verifyAllowedGoogleUser } from "@/lib/firebase-auth-admin";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  try {
    const raw = await readLimitedText(request, 16000);
    if (raw === null) return Response.json({ error: "too-large" }, { status: 413 });
    const body = JSON.parse(raw) as { idToken?: unknown; totpCode?: unknown };
    const idToken = typeof body.idToken === "string" ? body.idToken : "";
    const authTime = await verifyAllowedGoogleUser(idToken);
    if (!authTime) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    const twoFactor = await getTwoFactorStatus();
    const totpCode = typeof body.totpCode === "string" ? body.totpCode.trim() : "";
    if (twoFactor.enabled && !totpCode) {
      return Response.json({ mfaRequired: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
    }
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const verification = await verifyLoginTwoFactor(totpCode, hashIdentifier(forwardedFor));
    if (!verification.ok) {
      return Response.json({ error: verification.locked ? "totp-locked" : "invalid-totp" }, { status: verification.locked ? 429 : 401, headers: { "Cache-Control": "no-store" } });
    }
    if (!(await redeemGoogleLogin(authTime, verification.sessionVersion))) return Response.json({ error: "reauthenticate" }, { status: 401 });
    await recordSecurityLogin(request.headers.get("user-agent") ?? "", forwardedFor);
    await createSession(verification.sessionVersion, authTime);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Firebase session verification failed");
    return Response.json({ error: "invalid-token" }, { status: 401 });
  }
}
