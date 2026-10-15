import "server-only";
import { randomUUID } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { getDatabase } from "@/lib/firebase-admin";
import type { PdfDraftData, PdfDraftEnvelope } from "@/lib/pdf-draft-types";
const ref = () => getDatabase().doc("workspaceDrafts/new-pdf");
export async function getPdfDraft() { return (await ref().get()).data() as PdfDraftEnvelope | undefined ?? null; }
export async function readPdfDraft(expectedRevision?: string) {
  return getDatabase().runTransaction(async (tx) => {
    const current = (await tx.get(ref())).data() as PdfDraftEnvelope | undefined;
    if (!current) return null;
    if (expectedRevision && current.revision !== expectedRevision) throw new Error("draft-conflict");
    const chunks = await Promise.all(Array.from({ length: current.chunkCount }, (_, index) => tx.get(ref().collection("chunks").doc(`${index}`))));
    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk.data()!.bytes)));
  });
}
export async function savePdfDraft(data: PdfDraftData, file: File | null, expectedRevision: string | null) {
  if (!data || typeof data.title !== "string" || data.title.length > 160 || !Array.isArray(data.signers) || data.signers.length < 1 || data.signers.length > 6 || !Array.isArray(data.fields) || data.fields.length > 30 || Buffer.byteLength(JSON.stringify(data)) > 30000) throw new Error("invalid-draft");
  if (new Set(data.signers.map((signer) => signer.id)).size !== data.signers.length || data.signers.some((signer) => ![signer.id, signer.label, signer.name, signer.identityNumber, signer.email, signer.phone].every((value) => typeof value === "string" && value.length <= 320)) || data.fields.some((field) => typeof field.id !== "string" || !data.signers.some((signer) => signer.id === field.signerId) || ![field.page, field.x, field.y, field.width, field.height].every(Number.isFinite))) throw new Error("invalid-draft");
  const bytes = file ? Buffer.from(await file.arrayBuffer()) : null;
  if (bytes && (bytes.length > 4 * 1024 * 1024 || bytes.subarray(0, 5).toString() !== "%PDF-")) throw new Error("invalid-pdf");
  if (bytes) await PDFDocument.load(bytes);
  return getDatabase().runTransaction(async (tx) => {
    const current = (await tx.get(ref())).data() as PdfDraftEnvelope | undefined;
    if ((current?.revision ?? null) !== expectedRevision) throw new Error("draft-conflict");
    if (!current && !bytes) throw new Error("missing-file");
    const chunkCount = bytes ? Math.ceil(bytes.length / (700 * 1024)) : current!.chunkCount;
    const next: PdfDraftEnvelope = { revision: randomUUID(), chunkCount, data: { ...data, fileName: String(data.fileName).slice(0, 160), step: Math.max(1, Math.min(4, data.step)), updatedAt: new Date().toISOString() } };
    tx.set(ref(), next);
    if (bytes) {
      for (let index = 0; index < chunkCount; index++) tx.set(ref().collection("chunks").doc(`${index}`), { bytes: bytes.subarray(index * 700 * 1024, (index + 1) * 700 * 1024) });
      for (let index = chunkCount; index < (current?.chunkCount ?? 0); index++) tx.delete(ref().collection("chunks").doc(`${index}`));
    }
    return next;
  });
}
export async function clearPdfDraft(expectedRevision: string | null) {
  await getDatabase().runTransaction(async (tx) => {
    const current = (await tx.get(ref())).data() as PdfDraftEnvelope | undefined;
    if (!current) return;
    if (current.revision !== expectedRevision) throw new Error("draft-conflict");
    for (let index = 0; index < current.chunkCount; index++) tx.delete(ref().collection("chunks").doc(`${index}`));
    tx.delete(ref());
  });
}
