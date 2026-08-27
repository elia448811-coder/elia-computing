import { buildPdfForToken } from "@/lib/documents";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  const result = await buildPdfForToken(token, !download);
  if (!result) return Response.json({ error: "not-found" }, { status: 404 });
  if (download && !result.complete) return Response.json({ error: "waiting-for-signatures" }, { status: 409 });
  const safeFileName = result.fileName.replace(/["\r\n]/g, "") || "signed-document.pdf";
  return new Response(Buffer.from(result.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(safeFileName)}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
