import { isAuthenticated } from "@/lib/auth";
import { sameOrigin } from "@/lib/request-origin";
import { getPdfDraft, readPdfDraft, savePdfDraft } from "@/lib/pdf-drafts";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!(await isAuthenticated())) return new Response(null, { status: 401 });
  if (new URL(request.url).searchParams.has("file")) {
    let bytes;
    try { bytes = await readPdfDraft(new URL(request.url).searchParams.get("revision") ?? undefined); }
    catch { return new Response(null, { status: 409 }); }
    return bytes ? new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Cache-Control": "no-store" } }) : new Response(null, { status: 404 });
  }
  return Response.json(await getPdfDraft(), { headers: { "Cache-Control": "no-store" } });
}
export async function PUT(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  if (!(await isAuthenticated())) return new Response(null, { status: 401 });
  if (Number(request.headers.get("content-length") ?? 0) > 4400000) return new Response(null, { status: 413 });
  try {
    const form = await request.formData();
    const raw = String(form.get("data") ?? "");
    if (Buffer.byteLength(raw) > 30000) return new Response(null, { status: 413 });
    const file = form.get("file");
    return Response.json(await savePdfDraft(JSON.parse(raw), file instanceof File ? file : null, String(form.get("revision") ?? "") || null));
  } catch (error) { return Response.json({ error: "save" }, { status: error instanceof Error && error.message === "draft-conflict" ? 409 : 400 }); }
}
