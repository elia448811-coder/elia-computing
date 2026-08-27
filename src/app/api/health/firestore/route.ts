import { getDatabase } from "@/lib/firebase-admin";

export async function GET() {
  try {
    await getDatabase().doc("system/health").get();
    return Response.json({ ok: true, service: "firestore" }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Firestore health check failed", error);
    return Response.json({ ok: false, service: "firestore" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
