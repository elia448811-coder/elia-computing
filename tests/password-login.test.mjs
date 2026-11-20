import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import ts from "typescript";
function loginFixture({
  credentials = true,
  factor = true,
  locked = false,
} = {}) {
  const calls = [];
  const loaded = new Module(import.meta.filename);
  loaded.require = (name) => {
    if (name === "@/lib/auth")
      return {
        authenticate: async () => {
          calls.push("password");
          return { ok: credentials, locked };
        },
        verifyLoginTwoFactor: async () => {
          calls.push("factor");
          return { ok: factor, required: true, locked };
        },
        hashIdentifier: (value) => `hash:${value}`,
        recordSecurityLogin: async () => {
          calls.push("record");
        },
        createSession: async () => {
          calls.push("session");
        },
      };
    if (name === "next/headers")
      return {
        headers: async () =>
          new Headers({
            "x-forwarded-for": "192.0.2.10",
            "user-agent": "Unit test",
          }),
      };
    if (name === "next/navigation")
      return {
        redirect: (location) => {
          throw new Error(`redirect:${location}`);
        },
      };
    throw new Error(`Unexpected import ${name}`);
  };
  loaded._compile(
    ts.transpileModule(
      fs.readFileSync(
        new URL("../src/app/login/actions.ts", import.meta.url),
        "utf8",
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    import.meta.filename,
  );
  const form = new FormData();
  form.set("username", "fixture-user");
  form.set("password", "fixture-only");
  return { login: () => loaded.exports.loginAction(form), calls };
}
test("valid password without a valid required second factor never creates a session", async () => {
  const f = loginFixture({ factor: false });
  await assert.rejects(f.login(), /redirect:\/login\?error=totp/);
  assert.deepEqual(f.calls, ["password", "factor"]);
});
test("invalid credentials stop before factor verification or session creation", async () => {
  const f = loginFixture({ credentials: false });
  await assert.rejects(f.login(), /redirect:\/login\?error=invalid/);
  assert.deepEqual(f.calls, ["password"]);
});
test("both valid authentication factors create a session and record a successful login", async () => {
  const f = loginFixture();
  await assert.rejects(f.login(), /redirect:\/dashboard#quotes/);
  assert.deepEqual(f.calls, ["password", "factor", "record", "session"]);
});
