import test from "node:test";
import assert from "node:assert/strict";
import { MemoryDatabase, modules } from "./support.mjs";
const route = () =>
  modules(new MemoryDatabase()).load("src/app/api/contact/route.ts");
const request = (body, headers = {}) =>
  new Request("https://example.test/api/contact", {
    method: "POST",
    headers: {
      origin: "https://example.test",
      "content-type": "application/json",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
test("contact rejects foreign origins before processing a submission", async () => {
  const response = await route().POST(
    request({}, { origin: "https://elia-computing-attacker.vercel.app" }),
  );
  assert.equal(response.status, 403);
});
test("malformed and mistyped contact payloads return validation errors rather than crashing", async () => {
  for (const body of ["null", "[]", "{", { fullName: 123 }, { _hp_cf: {} }])
    assert.equal((await route().POST(request(body))).status, 400);
});
test("invalid percent-encoded cookies are ignored without a server error", async () => {
  const response = await route().POST(
    request({}, { cookie: "elia_cf_rl=%INVALID" }),
  );
  assert.equal(response.status, 400);
});
test("oversized contact payloads are rejected before provider access", async () => {
  assert.equal(
    (await route().POST(request({ message: "x".repeat(13000) }))).status,
    413,
  );
});
test("honeypot submissions are discarded and never reported as delivered", async () => {
  const response = await route().POST(request({ _hp_cf: "bot" }));
  assert.deepEqual(await response.json(), { ok: true, delivered: false });
});

test("contact email limits are shared across application instances", async () => {
  const db = new MemoryDatabase();
  const recipient = "operator@example.test";
  const originals = Object.fromEntries(["RESEND_API_KEY", "CONTACT_FROM_EMAIL", "CONTACT_TO_EMAIL"].map(k => [k, process.env[k]]));
  Object.assign(process.env, { RESEND_API_KEY: "fixture-key", CONTACT_FROM_EMAIL: recipient, CONTACT_TO_EMAIL: recipient });
  const { serviceTypeOptions } = modules(db).load("src/data/content.ts");
  const originalFetch = globalThis.fetch;
  let sends = 0;
  globalThis.fetch = async () => { sends++; return Response.json({ id: "fixture" }); };
  try {
    const body = { fullName: "Fixture Name", email: "client@example.test", phone: "0500000000", serviceType: serviceTypeOptions[0], message: "Fixture message" };
    for (let i = 0; i < 6; i++) {
      const handler = modules(db).load("src/app/api/contact/route.ts");
      assert.equal((await handler.POST(request(body))).status, i < 5 ? 200 : 429);
    }
    assert.equal(sends, 5);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [k, v] of Object.entries(originals)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});
