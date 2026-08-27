"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { archiveDocumentAction, duplicateDocumentAction, sendDocumentEmailAction } from "@/app/dashboard/actions";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import type { SignatureDocument } from "@/lib/documents";

type Filter = "active" | "waiting" | "completed" | "archived" | "all";

function documentState(document: SignatureDocument) {
  if (document.archivedAt) return "archived";
  const complete = document.sourceType === "pdf"
    ? Boolean(document.signers?.length && document.signers.every((signer) => signer.signedAt))
    : Boolean(document.signedAt);
  return complete ? "completed" : "waiting";
}

export function DocumentLibrary({ documents, siteUrl }: { documents: SignatureDocument[]; siteUrl: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => documents.filter((document) => {
    const state = documentState(document);
    const matchesFilter = filter === "all" || (filter === "active" ? state !== "archived" : state === filter);
    const text = `${document.title} ${document.recipientName ?? ""} ${document.recipientEmail ?? ""}`.toLocaleLowerCase("he");
    return matchesFilter && text.includes(query.trim().toLocaleLowerCase("he"));
  }), [documents, filter, query]);

  const filters: Array<[Filter, string]> = [["active", "פעילים"], ["waiting", "ממתינים"], ["completed", "הושלמו"], ["archived", "ארכיון"], ["all", "הכול"]];

  return (
    <section id="documents" className="glass rounded-[var(--radius-xl)] p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-bold text-electric-bright">מרכז השליטה</p><h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">ספריית המסמכים</h2><p className="mt-2 text-sm text-silver-muted">איתור, מעקב, עריכה, שכפול, שיתוף והורדה במקום אחד.</p></div>
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-silver">{documents.length} מסמכים</span>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <label className="relative block"><span className="sr-only">חיפוש מסמכים</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש לפי שם מסמך, לקוח או אימייל..." className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-silver-muted" /></label>
        <div className="flex flex-wrap rounded-xl border border-white/10 bg-black/10 p-1">
          {filters.map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-xs font-bold ${filter === value ? "bg-electric text-slate-950" : "text-silver hover:text-white"}`}>{label}</button>)}
        </div>
        <div className="flex rounded-xl border border-white/10 bg-black/10 p-1" aria-label="צורת תצוגה">
          <button type="button" onClick={() => setLayout("grid")} className={`rounded-lg px-3 py-2 text-xs font-bold ${layout === "grid" ? "bg-white/10 text-white" : "text-silver"}`}>כרטיסים</button>
          <button type="button" onClick={() => setLayout("list")} className={`rounded-lg px-3 py-2 text-xs font-bold ${layout === "list" ? "bg-white/10 text-white" : "text-silver"}`}>רשימה</button>
        </div>
      </div>

      <div className={`mt-6 grid gap-4 ${layout === "grid" ? "xl:grid-cols-2" : "grid-cols-1"}`}>
        {filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-silver-muted xl:col-span-2">לא נמצאו מסמכים מתאימים. נסו חיפוש או מסנן אחר.</div> : filtered.map((document) => {
          const isPdf = document.sourceType === "pdf" && Boolean(document.signers);
          const state = documentState(document);
          const complete = state === "completed";
          const legacyUrl = document.token ? `${siteUrl}/sign/${document.token}` : "";
          const canEdit = !isPdf && !document.signedAt;
          return (
            <article key={document.id} className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-electric/25 hover:bg-white/[0.05]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><p className="text-xs font-bold text-electric-bright">{isPdf ? `PDF · ${document.signers?.length ?? 0} חותמים` : documentTemplatesLabel(document.template)}</p><h3 className="mt-1 truncate text-lg font-bold text-white">{document.title}</h3><p className="mt-1 text-sm text-silver-muted">{isPdf ? document.pdfFileName : `לקוח: ${document.recipientName || "לא צוין"}`}</p></div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${state === "archived" ? "bg-slate-400/10 text-slate-300" : complete ? "bg-green-400/10 text-green-200" : "bg-amber-400/10 text-amber-200"}`}>{state === "archived" ? "בארכיון" : complete ? "הושלם" : "ממתין לחתימה"}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-y border-white/8 py-3 text-xs text-silver-muted"><span>נוצר: {new Intl.DateTimeFormat("he-IL").format(new Date(document.createdAt))}</span>{document.updatedAt ? <span>עודכן: {new Intl.DateTimeFormat("he-IL").format(new Date(document.updatedAt))}</span> : null}{isPdf ? <span>{document.pdfPageCount ?? 0} עמודים</span> : null}</div>

              {isPdf ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{document.signers!.map((signer) => { const url = `${siteUrl}/sign/${signer.token}`; return <div key={signer.id} className="rounded-xl border border-white/8 bg-black/10 p-3"><div className="mb-2 flex items-center justify-between gap-2"><p className="truncate text-sm font-bold text-white">{signer.label}: {signer.name}</p><span className={`text-xs ${signer.signedAt ? "text-green-200" : "text-amber-200"}`}>{signer.signedAt ? "נחתם" : "ממתין"}</span></div><div className="flex flex-wrap gap-2"><CopyLinkButton url={url} /><Link href={`/sign/${signer.token}`} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-silver">פתיחה</Link>{signer.email && !signer.signedAt ? <form action={sendDocumentEmailAction.bind(null, document.id, signer.id)}><button type="submit" className="rounded-full border border-violet-300/25 px-3 py-1.5 text-xs font-bold text-violet-100">שליחה במייל</button></form> : null}</div></div>; })}</div> : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {!isPdf && legacyUrl ? <><CopyLinkButton url={legacyUrl} /><Link href={`/sign/${document.token}`} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-silver">צפייה</Link>{document.recipientEmail && !document.signedAt ? <form action={sendDocumentEmailAction.bind(null, document.id, "")}><button type="submit" className="rounded-full border border-violet-300/25 px-3 py-1.5 text-xs font-bold text-violet-100">שליחה במייל</button></form> : null}</> : null}
                {canEdit ? <Link href={`/dashboard/documents/${document.id}/edit`} className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1.5 text-xs font-bold text-sky-100">עריכה</Link> : null}
                {!isPdf ? <form action={duplicateDocumentAction.bind(null, document.id)}><button className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-silver" type="submit">שכפול</button></form> : null}
                {isPdf && complete ? <a href={`/api/sign/${document.signers![0].token}/pdf?download=1`} className="rounded-full border border-green-300/25 bg-green-300/10 px-3 py-1.5 text-xs font-bold text-green-100">הורדת PDF חתום</a> : null}
                <form action={archiveDocumentAction.bind(null, document.id)} className="mr-auto"><input type="hidden" name="archived" value={state === "archived" ? "false" : "true"} /><button className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-silver-muted hover:text-white" type="submit">{state === "archived" ? "החזרה לפעילים" : "העברה לארכיון"}</button></form>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function documentTemplatesLabel(template?: string) {
  const labels: Record<string, string> = { workAgreement: "חוזה עבודה", termsOfUse: "תנאי שימוש", warrantyPolicy: "מדיניות אחריות", proposal: "הצעת מחיר", cancellation: "ביטול עסקה", blank: "מסמך מותאם" };
  return labels[template ?? "blank"] ?? "מסמך מותאם";
}
