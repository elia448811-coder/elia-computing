"use client";
import { useMemo } from "react";
import { DocumentEmailButton } from "@/components/DocumentEmailButton";
import { documentState, formatDate, lastSentAt, signatureProgress } from "@/lib/document-status";
import type { SignatureDocument } from "@/lib/documents";

export function DashboardOverview({ documents, onOpenDocument, onCreate }: { documents: SignatureDocument[]; onOpenDocument: (id: string) => void; onCreate: () => void }) {
  const waiting = useMemo(() => documents.filter((document) => documentState(document) === "waiting").sort((left, right) => left.createdAt.localeCompare(right.createdAt)), [documents]);
  const recent = useMemo(() => documents.flatMap((document) => [
    { key: `${document.id}-created`, at: document.createdAt, text: "מסמך נוצר", document },
    ...(document.signers?.length ? document.signers.flatMap((signer) => [
      ...(signer.lastSentAt ? [{ key: `${document.id}-${signer.id}-sent`, at: signer.lastSentAt, text: `נשלח אל ${signer.name}`, document }] : []),
      ...(signer.firstViewedAt ? [{ key: `${document.id}-${signer.id}-viewed`, at: signer.firstViewedAt, text: `נפתח הקישור של ${signer.name}`, document }] : []),
      ...(signer.signedAt ? [{ key: `${document.id}-${signer.id}-signed`, at: signer.signedAt, text: `${signer.name} חתם/ה`, document }] : []),
    ]) : [
      ...(document.lastSentAt ? [{ key: `${document.id}-sent`, at: document.lastSentAt, text: "מסמך נשלח", document }] : []),
      ...(document.firstViewedAt ? [{ key: `${document.id}-viewed`, at: document.firstViewedAt, text: "קישור נפתח", document }] : []),
      ...(document.signedAt ? [{ key: `${document.id}-signed`, at: document.signedAt, text: "המסמך נחתם", document }] : []),
    ]),
  ]).sort((left, right) => right.at.localeCompare(left.at)).slice(0, 8), [documents]);
  return <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
    <section className="glass rounded-2xl p-4 sm:p-6" aria-labelledby="tasks-title"><div className="mb-5 flex flex-wrap justify-between gap-2"><div><p className="text-sm font-bold text-electric-bright">לטיפול עכשיו</p><h2 id="tasks-title" className="mt-1 text-2xl font-bold text-white">ממתינים לחתימה</h2></div><span className="text-sm text-silver">{waiting.length} מסמכים</span></div><div className="space-y-3">{waiting.length ? waiting.slice(0, 8).map((document) => {
      const progress = signatureProgress(document), next = document.signers?.find((signer) => !signer.signedAt && signer.email), sent = lastSentAt(document);
      const canEmail = next || !document.signers?.length && document.recipientEmail;
      return <article key={document.id} className="rounded-xl border border-white/10 p-4"><div className="flex flex-wrap justify-between gap-2"><button type="button" className="text-right font-bold text-white" onClick={() => onOpenDocument(document.id)}>{document.title}</button><span className="text-xs text-electric-bright">{progress.signed} מתוך {progress.total} חתמו</span></div><p className="mt-2 text-sm text-silver">ממתינים: {document.signers?.filter((signer) => !signer.signedAt).map((signer) => signer.name).join(", ") || document.recipientName || "הלקוח"}</p><p className="mt-1 text-xs text-silver-muted">נוצר {formatDate(document.createdAt)} · {sent ? `שליחה אחרונה ${formatDate(sent)}` : "אין שליחה מתועדת"}</p><div className="mt-4 flex flex-wrap gap-3">{canEmail ? <DocumentEmailButton documentId={document.id} signerId={next?.id} reminder={Boolean(next?.lastSentAt || document.lastSentAt)} /> : null}<button type="button" className="px-2 py-2 text-sm text-silver underline" onClick={() => onOpenDocument(document.id)}>פתיחת המסמך והמעקב</button></div></article>;
    }) : <div className="rounded-xl border border-dashed border-white/20 p-8 text-center"><p className="text-silver">אין מסמכים שממתינים לחתימה.</p><button type="button" className="btn btn-primary mt-4" onClick={onCreate}>יצירת מסמך חדש</button></div>}</div></section>
    <section className="glass rounded-2xl p-4 sm:p-6" aria-labelledby="activity-title"><h2 id="activity-title" className="text-xl font-bold text-white">פעילות אחרונה</h2><ol className="mt-5 space-y-4">{recent.map((event) => <li key={event.key} className="border-r-2 border-electric/30 pr-3"><button type="button" className="text-right" onClick={() => onOpenDocument(event.document.id)}><span className="block text-sm font-bold text-white">{event.text}</span><span className="mt-1 block text-sm text-silver">{event.document.title}</span><time dateTime={event.at} className="mt-1 block text-xs text-silver-muted">{formatDate(event.at, true)}</time></button></li>)}</ol>{!recent.length ? <p className="mt-4 text-sm text-silver-muted">פעילות המסמכים תופיע כאן.</p> : null}</section>
  </div>;
}
