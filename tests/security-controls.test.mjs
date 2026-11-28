import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';


import { MemoryDatabase, modules } from './support.mjs';

process.env.AUTH_SECRET = crypto.randomBytes(32).toString('hex');
const signer = (id) => ({ id, label: id, name: `Fixture ${id}`, identityNumber: '000000000', email: '', phone: '', token: '' });
async function png() {
  const bytes = await sharp({ create: { width: 64, height: 24, channels: 4, background: { r: 20, g: 30, b: 40, alpha: 1 } } }).png().toBuffer();
  return `data:image/png;base64,${bytes.toString('base64')}`;
}
function authenticatorCode(secret, offset = 0) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = [...secret].map((ch) => alphabet.indexOf(ch).toString(2).padStart(5, '0')).join('');
  const bytes = Buffer.from(bits.match(/.{8}/g).map((byte) => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offset));
  const digest = crypto.createHmac('sha1', bytes).update(counter).digest();
  return String((digest.readUInt32BE(digest[19] & 15) & 0x7fffffff) % 1000000).padStart(6, '0');
}

test('valid browser PNG is fully decoded and remains embeddable in a PDF', async () => {
  const { images } = modules(new MemoryDatabase());
  const normalized = await images.normalizeSignatureImage(await png());
  assert.ok(normalized);
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(normalized);
  assert.equal(image.width, 64);
  assert.equal(image.height, 24);
});

test('image validator rejects empty, unsupported and non-image fixtures', async () => {
  const { images } = modules(new MemoryDatabase());
  for (const value of ['', 'data:image/jpeg;base64,AA==', 'data:image/png;base64,' + Buffer.from('plain text fixture').toString('base64')]) {
    assert.equal(await images.normalizeSignatureImage(value), undefined);
  }
});

test('multiple assigned signers retain their identity and reviewed revision', async () => {
  const db = new MemoryDatabase(), { documents } = modules(db);
  const document = await documents.createDocument({ title: 'Fixture agreement', content: '<p>Reviewed terms</p>', signers: [signer('one'), signer('two')] });
  const revision = documents.documentRevision(document);
  assert.equal(await documents.signDocument(document.signers[0].token, 'Self-declared fixture', await png(), revision), true);
  const current = await documents.getDocumentById(document.id);
  assert.equal(current.signers[0].name, 'Fixture one');
  assert.equal(current.signers[0].signedContentHash, revision);
  assert.equal(documents.documentRevision(current), revision);
  assert.equal(await documents.signDocument(document.signers[1].token, 'Fixture two', await png(), revision), true);
  assert.ok((await documents.getDocumentById(document.id)).signedAt);
});

test('an edited document requires renewed review before a signature is accepted', async () => {
  const db = new MemoryDatabase(), { documents } = modules(db);
  const document = await documents.createDocument({ title: 'Fixture', content: '<p>Version one</p>', signers: [signer('one')] });
  const priorRevision = documents.documentRevision(document);
  await documents.updateHtmlDocument(document.id, { title: 'Fixture', content: '<p>Version two</p>' });
  assert.equal(await documents.signDocument(document.signers[0].token, 'Fixture one', await png(), priorRevision), false);
  const refreshed = await documents.getDocumentById(document.id);
  assert.equal(await documents.signDocument(document.signers[0].token, 'Fixture one', await png(), documents.documentRevision(refreshed)), true);
});

test('edit transaction observes a completed signature and preserves the content', async () => {
  const db = new MemoryDatabase(), { documents } = modules(db);
  const document = await documents.createDocument({ title: 'Fixture', content: '<p>Final terms</p>', signers: [signer('one')] });
  db.beforeTransaction = () => { db.records.get(`signatureDocuments/${document.id}`).signers[0].signedAt = new Date().toISOString(); };
  await assert.rejects(documents.updateHtmlDocument(document.id, { title: 'Fixture', content: '<p>Later draft</p>' }), /document-locked/);
  assert.equal((await documents.getDocumentById(document.id)).content, '<p>Final terms</p>');
});

test('legacy single-recipient documents still accept a reviewed signature', async () => {
  const { documents } = modules(new MemoryDatabase());
  const document = await documents.createDocument({ title: 'Legacy fixture', content: '<p>Terms</p>', recipientName: 'Fixture' });
  assert.equal(await documents.signDocument(document.token, 'Fixture', await png(), documents.documentRevision(document)), true);
  assert.ok((await documents.getDocumentByToken(document.token)).signedAt);
});

test('new authenticator enrollment works and enabled factors cannot be replaced', async () => {
  const db = new MemoryDatabase(), { auth } = modules(db);
  const enrollment = await auth.beginTwoFactorEnrollment('fixture-session', 1);
  const confirmed = await auth.confirmTwoFactorEnrollment(authenticatorCode(enrollment.secretKey), 'fixture-session', 1);
  assert.equal(confirmed.ok, true);
  assert.equal(confirmed.recoveryCodes.length, 8);
  const before = structuredClone(db.records.get('system/auth'));
  await assert.rejects(auth.beginTwoFactorEnrollment('fixture-session', 2), /two-factor-already-enabled/);
  assert.equal((await auth.confirmTwoFactorEnrollment(authenticatorCode(enrollment.secretKey), 'fixture-session', 1)).ok, false);
  assert.deepEqual(db.records.get('system/auth'), before);
});

test('pending enrollment is invalid after a security session-version change', async () => {
  const db = new MemoryDatabase(), { auth } = modules(db);
  const enrollment = await auth.beginTwoFactorEnrollment('fixture-session', 1);
  db.records.get('system/auth').sessionVersion = 2;
  assert.equal((await auth.confirmTwoFactorEnrollment(authenticatorCode(enrollment.secretKey), 'fixture-session', 1)).ok, false);
  assert.notEqual(db.records.get('system/auth').totpEnabled, true);
});

test('current-factor proof allows removal and management lock state is enforced', async () => {
  const db = new MemoryDatabase(), { auth } = modules(db);
  const enrollment = await auth.beginTwoFactorEnrollment('fixture-session', 1);
  await auth.confirmTwoFactorEnrollment(authenticatorCode(enrollment.secretKey), 'fixture-session', 1);
  const state = db.records.get('system/auth');
  state.totpManagementFailures = 5;
  state.totpManagementExpiresAt = Date.now() + 60000;
  assert.equal(await auth.disableTwoFactor(authenticatorCode(enrollment.secretKey, 1)), false);
  state.totpManagementExpiresAt = Date.now() - 1;
  assert.equal(await auth.disableTwoFactor(authenticatorCode(enrollment.secretKey, 1)), true);
  assert.equal(db.records.get('system/auth').totpEnabled, false);
});

test('the account MFA window spans login sources, recovery and factor management', async () => {
  const db = new MemoryDatabase(), { auth } = modules(db);
  const enrollment = await auth.beginTwoFactorEnrollment('fixture-session', 1);
  const confirmed = await auth.confirmTwoFactorEnrollment(authenticatorCode(enrollment.secretKey), 'fixture-session', 1);
  assert.ok(confirmed.ok);
  const state = db.doc('system/auth');
  const version = confirmed.sessionVersion, recovery = confirmed.recoveryCodes[0];
  // Existing management failures must count immediately after upgrading.
  const expiresAt = Date.now() + 60000;
  await state.set({ totpManagementFailures: 3, totpManagementExpiresAt: expiresAt }, { merge: true });
  assert.equal(await auth.disableTwoFactor('invalid', version), false);
  assert.equal((await auth.verifyLoginTwoFactor('invalid', 'fixture-a', version)).ok, false);
  const locked = (await state.get()).data();
  assert.equal(locked.totpManagementFailures, 5);
  assert.equal(locked.totpManagementExpiresAt, expiresAt);
  assert.equal(db.records.get('loginAttempts/totp-fixture-a').count, 1);
  assert.equal((await auth.verifyLoginTwoFactor(recovery, 'fixture-b', version)).locked, true);
  assert.equal(await auth.disableTwoFactor(authenticatorCode(enrollment.secretKey, 1), version), false);
  assert.deepEqual((await state.get()).data(), locked);

  await state.set({ totpManagementExpiresAt: Date.now() - 1 }, { merge: true });
  assert.equal((await auth.verifyLoginTwoFactor(recovery, 'fixture-b', version)).ok, true);
  const fresh = (await state.get()).data();
  assert.equal(fresh.totpManagementFailures, 0);
  assert.equal(fresh.totpManagementExpiresAt, 0);
  assert.equal(fresh.recoveryCodeHashes.length, 7);
  assert.equal((await auth.verifyLoginTwoFactor(recovery, 'fixture-b', version)).ok, false);
  assert.equal((await state.get()).data().totpManagementFailures, 1);
});

test('stored credentials perform one password derivation per admitted login, regardless of username', async (t) => {
  const derivations = t.mock.method(crypto, 'scrypt');
  const db = new MemoryDatabase(), { auth } = modules(db);
  const password = 'Fixture-Password-987!';
  await auth.setLoginCredentials('fixture-admin', password);
  for (const [username, candidate, ok] of [
    ['unknown', 'incorrect', false],
    ['fixture-admin', 'incorrect', false],
    ['unknown', password, false],
    ['fixture-admin', password, true],
  ]) {
    const before = derivations.mock.callCount();
    const result = await auth.authenticate(username, candidate, 'fixture');
    assert.deepEqual(result, ok ? { ok, locked: false, sessionVersion: 2 } : { ok, locked: false });
    assert.equal(derivations.mock.callCount() - before, 1);
  }
  await db.doc('loginAttempts/fixture').set({ count: 5, expiresAt: Date.now() + 60000 });
  const before = derivations.mock.callCount();
  assert.equal((await auth.authenticate('fixture-admin', password, 'fixture')).locked, true);
  assert.equal(derivations.mock.callCount(), before);
});

test('unsent signer correction rotates the personal link and synchronizes the recipient', async () => {
  const { documents } = modules(new MemoryDatabase());
  const doc = await documents.createDocument({ title: 'Draft', content: '<p>Terms</p>', signers: [signer('one')] });
  const updated = await documents.updateHtmlDocument(doc.id, { title: doc.title, content: doc.content, recipientName: 'Corrected', recipientEmail: 'corrected@example.test' });
  assert.equal(updated.signers[0].name, updated.recipientName);
  assert.equal(updated.signers[0].email, updated.recipientEmail);
  assert.equal(await documents.getSignerByToken(doc.signers[0].token), undefined);
  assert.equal((await documents.getSignerByToken(updated.signers[0].token)).signer.name, 'Corrected');
});

test('only complete active documents accept signatures, for both token formats', async () => {
  const signature = await png();
  for (const indexed of [false, true]) {
    const db = new MemoryDatabase(), { documents } = modules(db);
    const create = async (content) => {
      const doc = await documents.createDocument({ title: 'Fixture', content, ...(indexed ? { signers: [signer('one')] } : {}) });
      const token = indexed ? doc.signers[0].token : doc.token;
      return { doc, sign: () => documents.signDocument(token, 'Fixture signer', signature, documents.documentRevision(doc)) };
    };
    for (const html of ['<p>[שם הלקוח]</p>', '<p>&#95;&#95;<strong>__</strong></p>', '<span class="quick-field-token" data-field="[סכום]">&nbsp;</span>']) {
      const { doc, sign } = await create(html);
      assert.equal(await sign(), false);
      const saved = await documents.getDocumentById(doc.id);
      assert.equal(saved.signedAt, undefined);
      assert.equal(saved.signers?.[0]?.signedAt, undefined);
    }
    const { doc, sign } = await create('<p>Final terms [חתימת הלקוח]</p>');
    db.beforeTransaction = () => documents.setDocumentArchived(doc.id, true);
    assert.equal(await sign(), false);
    await documents.setDocumentArchived(doc.id, false);
    assert.equal(await sign(), true);
  }
});

test('PDF signing respects archive state and uses the PDF fields', () => {
  const { documents } = modules(new MemoryDatabase());
  const pdf = { sourceType: 'pdf', content: '[HTML-only placeholder]' };
  assert.equal(documents.signingBlockReason(pdf), null);
  assert.equal(documents.signingBlockReason({ ...pdf, archivedAt: '2026-11-20' }), 'archived');
});

test('signer email is bound to the chosen signer and legacy corrections rotate the link', async () => {
  const db = new MemoryDatabase(), { documents, load } = modules(db);
  const tracking = load('src/lib/document-tracking.ts');
  const doc = await documents.createDocument({ title: 'Draft', recipientEmail: 'first@example.test', content: '<p>Final</p>', signers: [signer('one'), signer('two')] });
  await assert.rejects(tracking.reserveDocumentEmail(doc.id, 'two'), /recipient/);
  const legacy = await documents.createDocument({ title: 'Old format', recipientEmail: 'old@example.test', content: '<p>Final</p>' });
  const changed = await documents.updateHtmlDocument(legacy.id, { title: legacy.title, content: legacy.content, recipientName: 'New', recipientEmail: 'new@example.test' });
  assert.notEqual(legacy.token, changed.token);
  assert.equal(await documents.getSignerByToken(legacy.token), undefined);
  assert.equal((await documents.getSignerByToken(changed.token)).document.recipientEmail, 'new@example.test');
  await tracking.reserveDocumentEmail(legacy.id, '');
  await assert.rejects(documents.updateHtmlDocument(legacy.id, { title: legacy.title, content: legacy.content, recipientEmail: 'different@example.test' }), /document-locked/);
});

test('logout revokes only the current session, including existing cookie format', async () => {
  const db = new MemoryDatabase(), jar = new Map(), { auth } = modules(db, jar);
  const cookie = 'elia_admin_session';
  await auth.createSession(1);
  const first = jar.get(cookie);
  await auth.createSession(1);
  const second = jar.get(cookie);
  assert.notEqual(first.value, second.value);
  assert.equal(await auth.isAuthenticated(), true);
  await auth.clearSession();
  jar.set(cookie, second);
  assert.equal(await auth.isAuthenticated(), false);
  jar.set(cookie, first);
  assert.equal(await auth.isAuthenticated(), true);
  const payload = `admin.${Math.floor(Date.now() / 1000) + 300}.1`;
  const legacy = { value: payload + '.' + crypto.createHmac('sha256', process.env.AUTH_SECRET).update(payload).digest('base64url') };
  jar.set(cookie, legacy);
  assert.equal(await auth.isAuthenticated(), true);
  await auth.clearSession();
  jar.set(cookie, legacy);
  assert.equal(await auth.isAuthenticated(), false);
});

test('login codes are used once, stale versions and missing enabled factors fail closed', async () => {
  const db = new MemoryDatabase(), { auth } = modules(db);
  const enrollment = await auth.beginTwoFactorEnrollment('fixture-session', 1);
  const code = authenticatorCode(enrollment.secretKey);
  const result = await auth.confirmTwoFactorEnrollment(authenticatorCode(enrollment.secretKey, -1), 'fixture-session', 1);
  assert.equal((await auth.verifyLoginTwoFactor(code, 'fixture', 1)).ok, false);
  assert.equal((await auth.verifyLoginTwoFactor(code, 'fixture', result.sessionVersion)).ok, true);
  assert.equal((await auth.verifyLoginTwoFactor(code, 'other')).ok, false);
  const recovery = result.recoveryCodes[0];
  assert.equal((await auth.verifyLoginTwoFactor(recovery, 'fixture')).ok, true);
  assert.equal((await auth.verifyLoginTwoFactor(recovery, 'fixture')).ok, false);
  db.records.get('system/auth').totpSecretCipher = null;
  assert.equal((await auth.verifyLoginTwoFactor('', 'fixture')).ok, false);
});

test('quick fields preserve literal text and Hebrew field names containing quotes', () => {
  const { load } = modules(new MemoryDatabase());
  const { quickFieldHtml, cleanHtml } = load('src/lib/document-html.ts');
  const field = '[ת"ז]';
  const rendered = cleanHtml(quickFieldHtml(field, 'A < B & "company"'));
  assert.match(rendered, /data-field="\[ת&quot;ז\]"/);
  assert.ok(rendered.includes('A &lt; B &amp;'));
});

test('generated signer fields expose the current recipient identity only', () => {
  const { documents } = modules(new MemoryDatabase());
  const signers = [{ ...signer('one'), identityNumber: '111111111' }, { ...signer('two'), identityNumber: '222222222' }];
  const content = signers.map((s) => `<span class="signature-field" data-signer-id="${s.id}">Sign</span>`).join('');
  const html = documents.renderHtmlForSigner({ signers, content }, 'one');
  assert.ok(html.includes('111111111'));
  assert.ok(!html.includes('222222222'));
  assert.ok(html.includes('Fixture two'));
});

test('authenticator enrollment belongs to the initiating session and shares replay protection with removal', async () => {
  const db = new MemoryDatabase(), { auth } = modules(db);
  const enrollment = await auth.beginTwoFactorEnrollment('first', 1);
  const code = authenticatorCode(enrollment.secretKey);
  assert.equal((await auth.confirmTwoFactorEnrollment(code, 'other', 1)).ok, false);
  await auth.cancelTwoFactorEnrollment('other', 1);
  await assert.rejects(auth.beginTwoFactorEnrollment('other', 1), /enrollment-in-progress/);
  assert.equal((await auth.confirmTwoFactorEnrollment(code, 'first', 1)).ok, true);
  assert.equal((await auth.verifyLoginTwoFactor(code, 'fixture')).ok, false);
  assert.equal(await auth.disableTwoFactor(code, 2), false);
  const next = authenticatorCode(enrollment.secretKey, 1);
  assert.equal((await auth.verifyLoginTwoFactor(next, 'fixture')).ok, true);
  assert.equal(await auth.disableTwoFactor(next, 2), false);
});

test('recent proof is distinct from a renewed session and expires after five minutes', async () => {
  const { auth } = modules(new MemoryDatabase());
  const now = Math.floor(Date.now() / 1000);
  await auth.createSession(1, now);
  assert.equal(auth.hasRecentLogin((await auth.authenticatedSession()).loginTime), true);
  assert.equal(auth.hasRecentLogin(now - 300), false);
  await auth.createSession(1);
  assert.equal(auth.hasRecentLogin((await auth.authenticatedSession()).loginTime), false);
});

test('a Google sign-in can be redeemed once and must be fresh and current', async () => {
  const db = new MemoryDatabase(), { auth } = modules(db);
  const now = Math.floor(Date.now() / 1000);
  assert.equal(await auth.redeemGoogleLogin(now, 2), false);
  assert.equal(await auth.redeemGoogleLogin(now - 301, 1), false);
  assert.equal(await auth.redeemGoogleLogin(now, 1), true);
  assert.equal(await auth.redeemGoogleLogin(now, 1), false);
});

test('the byte reader preserves multipart data and enforces the limit without a length header', async () => {
  const { load } = modules(new MemoryDatabase());
  const { readLimitedBytes } = load('src/lib/request-body.ts');
  const makeRequest = () => new Request('https://example.test/', { method: 'POST', body: new Uint8Array([0, 255, 13, 10]) });
  assert.deepEqual([...await readLimitedBytes(makeRequest(), 4)], [0, 255, 13, 10]);
  assert.equal(await readLimitedBytes(makeRequest(), 3), null);
  const form = new FormData();
  form.set('data', 'שלום');
  form.set('file', new Blob(['example']), 'fixture.pdf');
  const request = new Request('https://example.test/', { method: 'POST', body: form });
  const bytes = await readLimitedBytes(request, 2000);
  const restored = await new Response(bytes, { headers: request.headers }).formData();
  assert.equal(restored.get('data'), 'שלום');
  assert.equal(await restored.get('file').text(), 'example');
});
