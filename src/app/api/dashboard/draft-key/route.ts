import { deviceDraftKey, isAuthenticated } from "@/lib/auth";
import { sameOrigin } from "@/lib/request-origin";
import { readLimitedText } from "@/lib/request-body";
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403, headers });
  if (!(await isAuthenticated())) return new Response(null, { status: 401, headers });
  const device = await readLimitedText(request, 36);
  if (!device || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(device)) return new Response(null, { status: 400, headers });
  return Response.json({ key: deviceDraftKey(device) }, { headers });
}
