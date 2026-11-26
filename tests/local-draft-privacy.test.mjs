import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { MemoryDatabase, modules } from './support.mjs';

function storageFixture() {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
}
test('existing drafts migrate without loss, remain readable after sign-in, and require the key on a fresh page', async (t) => {
  const { load } = modules(new MemoryDatabase());
  const { createDraftCipher } = load('src/lib/local-draft-cipher.ts');
  const { rememberSubmission, textStamp, clearSubmittedText } = load('src/lib/draft-submission.ts');
  const { encodePdfDraft, decodePdfDraft } = load('src/lib/pdf-local-draft.ts');
  const key = randomBytes(32).toString('base64');
  let allowed = true;
  t.mock.method(globalThis, 'fetch', async () => allowed ? Response.json({ key }) : new Response(null, { status: 401 }));
  const original = ['localStorage', 'sessionStorage'].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]);
  for (const [k] of original) Object.defineProperty(globalThis, k, { configurable: true, value: storageFixture() });
  t.after(() => { for (const [k, d] of original) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } });
  const cipher = createDraftCipher(), slot = 'elia-document-draft:fixture';
  const raw = JSON.stringify({ content: 'Private fixture text' });
  localStorage.setItem(slot, raw);
  assert.equal(await cipher.readText(slot), raw);
  const migrated = localStorage.getItem(slot);
  assert.ok(!migrated.includes('Private fixture'));
  assert.ok(!migrated.includes(key));
  const first = rememberSubmission(slot, textStamp(slot));
  clearSubmittedText(slot, 'arbitrary-url-parameter');
  assert.equal(localStorage.getItem(slot), migrated);
  await cipher.writeText(slot, JSON.stringify({ content: 'New draft' }));
  clearSubmittedText(slot, first);
  assert.ok(localStorage.getItem(slot));
  const file = new File([new Uint8Array([37, 80, 68, 70, 0, 255])], 'מסמך.pdf', { type: 'application/pdf', lastModified: 1234 });
  const draft = { file, revision: 'r1', data: { title: 'Fixture document' } };
  const pdf = await encodePdfDraft(draft, cipher);
  assert.equal(pdf.file, undefined);
  assert.equal(pdf.data, undefined);
  await assert.rejects(cipher.open('different-slot', pdf));
  const restored = await decodePdfDraft(pdf, cipher);
  assert.equal(restored.file.name, file.name);
  assert.equal(restored.file.lastModified, file.lastModified);
  assert.deepEqual(new Uint8Array(await restored.file.arrayBuffer()), new Uint8Array(await file.arrayBuffer()));
  assert.deepEqual(restored.data, draft.data);
  allowed = false;
  cipher.forget();
  await assert.rejects(cipher.readText(slot), /draft-key-unavailable/);
  await assert.rejects(decodePdfDraft(pdf, createDraftCipher()), /draft-key-unavailable/);
  allowed = true;
  assert.equal(await createDraftCipher().readText(slot), JSON.stringify({ content: 'New draft' }));
  const current = rememberSubmission(slot, textStamp(slot));
  clearSubmittedText(slot, current);
  assert.equal(localStorage.getItem(slot), null);
});

test('the browser draft key is released only to an authenticated same-origin dashboard', async () => {
  const { auth, load } = modules(new MemoryDatabase());
  const { POST } = load('src/app/api/dashboard/draft-key/route.ts');
  const device = '8ef59837-02d6-47c4-882f-53a5f39e5778';
  const request = (id, origin = 'https://example.test') => new Request('https://example.test/api/dashboard/draft-key', { method: 'POST', headers: { origin }, body: id });
  assert.equal((await POST(request(device))).status, 401);
  await auth.createSession(1);
  assert.equal((await POST(request(device, 'https://example.org'))).status, 403);
  assert.equal((await POST(request('unrecognized'))).status, 400);
  const valid = await POST(request(device));
  assert.equal(valid.headers.get('cache-control'), 'private, no-store');
  assert.equal((await valid.json()).key, auth.deviceDraftKey(device));
  assert.notEqual(auth.deviceDraftKey(device), auth.deviceDraftKey('5a97e077-962f-44ca-bf5e-1403e6d27864'));
});
