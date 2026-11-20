import { isAuthenticated } from "@/lib/auth";
import { listQuotes, saveQuote, transitionQuote } from "@/lib/quotes";
import { sameOrigin } from "@/lib/request-origin";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  if (!(await isAuthenticated()))
    return Response.json({ error: "unauthorized" }, { status: 401, headers });
  return Response.json({ quotes: await listQuotes() }, { headers });
}
async function mutate(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "forbidden" }, { status: 403, headers });
  if (!(await isAuthenticated()))
    return Response.json({ error: "unauthorized" }, { status: 401, headers });
  try {
    const raw = await request.text();
    if (raw.length > 65000)
      return Response.json({ error: "too-large" }, { status: 413, headers });
    const body = JSON.parse(raw) as Record<string, unknown>;
    if (!body || typeof body !== "object") throw new Error("invalid-input");
    const id = typeof body.id === "string" ? body.id : undefined;
    const revision =
      typeof body.revision === "number" ? body.revision : undefined;
    if (request.method === "PATCH" && (!id || revision === undefined))
      throw new Error("invalid-input");
    if (body.creationId !== undefined && typeof body.creationId !== "string") throw new Error("invalid-input");
    const quote =
      request.method === "PATCH"
        ? await transitionQuote(id!, String(body.action), revision!)
        : await saveQuote(body.input, id, revision, body.creationId);
    return Response.json({ quote }, { headers });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "invalid-input";
    const known = [
      "not-found",
      "locked",
      "conflict",
      "expired",
      "invalid-transition",
      "invalid-input",
      "invalid-email",
      "invalid-date",
      "invalid-items",
      "invalid-rate",
      "total-too-large",
    ].includes(reason);
    return Response.json(
      { error: known ? reason : "unavailable" },
      {
        status: ["locked", "conflict", "invalid-transition"].includes(reason)
          ? 409
          : reason === "not-found"
            ? 404
            : known
              ? 400
              : 503,
        headers,
      },
    );
  }
}
export const POST = mutate;
export const PATCH = mutate;
