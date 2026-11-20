import { respondToQuote } from "@/lib/quotes";
import { sameOrigin } from "@/lib/request-origin";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const headers = { "Cache-Control": "no-store" };
  if (!sameOrigin(request))
    return Response.json({ error: "forbidden" }, { status: 403, headers });
  try {
    const raw = await request.text();
    if (raw.length > 2000)
      return Response.json(
        { error: "invalid-input" },
        { status: 400, headers },
      );
    const input = JSON.parse(raw) as Record<string, unknown>;
    if (
      !input ||
      typeof input.name !== "string" ||
      typeof input.revision !== "number" ||
      typeof input.action !== "string" ||
      input.confirmed !== true
    )
      throw new Error("invalid-input");
    const quote = await respondToQuote(
      (await params).token,
      input.action,
      input.name,
      input.revision,
    );
    return Response.json({ quote }, { headers });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unavailable";
    const known = [
      "not-found",
      "already-answered",
      "expired",
      "conflict",
      "invalid-input",
    ].includes(reason);
    return Response.json(
      { error: known ? reason : "unavailable" },
      { status: reason === "not-found" ? 404 : known ? 409 : 503, headers },
    );
  }
}
