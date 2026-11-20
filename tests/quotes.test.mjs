import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { MemoryDatabase, modules } from "./support.mjs";
process.env.AUTH_SECRET = crypto.randomBytes(32).toString("hex");
const input = () => ({
  title: "Website proposal",
  clientName: "Fixture Customer",
  clientEmail: "fixture@example.test",
  clientPhone: "",
  items: [{ description: "Design", quantity: 1.5, unitPrice: 19999 }],
  discount: 10,
  taxRate: 18,
  validUntil: "2099-12-31",
  notes: "Scope",
  paymentTerms: "On delivery",
});
const setup = () => {
  const db = new MemoryDatabase();
  const { load } = modules(db);
  return {
    db,
    quotes: load("src/lib/quotes.ts"),
    math: load("src/lib/quote-types.ts"),
  };
};
test("currency rounds each line, then discount, then VAT using minor units", () => {
  const { math } = setup();
  assert.deepEqual(math.quoteTotals(input()), {
    subtotal: 29999,
    discountAmount: 3000,
    net: 26999,
    tax: 4860,
    total: 31859,
  });
  assert.equal(
    math.quoteTotals({
      items: [
        { quantity: 1, unitPrice: 10 },
        { quantity: 1, unitPrice: 20 },
      ],
      discount: 0,
      taxRate: 0,
    }).total,
    30,
  );
});
test("date comparison uses Jerusalem midnight rather than UTC midnight", () => {
  const { math } = setup();
  assert.equal(math.israelDate(new Date("2026-11-20T23:00:00Z")), "2026-11-21");
});
test("untrusted inputs cannot supply invalid prices, dates, types or status fields", () => {
  const { math } = setup();
  for (const invalid of [
    { ...input(), validUntil: "2026-02-30" },
    { ...input(), discount: NaN },
    { ...input(), taxRate: 101 },
    { ...input(), clientEmail: "invalid" },
    { ...input(), items: [] },
    { ...input(), items: [{ description: "x", quantity: -1, unitPrice: 100 }] },
    { ...input(), items: [{ description: "x", quantity: 1, unitPrice: 0.1 }] },
    {
      ...input(),
      items: [{ description: "x", quantity: 1, unitPrice: Infinity }],
    },
  ])
    assert.throws(() => math.validateQuoteInput(invalid));
  assert.equal(
    "status" in math.validateQuoteInput({ ...input(), status: "paid" }),
    false,
  );
});
test("new quotes get unique sequential numbers and remain inaccessible before sharing", async () => {
  const { quotes } = setup();
  const one = await quotes.saveQuote(input());
  const two = await quotes.saveQuote(input());
  assert.ok(one.number.endsWith("-0001"));
  assert.ok(two.number.endsWith("-0002"));
  assert.notEqual(one.id, two.id);
  assert.equal(
    await quotes.getPublicQuote(one.sharePath.split("/").at(-1)),
    undefined,
  );
});
test("tampered bearer links never reveal a shared quote", async () => {
  const { quotes } = setup();
  let quote = await quotes.saveQuote(input());
  quote = await quotes.transitionQuote(quote.id, "send", quote.revision);
  const token = quote.sharePath.split("/").at(-1);
  assert.equal(
    (await quotes.getPublicQuote(token)).clientName,
    input().clientName,
  );
  assert.equal(await quotes.getPublicQuote(token.slice(0, -1)), undefined);
  assert.equal(await quotes.getPublicQuote("invalid"), undefined);
});
test("sharing locks content and preserves exact terms through acceptance and payment", async () => {
  const { quotes } = setup();
  let quote = await quotes.saveQuote(input());
  quote = await quotes.transitionQuote(quote.id, "send", quote.revision);
  await assert.rejects(
    quotes.saveQuote(
      { ...input(), title: "Changed" },
      quote.id,
      quote.revision,
    ),
    /locked/,
  );
  quote = await quotes.respondToQuote(
    quote.sharePath.split("/").at(-1),
    "accept",
    "Fixture Customer",
    quote.revision,
  );
  assert.equal(quote.status, "accepted");
  assert.equal(quote.acceptedBy, "Fixture Customer");
  assert.equal(quote.title, input().title);
  quote = await quotes.transitionQuote(quote.id, "paid", quote.revision);
  assert.equal(quote.status, "paid");
  assert.ok(quote.paidAt);
});
test("stale edits and stale customer acceptance cannot overwrite a newer revision", async () => {
  const { quotes } = setup();
  const quote = await quotes.saveQuote(input());
  const updated = await quotes.saveQuote(
    { ...input(), title: "Revision 2" },
    quote.id,
    quote.revision,
  );
  await assert.rejects(
    quotes.saveQuote(input(), quote.id, quote.revision),
    /conflict/,
  );
  const sent = await quotes.transitionQuote(
    updated.id,
    "send",
    updated.revision,
  );
  await assert.rejects(
    quotes.respondToQuote(
      sent.sharePath.split("/").at(-1),
      "accept",
      "Fixture Customer",
      1,
    ),
    /conflict/,
  );
});
test("responses are final, and declined quotes cannot be marked as paid", async () => {
  const { quotes } = setup();
  const draft = await quotes.saveQuote(input());
  const sent = await quotes.transitionQuote(draft.id, "send", draft.revision);
  const token = sent.sharePath.split("/").at(-1);
  const declined = await quotes.respondToQuote(
    token,
    "decline",
    "Fixture Customer",
    sent.revision,
  );
  await assert.rejects(
    quotes.respondToQuote(
      token,
      "accept",
      "Fixture Customer",
      declined.revision,
    ),
    /already-answered/,
  );
  await assert.rejects(
    quotes.transitionQuote(declined.id, "paid", declined.revision),
    /invalid-transition/,
  );
});
test("expired offers cannot be shared or accepted", async () => {
  const { db, quotes } = setup();
  const draft = await quotes.saveQuote({
    ...input(),
    validUntil: "2000-01-01",
  });
  await assert.rejects(
    quotes.transitionQuote(draft.id, "send", draft.revision),
    /expired/,
  );
  const future = await quotes.saveQuote(input());
  const sent = await quotes.transitionQuote(future.id, "send", future.revision);
  db.records.get(`quotes/${sent.id}`).validUntil = "2000-01-01";
  await assert.rejects(
    quotes.respondToQuote(
      sent.sharePath.split("/").at(-1),
      "accept",
      "Fixture Customer",
      sent.revision,
    ),
    /expired/,
  );
});
test("transaction rechecks a changed state before accepting a customer response", async () => {
  const { db, quotes } = setup();
  const draft = await quotes.saveQuote(input());
  const sent = await quotes.transitionQuote(draft.id, "send", draft.revision);
  db.beforeTransaction = () => {
    db.records.get(`quotes/${sent.id}`).status = "declined";
  };
  await assert.rejects(
    quotes.respondToQuote(
      sent.sharePath.split("/").at(-1),
      "accept",
      "Fixture Customer",
      sent.revision,
    ),
    /already-answered/,
  );
});
test("new password credentials are hashed and invalidate earlier sessions", async () => {
  const db = new MemoryDatabase(),
    { auth } = modules(db);
  await auth.setLoginCredentials("fixture-user", "Good-Password-987!");
  const saved = db.records.get("system/auth");
  assert.equal(saved.loginUsername, "fixture-user");
  assert.match(saved.passwordHash, /^scrypt:/);
  assert.equal(saved.passwordHash.includes("Good-Password-987!"), false);
  assert.equal(saved.sessionVersion, 2);
  assert.equal(
    (
      await auth.authenticate(
        "fixture-user",
        "Good-Password-987!",
        "fixture-ip",
      )
    ).ok,
    true,
  );
  assert.equal(
    (await auth.authenticate("fixture-user", "", "fixture-ip")).ok,
    false,
  );
  await auth.setLoginCredentials("fixture-new", "Another-Password-654!");
  assert.equal(db.records.get("system/auth").sessionVersion, 3);
  assert.equal(
    (
      await auth.authenticate(
        "fixture-user",
        "Good-Password-987!",
        "fixture-ip",
      )
    ).ok,
    false,
  );
  assert.equal(
    (
      await auth.authenticate(
        "fixture-new",
        "Another-Password-654!",
        "fixture-ip",
      )
    ).ok,
    true,
  );
});
test("password credential setup rejects weak passwords and unsupported usernames", async () => {
  const db = new MemoryDatabase(),
    { auth } = modules(db);
  await assert.rejects(
    auth.setLoginCredentials("fixture-user", "weak"),
    /invalid-credentials/,
  );
  await assert.rejects(
    auth.setLoginCredentials("bad user", "Good-Password-987!"),
    /invalid-credentials/,
  );
  assert.equal(db.records.size, 0);
});
