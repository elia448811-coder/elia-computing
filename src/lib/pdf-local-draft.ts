import { rememberSubmission, submittedStamp } from "@/lib/draft-submission";
import type { PdfDraftData } from "@/lib/pdf-draft-types";
import type { DraftCipher, SealedDraft } from "@/lib/local-draft-cipher";

export type LocalPdfDraft = { data: PdfDraftData; file: File; revision: string | null };
type StoredPdf = LocalPdfDraft | SealedDraft;
const slot = "elia-pdf-drafts/current";
let writeGeneration = 0;

function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("elia-pdf-drafts", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function storedPdf(): Promise<StoredPdf | undefined> {
  const db = await database();
  try {
    return await new Promise<StoredPdf | undefined>((resolve, reject) => {
      const request = db.transaction("drafts").objectStore("drafts").get("current");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
export async function encodePdfDraft(value: LocalPdfDraft, cipher: DraftCipher) {
  const form = new FormData();
  form.set("metadata", JSON.stringify({ data: value.data, revision: value.revision, name: value.file.name, type: value.file.type, modified: value.file.lastModified }));
  form.set("file", value.file);
  const body = new Response(form);
  const packed = await new Blob([body.headers.get("content-type")!, "\n", await body.arrayBuffer()]).arrayBuffer();
  return cipher.seal(slot, packed);
}
async function commit(value: SealedDraft | null, generation: number, legacy?: LocalPdfDraft, expectedIv?: string) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("drafts", "readwrite"), store = tx.objectStore("drafts");
      const check = store.get("current");
      check.onsuccess = () => {
        if (generation !== writeGeneration) return;
        const current: StoredPdf | undefined = check.result;
        if (expectedIv && (!current || !("format" in current) || current.iv !== expectedIv)) return;
        if (legacy && (!current || "format" in current || current.data.updatedAt !== legacy.data.updatedAt || current.revision !== legacy.revision)) return;
        if (value) store.put(value, "current"); else store.delete("current");
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error("draft-write-aborted"));
    });
  } finally { db.close(); }
}
export async function migrateLocalPdfDraft(cipher: DraftCipher) {
  const generation = writeGeneration;
  const stored = await storedPdf();
  if (stored && !("format" in stored)) await commit(await encodePdfDraft(stored, cipher), generation, stored);
}
export async function readLocalPdfDraft(cipher: DraftCipher): Promise<LocalPdfDraft | undefined> {
  const stored = await storedPdf();
  if (!stored) return undefined;
  if (!("format" in stored)) return stored;
  return decodePdfDraft(stored, cipher);
}
export async function decodePdfDraft(stored: SealedDraft, cipher: DraftCipher): Promise<LocalPdfDraft> {
  const packed = new Uint8Array(await cipher.open(slot, stored));
  const split = packed.indexOf(10);
  if (split < 0 || split > 256) throw new Error("invalid-pdf-draft");
  const type = new TextDecoder().decode(packed.subarray(0, split));
  const form = await new Response(packed.subarray(split + 1), { headers: { "Content-Type": type } }).formData();
  const meta = JSON.parse(String(form.get("metadata"))), file = form.get("file");
  if (!(file instanceof File)) throw new Error("invalid-pdf-draft");
  return { data: meta.data, revision: meta.revision, file: new File([file], meta.name, { type: meta.type, lastModified: meta.modified }) };
}
export async function writeLocalPdfDraft(value: LocalPdfDraft, cipher: DraftCipher) {
  const generation = ++writeGeneration;
  await commit(await encodePdfDraft(value, cipher), generation);
}
export async function rememberPdfSubmission() {
  try {
    const current = await storedPdf();
    return rememberSubmission(slot, current && "format" in current ? current.iv : null);
  } catch { return ""; }
}
export async function clearSubmittedPdf(nonce?: string) {
  const stamp = submittedStamp(slot, nonce);
  if (stamp) await commit(null, writeGeneration, undefined, stamp);
}
