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
