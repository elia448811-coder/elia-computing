import "server-only";
import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/firebase-admin";
import { cleanHtml } from "@/lib/documents";
import type { WorkspaceDraft } from "@/lib/workspace-types";

export type StoredDraft = { revision: string; data: WorkspaceDraft; submittedDocumentId?: string };
const draftRef = () => getDatabase().doc("workspaceDrafts/new-html");
export async function getWorkspaceDraft(): Promise<StoredDraft | null> {
  return (await draftRef().get()).data() as StoredDraft | undefined ?? null;
}
export async function saveWorkspaceDraft(data: WorkspaceDraft, expectedRevision: string | null): Promise<StoredDraft> {
  if (!data || data.version !== 1 || !data.editor || !Array.isArray(data.signers) || data.signers.length < 1 || data.signers.length > 6 || Buffer.byteLength(JSON.stringify(data)) > 750000) throw new Error("invalid-draft");
  if (typeof data.editor.content !== "string" || typeof data.editor.title !== "string" || data.editor.title.length > 160) throw new Error("invalid-draft");
  const signers = data.signers.map((signer) => {
    if (![signer.id, signer.label, signer.name, signer.identityNumber, signer.email, signer.phone].every((value) => typeof value === "string") || signer.id.length > 100) throw new Error("invalid-draft");
    return { id: signer.id, label: signer.label.slice(0, 80), name: signer.name.slice(0, 160), identityNumber: signer.identityNumber.slice(0, 9), email: signer.email.slice(0, 320), phone: signer.phone.slice(0, 32) };
  });
  const cleaned: WorkspaceDraft = {
    version: 1, signers, updatedAt: new Date().toISOString(), step: Math.max(1, Math.min(4, Number(data.step) || 1)),
    editor: { title: data.editor.title, content: cleanHtml(data.editor.content), template: String(data.editor.template).slice(0, 80), warrantyAgreement: String(data.editor.warrantyAgreement ?? "").slice(0, 5000), pageOrientation: data.editor.pageOrientation === "landscape" ? "landscape" : "portrait", pageHeader: String(data.editor.pageHeader ?? "").slice(0, 160), pageFooter: String(data.editor.pageFooter ?? "").slice(0, 160), showPageNumbers: data.editor.showPageNumbers !== false, fontFamily: String(data.editor.fontFamily ?? "Heebo").slice(0, 80), lineHeight: String(data.editor.lineHeight ?? "1.75").slice(0, 10) },
  };
  return getDatabase().runTransaction(async (tx) => {
    const ref = draftRef(), current = (await tx.get(ref)).data() as StoredDraft | undefined;
    if ((current?.revision ?? null) !== expectedRevision || current?.submittedDocumentId) throw new Error("draft-conflict");
    const next = { revision: randomUUID(), data: cleaned };
    tx.set(ref, next);
    return next;
  });
}
export async function clearWorkspaceDraft(expectedRevision: string | null) {
  return getDatabase().runTransaction(async (tx) => {
    const ref = draftRef(), current = (await tx.get(ref)).data() as StoredDraft | undefined;
    if (current && current.revision !== expectedRevision) throw new Error("draft-conflict");
    tx.delete(ref);
  });
}
