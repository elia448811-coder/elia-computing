import { isAuthenticated } from "@/lib/auth";
import { sameOrigin } from "@/lib/request-origin";
import { recordDocumentView } from "@/lib/document-tracking";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  // Owner previews must not appear as recipient activity.
  if (await isAuthenticated()) return new Response(null, { status: 204 });
  try { await recordDocumentView((await params).token); }
  catch { return new Response(null, { status: 503 }); }
  return new Response(null, { status: 204 });
}
