import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

// All persistence is an in-memory fixture. These tests never contact cloud services.
class MemoryDatabase {
  records = new Map();
  beforeTransaction;
  doc(key) {
    const ref = {
      path: key,
      get: async () => ({ exists: this.records.has(key), data: () => structuredClone(this.records.get(key)), ref }),
      create: async (value) => { assert.equal(this.records.has(key), false); this.records.set(key, structuredClone(value)); },
      set: async (value, options) => { this.records.set(key, { ...(options?.merge ? this.records.get(key) : {}), ...structuredClone(value) }); },
      async update(value) { await ref.set(value, { merge: true }); },
      delete: async () => { this.records.delete(key); },
    };
    return ref;
  }
  collection(prefix) {
    return {
      where: (field, operation, value) => {
        assert.equal(operation, '==');
        return { limit: () => ({ get: async () => {
          const found = [...this.records].find(([key, data]) => key.startsWith(`${prefix}/`) && data[field] === value);
          return { docs: found ? [await this.doc(found[0]).get()] : [] };
        } }) };
      },
    };
  }
  batch() {
    const pending = [];
    return { create(ref, value) { pending.push(() => ref.create(value)); }, async commit() { for (const write of pending) await write(); } };
  }
  async runTransaction(work) {
    const before = this.beforeTransaction;
    this.beforeTransaction = undefined;
    if (before) await before();
    const writes = [];
    const result = await work({
      get: async (ref) => { assert.equal(writes.length, 0, 'read state before scheduling writes'); return ref.get(); },
      set: (ref, value, options) => writes.push(() => ref.set(value, options)),
      update: (ref, value) => writes.push(() => ref.update(value)),
    });
    for (const write of writes) await write();
    return result;
  }
}

function modules(db) {
  const cache = new Map();
  function load(relative) {
    const filename = path.join(testDirectory, '..', relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = new Module(filename);
    loaded.filename = filename;
    loaded.paths = Module._nodeModulePaths(path.dirname(filename));
    const ordinaryRequire = loaded.require.bind(loaded);
    loaded.require = (name) => {
      if (name === 'server-only') return {};
      if (name === '@/lib/firebase-admin') return { getDatabase: () => db };
      if (name === 'next/headers') return { cookies: async () => ({ set() {}, get() {}, delete() {} }) };
      if (name.startsWith('@/lib/')) return load(`src/lib/${name.slice('@/lib/'.length)}.ts`);
      return ordinaryRequire(name);
    };
    cache.set(filename, loaded);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    });
    loaded._compile(compiled.outputText, filename);
    return loaded.exports;
  }
  return { documents: load('src/lib/documents.ts'), auth: load('src/lib/auth.ts'), images: load('src/lib/signature-image.ts') };
}

process.env.AUTH_SECRET = crypto.randomBytes(32).toString('hex');
const signer = (id) => ({ id, label: id, name: `Fixture ${id}`, identityNumber: '000000000', email: '', phone: '', token: '' });
async function png() {
  const bytes = await sharp({ create: { width: 64, height: 24, channels: 4, background: { r: 20, g: 30, b: 40, alpha: 1 } } }).png().toBuffer();
  return `data:image/png;base64,${bytes.toString('base64')}`;
}
function authenticatorCode(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = [...secret].map((ch) => alphabet.indexOf(ch).toString(2).padStart(5, '0')).join('');
  const bytes = Buffer.from(bits.match(/.{8}/g).map((byte) => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
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
  const enrollment = await auth.beginTwoFactorEnrollment();
  const confirmed = await auth.confirmTwoFactorEnrollment(authenticatorCode(enrollment.secretKey));
  assert.equal(confirmed.ok, true);
  assert.equal(confirmed.recoveryCodes.length, 8);
  const before = structuredClone(db.records.get('system/auth'));
  await assert.rejects(auth.beginTwoFactorEnrollment(), /two-factor-already-enabled/);
  assert.equal((await auth.confirmTwoFactorEnrollment(authenticatorCode(enrollment.secretKey))).ok, false);
  assert.deepEqual(db.records.get('system/auth'), before);
});

test('pending enrollment is invalid after a security session-version change', async () => {
  const db = new MemoryDatabase(), { auth } = modules(db);
  const enrollment = await auth.beginTwoFactorEnrollment();
  db.records.get('system/auth').sessionVersion = 2;
  assert.equal((await auth.confirmTwoFactorEnrollment(authenticatorCode(enrollment.secretKey))).ok, false);
  assert.notEqual(db.records.get('system/auth').totpEnabled, true);
});

test('current-factor proof allows removal and management lock state is enforced', async () => {
  const db = new MemoryDatabase(), { auth } = modules(db);
  const enrollment = await auth.beginTwoFactorEnrollment();
  await auth.confirmTwoFactorEnrollment(authenticatorCode(enrollment.secretKey));
  const state = db.records.get('system/auth');
  state.totpManagementFailures = 5;
  state.totpManagementExpiresAt = Date.now() + 60000;
  assert.equal(await auth.disableTwoFactor(authenticatorCode(enrollment.secretKey)), false);
  state.totpManagementExpiresAt = Date.now() - 1;
  assert.equal(await auth.disableTwoFactor(authenticatorCode(enrollment.secretKey)), true);
  assert.equal(db.records.get('system/auth').totpEnabled, false);
});
