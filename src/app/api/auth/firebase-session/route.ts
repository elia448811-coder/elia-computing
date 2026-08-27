import { createSession, getTwoFactorStatus, hashIdentifier, verifyLoginTwoFactor } from "@/lib/auth";
import { verifyAllowedGoogleUser } from "@/lib/firebase-auth-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { idToken?: unknown; totpCode?: unknown };
    const idToken = typeof body.idToken === "string" ? body.idToken : "";
    if (!(await verifyAllowedGoogleUser(idToken))) {
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
    await createSession();
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Firebase session verification failed", error);
    return Response.json({ error: "invalid-token" }, { status: 401 });
  }
}
