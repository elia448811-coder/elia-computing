import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { MemoryDatabase, modules } from './support.mjs';

process.env.AUTH_SECRET = crypto.randomBytes(32).toString('hex');
const signer = (id, extras = {}) => ({ id, label: id, name: `Client ${id}`, identityNumber: '123456789', email: `${id}@example.test`, phone: '0501234567', token: '', ...extras });
const draft = () => ({ version: 1, updatedAt: new Date().toISOString(), step: 3, signers: [signer('one')], editor: { title: 'Fixture', content: '<p>Terms</p><script>alert(1)</script>', template: 'blank', pageOrientation: 'portrait', pageHeader: '', pageFooter: '', showPageNumbers: true, fontFamily: 'Arial', lineHeight: '1.75' } });

test('same-origin protection accepts the forwarded application host and rejects foreign origins', () => {
  const { sameOrigin } = modules(new MemoryDatabase()).load('src/lib/request-origin.ts');
  const request = (origin) => new Request('http://localhost:3195/api/dashboard/draft', { headers: { origin, host: '127.0.0.1:3195', 'x-forwarded-host': '127.0.0.1:3195', 'x-forwarded-proto': 'http' } });
  assert.equal(sameOrigin(request('http://127.0.0.1:3195')), true);
  assert.equal(sameOrigin(request('https://foreign.example')), false);
  assert.equal(sameOrigin(request('invalid')), false);
});

test('partial HTML and PDF progress uses all assigned signers and search finds secondary signers', () => {
  const status = modules(new MemoryDatabase()).load('src/lib/document-status.ts');
  const document = { title: 'Example', createdAt: new Date().toISOString(), signers: [signer('one', { signedAt: '2026-10-01' }), signer('two', { identityNumber: '987654321', phone: '0527654321' })] };
  for (const sourceType of ['html', 'pdf']) assert.deepEqual(status.signatureProgress({ ...document, sourceType }), { total: 2, signed: 1, complete: false });
  assert.ok(status.documentSearchText(document).includes('two@example.test'));
  assert.ok(status.documentSearchText(document).includes('987654321'));
  assert.ok(status.documentSearchText(document).includes('0527654321'));
  assert.equal(status.documentState({ ...document, archivedAt: '2026-10-01' }), 'archived');
  assert.equal(status.signatureProgress({ signedAt: '2026-10-01' }).complete, true);
});
test('cloud draft preserves signer data, sanitizes content and rejects stale writes and cleanup', async () => {
  const db = new MemoryDatabase(), drafts = modules(db).load('src/lib/workspace-drafts.ts');
  const saved = await drafts.saveWorkspaceDraft(draft(), null);
  assert.equal(saved.data.signers[0].phone, '0501234567');
  assert.equal(saved.data.editor.content, '<p>Terms</p>');
  await assert.rejects(drafts.saveWorkspaceDraft(draft(), null), /draft-conflict/);
  const newer = await drafts.saveWorkspaceDraft({ ...draft(), step: 4 }, saved.revision);
  await assert.rejects(drafts.clearWorkspaceDraft(saved.revision), /draft-conflict/);
  assert.equal((await drafts.getWorkspaceDraft()).revision, newer.revision);
  await drafts.clearWorkspaceDraft(newer.revision);
  assert.equal(await drafts.getWorkspaceDraft(), null);
});
test('customer identity edit retains historical documents and does not modify signed contracts', async () => {
  const db = new MemoryDatabase(), { load } = modules(db), customers = load('src/lib/customers.ts'), status = load('src/lib/document-status.ts');
  const key = crypto.createHash('sha256').update('123456789').digest('hex');
  await db.doc(`customers/${key}`).set({ id: 'client', fullName: 'Old', identityNumber: '123456789', email: 'old@example.test', phone: '', createdAt: '2026-10-01', updatedAt: '2026-10-01' });
  await db.doc('signatureDocuments/final').set({ signers: [signer('one')], signedAt: '2026-10-02' });
  const customer = await customers.updateCustomer('client', { fullName: 'Updated', identityNumber: '987654321', email: 'new@example.test', phone: '0501111111', notes: 'Internal note' });
  assert.equal(customer.id, 'client');
  assert.equal(customer.notes, 'Internal note');
  assert.deepEqual(customer.previousIdentityNumbers, ['123456789']);
  assert.equal(status.belongsToCustomer({ signers: [signer('one')] }, customer), true);
  assert.equal(db.records.get('signatureDocuments/final').signers[0].name, 'Client one');
  const duplicate = crypto.createHash('sha256').update('111111111').digest('hex');
  await db.doc(`customers/${duplicate}`).set({ id: 'other', identityNumber: '111111111' });
  await assert.rejects(customers.updateCustomer('client', { ...customer, identityNumber: '111111111' }), /identity-exists/);
});
test('recipient views are debounced, per signer, and never change the reviewed revision', async () => {
  const db = new MemoryDatabase(), { documents, load } = modules(db), tracking = load('src/lib/document-tracking.ts');
  const document = await documents.createDocument({ title: 'Fixture', content: '<p>Terms</p>', signers: [signer('one'), signer('two')] });
  const revision = documents.documentRevision(document);
  assert.equal(await tracking.recordDocumentView(document.signers[1].token), true);
  const current = await documents.getDocumentById(document.id);
  assert.ok(current.signers[1].firstViewedAt);
  assert.equal(current.signers[0].firstViewedAt, undefined);
  assert.equal(documents.documentRevision(current), revision);
  await tracking.recordDocumentView(document.signers[1].token);
  assert.equal((await documents.getDocumentById(document.id)).signers[1].lastViewedAt, current.signers[1].lastViewedAt);
});
test('delivery retries reuse one provider key and completed sends count once with cooldown', async () => {
  const db = new MemoryDatabase(), { documents, load } = modules(db), tracking = load('src/lib/document-tracking.ts');
  const document = await documents.createDocument({ title: 'Fixture', content: '<p>Terms</p>', signers: [signer('one'), signer('two')] });
  const first = await tracking.reserveDocumentEmail(document.id, 'two'), retry = await tracking.reserveDocumentEmail(document.id, 'two');
  assert.equal(first.delivery.deliveryId, retry.delivery.deliveryId);
  await tracking.completeDocumentEmail(first, 'provider-fixture');
  await tracking.completeDocumentEmail(retry, 'provider-fixture');
  const current = await documents.getDocumentById(document.id);
  assert.equal(current.signers[1].sendCount, 1);
  assert.equal(current.signers[0].lastSentAt, undefined);
  await assert.rejects(tracking.reserveDocumentEmail(document.id, 'two'), /cooldown/);
  await assert.rejects(tracking.reserveDocumentEmail(document.id, 'unknown'), /unavailable/);
  await assert.rejects(tracking.reserveDocumentEmail(document.id, ''), /unavailable/);
});
test('signed and archived documents cannot receive further reminders', async () => {
  const db = new MemoryDatabase(), { documents, load } = modules(db), tracking = load('src/lib/document-tracking.ts');
  const document = await documents.createDocument({ title: 'Fixture', content: '<p>Terms</p>', signers: [signer('one', { signedAt: '2026-10-01' })] });
  await assert.rejects(tracking.reserveDocumentEmail(document.id, 'one'), /completed/);
  await documents.setDocumentArchived(document.id, true);
  await assert.rejects(tracking.reserveDocumentEmail(document.id, 'one'), /unavailable/);
});
test('PDF drafts restore bytes, fields and six signers, and newer drafts survive old cleanup', async () => {
  const db = new MemoryDatabase(), { load } = modules(db), drafts = load('src/lib/pdf-drafts.ts');
  const pdf = await PDFDocument.create(); pdf.addPage();
  const bytes = await pdf.save(), file = new File([bytes], 'fixture.pdf', { type: 'application/pdf' });
  const data = { title: 'Fixture PDF', fileName: file.name, step: 3, updatedAt: new Date().toISOString(), signers: Array.from({ length: 6 }, (_, index) => signer(`${index}`)), fields: [{ id: 'field', signerId: '0', page: 1, x: 0.2, y: 0.2, width: 0.2, height: 0.1 }] };
  const saved = await drafts.savePdfDraft(data, file, null);
  assert.deepEqual(new Uint8Array(await drafts.readPdfDraft()), bytes);
  const next = await drafts.savePdfDraft({ ...data, step: 4 }, null, saved.revision);
  await assert.rejects(drafts.clearPdfDraft(saved.revision), /draft-conflict/);
  assert.equal((await drafts.getPdfDraft()).data.signers.length, 6);
  await drafts.clearPdfDraft(next.revision);
  assert.equal(await drafts.getPdfDraft(), null);
});

test('PDF creation accepts one through six distinct signers and rejects duplicate assignments', async () => {
  const { documents } = modules(new MemoryDatabase());
  const pdf = await PDFDocument.create(); pdf.addPage();
  const pdfBytes = await pdf.save();
  for (const count of [1, 6]) {
    const signers = Array.from({ length: count }, (_, index) => signer(`signer-${index}`));
    const fields = signers.map((item, index) => ({ id: `field-${index}`, signerId: item.id, page: 1, x: 0.1, y: 0.1 + index * 0.1, width: 0.2, height: 0.08 }));
    const result = await documents.createPdfDocument({ title: 'Fixture', fileName: 'fixture.pdf', pdfBytes, signers, fields });
    assert.equal(result.signers.length, count);
    assert.equal(new Set(result.signers.map((item) => item.token)).size, count);
  }
  await assert.rejects(documents.createPdfDocument({ title: 'Fixture', fileName: 'fixture.pdf', pdfBytes, signers: [signer('same'), signer('same')], fields: [] }), /invalid-signers/);
});
