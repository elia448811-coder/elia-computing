import type { Customer } from "@/lib/customers";
import type { SignatureDocument } from "@/lib/documents";

export const MAX_SIGNERS = 6;
export function signatureProgress(document: SignatureDocument) {
  const total = document.signers?.length || 1;
  const signed = document.signers?.length ? document.signers.filter((signer) => signer.signedAt).length : document.signedAt ? 1 : 0;
  return { total, signed, complete: signed === total };
}
export function documentState(document: SignatureDocument) {
  return document.archivedAt ? "archived" : signatureProgress(document).complete ? "completed" : "waiting";
}
export function documentSearchText(document: SignatureDocument) {
  return [document.title, document.recipientName, document.recipientEmail, document.pdfFileName,
    ...(document.signers ?? []).flatMap((signer) => [signer.name, signer.email, signer.identityNumber, signer.phone])].join(" ").toLocaleLowerCase("he");
}
export function belongsToCustomer(document: SignatureDocument, customer: Customer) {
  const identities = new Set([customer.identityNumber, ...(customer.previousIdentityNumbers ?? [])]);
  if (document.signers?.length) return document.signers.some((signer) => identities.has(signer.identityNumber));
  return Boolean(customer.email && document.recipientEmail?.toLowerCase() === customer.email.toLowerCase());
}
export function lastSentAt(document: SignatureDocument) {
  return [document.lastSentAt, ...(document.signers ?? []).map((signer) => signer.lastSentAt)].filter((value): value is string => Boolean(value)).sort().at(-1);
}
export function formatDate(value?: string, time = false) {
  if (!value) return "טרם תועד";
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", ...(time ? { timeStyle: "short" as const } : {}), timeZone: "Asia/Jerusalem" }).format(new Date(value));
}
