import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { getDatabase } from "@/lib/firebase-admin";
import {
  isQuoteExpired,
  israelDate,
  validateQuoteInput,
  type ManagedQuote,
  type Quote,
} from "@/lib/quote-types";

function token(id: string) {
  if (!process.env.AUTH_SECRET)
    throw new Error("AUTH_SECRET must be configured");
  return createHmac("sha256", process.env.AUTH_SECRET)
    .update(`quote-share-v1:${id}`)
    .digest("base64url");
}
function managed(quote: Quote): ManagedQuote {
  return { ...quote, sharePath: `/quote/${quote.id}.${token(quote.id)}` };
}
function validId(id: string) {
  return /^[a-f0-9-]{36}$/.test(id);
}
export async function listQuotes(): Promise<ManagedQuote[]> {
  const snapshot = await getDatabase()
    .collection("quotes")
    .orderBy("createdAt", "desc")
    .limit(500)
    .get();
  return snapshot.docs.map((item) => managed(item.data() as Quote));
}
export async function saveQuote(
  raw: unknown,
  id?: string,
  revision?: number,
  creationId?: string,
): Promise<ManagedQuote> {
  const input = validateQuoteInput(raw),
    db = getDatabase(),
    now = new Date().toISOString();
  if (id && !validId(id)) throw new Error("not-found");
  if (creationId !== undefined && (!validId(creationId) || id)) throw new Error("invalid-input");
  const quoteId = id || creationId || randomUUID(),
    ref = db.doc(`quotes/${quoteId}`);
  const quote = await db.runTransaction(async (tx) => {
    if (id) {
      const existing = (await tx.get(ref)).data() as Quote | undefined;
      if (!existing) throw new Error("not-found");
      if (existing.status !== "draft") throw new Error("locked");
      if (existing.revision !== revision) throw new Error("conflict");
      const updated: Quote = {
        ...existing,
        ...input,
        updatedAt: now,
        revision: existing.revision + 1,
      };
      tx.set(ref, updated);
      return updated;
    }
    if (creationId) {
      const existing = (await tx.get(ref)).data() as Quote | undefined;
      if (existing) {
        if (existing.status !== "draft" || existing.revision !== 1 ||
            JSON.stringify(validateQuoteInput(existing)) !== JSON.stringify(input)) throw new Error("conflict");
        return existing;
      }
    }
    const counterRef = db.doc("system/quoteCounter");
    const sequence =
      Number((await tx.get(counterRef)).data()?.sequence ?? 0) + 1;
    const created: Quote = {
      ...input,
      id: quoteId,
      number: `Q-${israelDate().slice(0, 4)}-${String(sequence).padStart(4, "0")}`,
      status: "draft",
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
    tx.set(counterRef, { sequence });
    tx.set(ref, created);
    return created;
  });
  return managed(quote);
}
export async function transitionQuote(
  id: string,
  action: string,
  revision: number,
) {
  if (!validId(id)) throw new Error("not-found");
  const ref = getDatabase().doc(`quotes/${id}`);
  const quote = await getDatabase().runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as Quote | undefined;
    if (!current) throw new Error("not-found");
    if (current.revision !== revision) throw new Error("conflict");
    const now = new Date().toISOString();
    let updated: Quote;
    if (action === "send" && current.status === "draft") {
      if (current.validUntil < israelDate()) throw new Error("expired");
      updated = {
        ...current,
        status: "sent",
        sentAt: now,
        updatedAt: now,
        revision: current.revision + 1,
      };
    } else if (action === "paid" && current.status === "accepted") {
      updated = {
        ...current,
        status: "paid",
        paidAt: now,
        updatedAt: now,
        revision: current.revision + 1,
      };
    } else throw new Error("invalid-transition");
    tx.set(ref, updated);
    return updated;
  });
  return managed(quote);
}
function idForToken(value: string) {
  const parts = value.split(".");
  if (parts.length !== 2 || !validId(parts[0])) return undefined;
  const expected = Buffer.from(token(parts[0])),
    supplied = Buffer.from(parts[1]);
  return expected.length === supplied.length &&
    timingSafeEqual(expected, supplied)
    ? parts[0]
    : undefined;
}
export async function getPublicQuote(
  value: string,
): Promise<Quote | undefined> {
  const id = idForToken(value);
  if (!id) return undefined;
  const quote = (await getDatabase().doc(`quotes/${id}`).get()).data() as
    | Quote
    | undefined;
  return quote && quote.status !== "draft" ? quote : undefined;
}
export async function respondToQuote(
  value: string,
  action: string,
  name: string,
  revision: number,
) {
  const id = idForToken(value);
  if (!id) throw new Error("not-found");
  if (
    !name.trim() ||
    name.length > 160 ||
    !["accept", "decline"].includes(action)
  )
    throw new Error("invalid-input");
  const ref = getDatabase().doc(`quotes/${id}`);
  return getDatabase().runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as Quote | undefined;
    if (!current || current.status === "draft") throw new Error("not-found");
    if (current.status !== "sent") throw new Error("already-answered");
    if (isQuoteExpired(current)) throw new Error("expired");
    if (current.revision !== revision) throw new Error("conflict");
    const now = new Date().toISOString();
    const updated: Quote = {
      ...current,
      status: action === "accept" ? "accepted" : "declined",
      acceptedBy: name.trim(),
      respondedAt: now,
      updatedAt: now,
      revision: current.revision + 1,
    };
    tx.set(ref, updated);
    return updated;
  });
}
