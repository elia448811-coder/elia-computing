import { createSession } from "@/lib/auth";
import { verifyAllowedGoogleUser } from "@/lib/firebase-auth-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { idToken?: unknown };
    const idToken = typeof body.idToken === "string" ? body.idToken : "";
    if (!(await verifyAllowedGoogleUser(idToken))) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    await createSession();
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Firebase session verification failed", error);
    return Response.json({ error: "invalid-token" }, { status: 401 });
  }
}
