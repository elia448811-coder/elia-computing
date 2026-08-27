import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { PDFDocument, rgb } from "pdf-lib";
import sanitizeHtml from "sanitize-html";
import { getDatabase } from "@/lib/firebase-admin";

export type SignatureField = { id: string; signerId: string; page: number; x: number; y: number; width: number; height: number };
export type DocumentSigner = {
  id: string; label: string; name: string; email: string; token: string;
  signedAt?: string; signature?: string; signerIpHash?: string; signerUserAgent?: string;
};
export type SignatureDocument = {
  id: string; token?: string; title: string; recipientName?: string; recipientEmail?: string;
  content?: string; template?: string; pageOrientation?: "portrait" | "landscape";
  pageHeader?: string; pageFooter?: string; showPageNumbers?: boolean; fontFamily?: string; lineHeight?: string;
  sourceType?: "html" | "pdf"; pdfFileName?: string;
  pdfChunkCount?: number; pdfByteLength?: number; pdfPageCount?: number; fields?: SignatureField[];
  signers?: DocumentSigner[]; createdAt: string; signedAt?: string; signerName?: string;
  signature?: string; signedContentHash?: string; signerIpHash?: string; signerUserAgent?: string;
  updatedAt?: string; archivedAt?: string | null;
};
type StoredSigner = Omit<DocumentSigner, "token"> & { tokenCipher: string };
type StoredDocument = Omit<SignatureDocument, "token" | "signers"> & { tokenCipher?: string; signers?: StoredSigner[] };

const MAX_PDF_BYTES = 4 * 1024 * 1024;
const PDF_CHUNK_BYTES = 700 * 1024;

function cleanHtml(content: string) {
  return sanitizeHtml(content, {
    allowedTags: ["h1", "h2", "h3", "p", "br", "hr", "strong", "b", "em", "i", "u", "ul", "ol", "li", "blockquote", "a", "span", "font", "table", "thead", "tbody", "tr", "th", "td"],
    allowedAttributes: {
      a: ["href", "target"],
      span: ["class", "contenteditable", "data-field", "style", "id"],
      font: ["size", "color"],
      "*": ["style", "id"],
    },
    allowedClasses: { span: ["quick-field-token"] },
    allowedStyles: {
      "*": {
        "text-align": [/^left$/, /^right$/, /^center$/],
        color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i],
        "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i],
        "font-size": [/^(?:8|9|10|11|12|14|16|18|20|22|24|28|32|36|48|72)pt$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
  });
}

function key() {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET must be configured");
  return createHash("sha256").update(process.env.AUTH_SECRET).digest();
}
function hash(token: string) { return createHmac("sha256", key()).update(token).digest("hex"); }
function encrypt(token: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((value) => value.toString("base64url")).join(".");
}
function decrypt(value: string) {
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted token");
  const [iv, tag, body] = parts.map((item) => Buffer.from(item, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}
function expose(data: StoredDocument): SignatureDocument {
  const { tokenCipher, signers, ...document } = data;
  return {
    ...document,
    token: tokenCipher ? decrypt(tokenCipher) : undefined,
    signers: signers?.map(({ tokenCipher: signerToken, ...signer }) => ({ ...signer, token: decrypt(signerToken) })),
  };
}
function safeNumber(value: number) { return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0; }
function cleanFields(fields: SignatureField[], signerIds: Set<string>, pageCount: number) {
  return fields.filter((field) => signerIds.has(field.signerId)).map((field) => ({
    id: String(field.id || randomUUID()), signerId: field.signerId,
    page: Math.min(pageCount, Math.max(1, Math.round(field.page))), x: safeNumber(field.x), y: safeNumber(field.y),
    width: Math.min(0.6, Math.max(0.08, safeNumber(field.width))), height: Math.min(0.3, Math.max(0.04, safeNumber(field.height))),
  })).filter((field) => field.x + field.width <= 1.001 && field.y + field.height <= 1.001);
}

export async function listDocuments() {
  const snapshot = await getDatabase().collection("signatureDocuments").orderBy("createdAt", "desc").get();
  return snapshot.docs.map((item) => expose(item.data() as StoredDocument));
}

async function findDocumentSnapshot(id: string) {
  if (!id || id.length > 160) return undefined;
  const snapshot = await getDatabase().collection("signatureDocuments").where("id", "==", id).limit(1).get();
  return snapshot.docs[0];
}

export async function getDocumentById(id: string) {
  const snapshot = await findDocumentSnapshot(id);
  return snapshot ? expose(snapshot.data() as StoredDocument) : undefined;
}

export async function createDocument(input: Omit<SignatureDocument, "id" | "token" | "createdAt">) {
  if ((input.title?.length ?? 0) > 160 || (input.recipientName?.length ?? 0) > 160 ||
      (input.recipientEmail?.length ?? 0) > 320 || (input.content?.length ?? 0) > 500000) throw new Error("Document input too large");
  const token = randomBytes(48).toString("base64url");
  const document: SignatureDocument = {
    ...input, sourceType: "html",
    content: cleanHtml(input.content ?? ""),
    id: randomUUID(), token, createdAt: new Date().toISOString(),
  };
  const { token: plain, signers: _unusedSigners, ...stored } = document;
  void _unusedSigners;
  if (!plain) throw new Error("Could not create signing token");
  await getDatabase().doc(`signatureDocuments/${hash(plain)}`).create({ ...stored, tokenCipher: encrypt(plain) } satisfies StoredDocument);
  return document;
}

export async function updateHtmlDocument(id: string, input: Pick<SignatureDocument, "title" | "recipientName" | "recipientEmail" | "content" | "template" | "pageOrientation" | "pageHeader" | "pageFooter" | "showPageNumbers" | "fontFamily" | "lineHeight">) {
  if ((input.title?.length ?? 0) > 160 || (input.recipientName?.length ?? 0) > 160 ||
      (input.recipientEmail?.length ?? 0) > 320 || (input.content?.length ?? 0) > 500000) throw new Error("Document input too large");
  const snapshot = await findDocumentSnapshot(id);
  if (!snapshot) throw new Error("document-not-found");
  const current = snapshot.data() as StoredDocument;
  if (current.sourceType === "pdf" || current.signedAt) throw new Error("document-locked");
  const updatedAt = new Date().toISOString();
  await snapshot.ref.update({
    title: input.title.trim(), recipientName: input.recipientName?.trim(), recipientEmail: input.recipientEmail?.trim(),
    content: cleanHtml(input.content ?? ""), template: input.template ?? "blank",
    pageOrientation: input.pageOrientation === "landscape" ? "landscape" : "portrait",
    pageHeader: input.pageHeader?.trim().slice(0, 160) ?? "", pageFooter: input.pageFooter?.trim().slice(0, 160) ?? "",
    showPageNumbers: input.showPageNumbers !== false, fontFamily: input.fontFamily ?? "Heebo", lineHeight: input.lineHeight ?? "1.75", updatedAt,
  });
  return { ...expose(current), ...input, content: cleanHtml(input.content ?? ""), updatedAt };
}

export async function duplicateHtmlDocument(id: string) {
  const document = await getDocumentById(id);
  if (!document || document.sourceType === "pdf" || !document.content) throw new Error("document-not-duplicable");
  return createDocument({
    title: `עותק של ${document.title}`.slice(0, 160), recipientName: document.recipientName ?? "לקוח חדש",
    recipientEmail: "", content: document.content, template: document.template ?? "blank",
    pageOrientation: document.pageOrientation ?? "portrait",
    pageHeader: document.pageHeader ?? "", pageFooter: document.pageFooter ?? "", showPageNumbers: document.showPageNumbers !== false,
    fontFamily: document.fontFamily ?? "Heebo", lineHeight: document.lineHeight ?? "1.75",
  });
}

export async function setDocumentArchived(id: string, archived: boolean) {
  const snapshot = await findDocumentSnapshot(id);
  if (!snapshot) throw new Error("document-not-found");
  await snapshot.ref.update({ archivedAt: archived ? new Date().toISOString() : null, updatedAt: new Date().toISOString() });
}

export async function createPdfDocument(input: {
  title: string; fileName: string; pdfBytes: Uint8Array;
  signers: Array<Pick<DocumentSigner, "id" | "label" | "name" | "email">>; fields: SignatureField[];
}) {
  if (!input.title || input.title.length > 160) throw new Error("invalid-title");
  if (input.pdfBytes.byteLength < 5 || input.pdfBytes.byteLength > MAX_PDF_BYTES) throw new Error("invalid-pdf-size");
  if (Buffer.from(input.pdfBytes.subarray(0, 5)).toString("ascii") !== "%PDF-") throw new Error("invalid-pdf");
  if (input.signers.length < 2 || input.signers.length > 6) throw new Error("invalid-signers");
  const parsedPdf = await PDFDocument.load(input.pdfBytes, { ignoreEncryption: false });
  const pageCount = parsedPdf.getPageCount(), signerIds = new Set(input.signers.map((signer) => signer.id));
  const fields = cleanFields(input.fields, signerIds, pageCount);
  if (fields.length < input.signers.length || input.signers.some((signer) => !fields.some((field) => field.signerId === signer.id))) {
    throw new Error("missing-signature-fields");
  }
  const id = randomUUID(), createdAt = new Date().toISOString();
  const signers = input.signers.map((signer) => ({
    ...signer, name: signer.name.trim().slice(0, 160), email: signer.email.trim().slice(0, 320),
    label: signer.label.trim().slice(0, 80), token: randomBytes(48).toString("base64url"),
  }));
  if (signers.some((signer) => !signer.name || !signer.label)) throw new Error("invalid-signers");
  const chunks: Buffer[] = [];
  for (let offset = 0; offset < input.pdfBytes.byteLength; offset += PDF_CHUNK_BYTES) {
    chunks.push(Buffer.from(input.pdfBytes.slice(offset, offset + PDF_CHUNK_BYTES)));
  }
  const storedSigners: StoredSigner[] = signers.map(({ token, ...signer }) => ({ ...signer, tokenCipher: encrypt(token) }));
  const stored: StoredDocument = {
    id, title: input.title.trim(), sourceType: "pdf",
    pdfFileName: input.fileName.replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 140) || "document.pdf",
    pdfChunkCount: chunks.length, pdfByteLength: input.pdfBytes.byteLength, pdfPageCount: pageCount,
    fields, signers: storedSigners, createdAt,
    signedContentHash: createHash("sha256").update(input.pdfBytes).digest("hex"),
  };
  const db = getDatabase(), batch = db.batch();
  batch.create(db.doc(`signatureDocuments/${id}`), stored);
  signers.forEach((signer) => batch.create(db.doc(`signatureTokens/${hash(signer.token)}`), { documentId: id, signerId: signer.id }));
  chunks.forEach((chunk, index) => batch.create(db.doc(`signatureDocuments/${id}/pdfChunks/${String(index).padStart(4, "0")}`), { index, data: chunk }));
  await batch.commit();
  return expose(stored);
}

export async function getDocumentByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{64}$/.test(token)) return undefined;
  const db = getDatabase(), tokenSnapshot = await db.doc(`signatureTokens/${hash(token)}`).get();
  if (tokenSnapshot.exists) {
    const { documentId } = tokenSnapshot.data() as { documentId: string };
    const snapshot = await db.doc(`signatureDocuments/${documentId}`).get();
    return snapshot.exists ? expose(snapshot.data() as StoredDocument) : undefined;
  }
  const snapshot = await db.doc(`signatureDocuments/${hash(token)}`).get();
  return snapshot.exists ? expose(snapshot.data() as StoredDocument) : undefined;
}
export async function getSignerByToken(token: string) {
  const document = await getDocumentByToken(token);
  if (!document) return undefined;
  if (!document.signers) return { document, signer: undefined };
  const signer = document.signers.find((item) => item.token === token);
  return signer ? { document, signer } : undefined;
}

export async function signDocument(token: string, signerName: string, signature: string, audit?: { ipHash?: string; userAgent?: string }) {
  if (!/^[A-Za-z0-9_-]{64}$/.test(token) || signerName.length > 160 || signature.length > 450000 ||
      !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature)) return false;
  const db = getDatabase(), tokenSnapshot = await db.doc(`signatureTokens/${hash(token)}`).get();
  if (tokenSnapshot.exists) {
    const { documentId, signerId } = tokenSnapshot.data() as { documentId: string; signerId: string };
    const ref = db.doc(`signatureDocuments/${documentId}`);
    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return false;
      const document = snapshot.data() as StoredDocument, signers = document.signers ?? [];
      const target = signers.find((signer) => signer.id === signerId);
      if (!target || target.signedAt) return false;
      const signedAt = new Date().toISOString();
      const updated = signers.map((signer) => signer.id === signerId ? {
        ...signer, name: signerName, signature, signedAt, signerIpHash: audit?.ipHash,
        signerUserAgent: audit?.userAgent?.slice(0, 300),
      } : signer);
      transaction.update(ref, { signers: updated, ...(updated.every((signer) => signer.signedAt) ? { signedAt } : {}) });
      return true;
    });
  }
  const ref = db.doc(`signatureDocuments/${hash(token)}`);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return false;
    const document = snapshot.data() as StoredDocument;
    if (document.signedAt) return false;
    transaction.update(ref, {
      signerName, signature, signedAt: new Date().toISOString(),
      signedContentHash: createHash("sha256").update(document.content ?? "").digest("hex"),
      signerIpHash: audit?.ipHash, signerUserAgent: audit?.userAgent?.slice(0, 300),
    });
    return true;
  });
}

function chunkToBuffer(value: unknown) {
  if (Buffer.isBuffer(value)) return value;
  if (value && typeof value === "object" && "toBuffer" in value && typeof value.toBuffer === "function") return value.toBuffer();
  throw new Error("Invalid PDF chunk");
}
async function readPdf(documentId: string) {
  const snapshot = await getDatabase().collection(`signatureDocuments/${documentId}/pdfChunks`).orderBy("index").get();
  return Buffer.concat(snapshot.docs.map((item) => chunkToBuffer(item.data().data)));
}

export async function buildPdfForToken(token: string, highlightCurrentSigner = false) {
  const context = await getSignerByToken(token);
  if (!context?.signer || context.document.sourceType !== "pdf") return undefined;
  const pdf = await PDFDocument.load(await readPdf(context.document.id));
  const signerMap = new Map((context.document.signers ?? []).map((signer) => [signer.id, signer]));
  for (const field of context.document.fields ?? []) {
    const page = pdf.getPage(field.page - 1);
    if (!page) continue;
    const signer = signerMap.get(field.signerId), pageWidth = page.getWidth(), pageHeight = page.getHeight();
    const x = field.x * pageWidth, width = field.width * pageWidth, height = field.height * pageHeight;
    const y = pageHeight - ((field.y * pageHeight) + height);
    if (signer?.signature) {
      const png = await pdf.embedPng(signer.signature), ratio = Math.min(width / png.width, height / png.height);
      const drawWidth = png.width * ratio, drawHeight = png.height * ratio;
      page.drawImage(png, { x: x + ((width - drawWidth) / 2), y: y + ((height - drawHeight) / 2), width: drawWidth, height: drawHeight });
    } else if (highlightCurrentSigner && signer?.id === context.signer.id) {
      page.drawRectangle({ x, y, width, height, borderColor: rgb(0.1, 0.55, 0.92), borderWidth: Math.max(1.5, pageWidth / 400), opacity: 0.08, borderOpacity: 0.95 });
    }
  }
  return { bytes: await pdf.save(), fileName: context.document.pdfFileName ?? "signed-document.pdf", complete: (context.document.signers ?? []).every((signer) => signer.signedAt) };
}
