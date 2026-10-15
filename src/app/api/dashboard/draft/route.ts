import { isAuthenticated } from "@/lib/auth";
import { sameOrigin } from "@/lib/request-origin";
import { clearWorkspaceDraft, getWorkspaceDraft, saveWorkspaceDraft } from "@/lib/workspace-drafts";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await getWorkspaceDraft(), { headers: { "Cache-Control": "no-store" } });
}
export async function PUT(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "origin" }, { status: 403 });
  if (!(await isAuthenticated())) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (Number(request.headers.get("content-length") ?? 0) > 800000) return Response.json({ error: "size" }, { status: 413 });
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 800000) return Response.json({ error: "size" }, { status: 413 });
    const input = JSON.parse(raw);
    return Response.json(await saveWorkspaceDraft(input.data, input.revision ?? null));
  } catch (error) {
    return Response.json({ error: "save" }, { status: error instanceof Error && error.message === "draft-conflict" ? 409 : 400 });
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  if (!(await isAuthenticated())) return new Response(null, { status: 401 });
  try { await clearWorkspaceDraft(request.headers.get("if-match")); }
  catch { return new Response(null, { status: 409 }); }
  return new Response(null, { status: 204 });
}
