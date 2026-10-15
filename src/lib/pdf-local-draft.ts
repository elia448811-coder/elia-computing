import type { PdfDraftData } from "@/lib/pdf-draft-types";
export type LocalPdfDraft = { data: PdfDraftData; file: File; revision: string | null };
function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("elia-pdf-drafts", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readLocalPdfDraft(): Promise<LocalPdfDraft | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => { const tx = db.transaction("drafts"); const request = tx.objectStore("drafts").get("current"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); tx.oncomplete = () => db.close(); });
}
export async function writeLocalPdfDraft(value: LocalPdfDraft | null) {
  const db = await database();
  return new Promise<void>((resolve, reject) => { const tx = db.transaction("drafts", "readwrite"); if (value) tx.objectStore("drafts").put(value, "current"); else tx.objectStore("drafts").delete("current"); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); }; });
}
