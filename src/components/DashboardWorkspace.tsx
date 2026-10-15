"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/dashboard/actions";
import { DocumentLibrary, type LibraryFilter } from "@/components/DocumentLibrary";
import { CustomerLibrary } from "@/components/CustomerLibrary";
import { DashboardOverview } from "@/components/DashboardOverview";
import { CreateDocumentFlow } from "@/components/CreateDocumentFlow";
import { TwoFactorSettings } from "@/components/TwoFactorSettings";
import type { SecurityActivity } from "@/lib/auth";
import type { Customer } from "@/lib/customers";
import type { SignatureDocument } from "@/lib/documents";

type Tab = "overview" | "create" | "pdf" | "documents" | "customers" | "security";
type Query = { created?: string; duplicated?: string; pdfCreated?: string; pdfError?: string; error?: string; sent?: string; mailError?: string };
const tabs: Array<[Tab, string]> = [["overview", "סקירה"], ["create", "מסמך חדש"], ["pdf", "העלאת PDF"], ["documents", "ספריית מסמכים"], ["customers", "לקוחות"], ["security", "אבטחת חשבון"]];
const MultiSignaturePdfBuilder = dynamic(() => import("@/components/MultiSignaturePdfBuilder").then((module) => module.MultiSignaturePdfBuilder), { ssr: false, loading: () => <p className="p-8 text-silver">טוען את כלי ה־PDF…</p> });
function tabFromHash(): Tab { const value = window.location.hash.replace("#", "") as Tab; return tabs.some(([tab]) => tab === value) ? value : "overview"; }
const mailErrors: Record<string, string> = { cooldown: "המסמך נשלח בחמש הדקות האחרונות. אפשר לשלוח תזכורת בהמשך.", completed: "החתימה כבר הושלמה. אין צורך בתזכורת.", recipient: "יש להשלים כתובת אימייל לחותם לפני השליחה.", config: "שליחת המייל אינה זמינה כרגע. אפשר להעתיק את הקישור האישי.", unavailable: "המסמך אינו זמין לשליחה." };

export function DashboardWorkspace({ documents, customers, siteUrl, twoFactorEnabled, recoveryCodesRemaining, securityActivity, stats, query }: {
  documents: SignatureDocument[]; customers: Customer[]; siteUrl: string; twoFactorEnabled: boolean; recoveryCodesRemaining: number;
  securityActivity: SecurityActivity[]; stats: { active: number; waiting: number; completed: number; signers: number }; query: Query;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("active");
  const [documentId, setDocumentId] = useState(query.created || query.pdfCreated || query.duplicated || "");
  const [customer, setCustomer] = useState<Customer>();
  const [createVersion, setCreateVersion] = useState(0);
  const [creationVisited, setCreationVisited] = useState(false);
  useEffect(() => {
    const sync = () => { const tab = tabFromHash(); setActiveTab(tab); if (tab === "create") setCreationVisited(true); };
    sync(); window.addEventListener("hashchange", sync);
    if (query.pdfCreated) void import("@/lib/pdf-local-draft").then((module) => module.writeLocalPdfDraft(null)).catch(() => {});
    if (query.created) { try { localStorage.removeItem("elia-workspace-draft-v1"); localStorage.removeItem("elia-document-draft:new-document"); } catch { /* Storage is optional. */ } }
    if (query.created || query.pdfCreated) { const url = new URL(window.location.href); url.searchParams.delete("created"); url.searchParams.delete("pdfCreated"); window.history.replaceState(null, "", url); window.scrollTo({ top: 0 }); }
    return () => window.removeEventListener("hashchange", sync);
  }, [query.created, query.pdfCreated]);
  function open(tab: Tab, filter?: LibraryFilter) { if (filter) { setLibraryFilter(filter); setDocumentId(""); } if (tab === "create") setCreationVisited(true); setActiveTab(tab); window.history.replaceState(null, "", `#${tab}`); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function openDocument(id: string) { setDocumentId(id); setLibraryFilter("all"); open("documents"); }
  function createForCustomer(selected: Customer) { setCustomer(selected); setCreateVersion((value) => value + 1); open("create"); }
  return <div className="container-site workspace">
    <header className="rounded-2xl border border-white/15 bg-white/[0.025] p-5 sm:p-7"><div className="flex flex-wrap justify-between gap-5"><div><p className="text-sm font-bold text-electric-bright">אליה שירותי מחשוב · האזור האישי</p><h1 className="mt-2 text-3xl font-black text-white">מסמכים וחתימות</h1><p className="mt-2 text-sm text-silver-muted">מסמכים, לקוחות ומשימות שמחכות לטיפול.</p></div><div className="flex items-start gap-2"><button type="button" onClick={() => open("create")} className="btn btn-primary text-sm">+ מסמך חדש</button><form action={logoutAction}><button className="btn btn-secondary text-sm">יציאה</button></form></div></div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{([["ממתינים לחתימה", stats.waiting, "waiting"], ["הושלמו", stats.completed, "completed"], ["מסמכים פעילים", stats.active, "active"]] as const).map(([label, value, filter]) => <button key={label} type="button" className="rounded-xl border border-white/10 p-3 text-right text-silver hover:border-electric/40" onClick={() => open("documents", filter)}><strong className="block text-2xl text-white">{value}</strong><span className="text-xs">{label}</span></button>)}<button type="button" className="rounded-xl border border-white/10 p-3 text-right text-silver hover:border-electric/40" onClick={() => open("customers")}><strong className="block text-2xl text-white">{customers.length}</strong><span className="text-xs">לקוחות</span></button></div>
    </header>
    {query.created || query.pdfCreated || query.duplicated ? <p role="status" className="mt-4 rounded-xl border border-green-200/20 bg-green-300/10 p-4 text-sm text-green-100">המסמך נשמר. הקישורים האישיים זמינים בספרייה.</p> : null}
    {query.sent ? <p role="status" className="mt-4 rounded-xl border border-green-200/20 bg-green-300/10 p-4 text-sm text-green-100">המייל נשלח. מועד השליחה עודכן במעקב.</p> : null}
    {query.mailError ? <p role="alert" className="mt-4 rounded-xl bg-red-300/10 p-4 text-sm text-red-100">{mailErrors[query.mailError] || "שליחת המייל לא הושלמה. אפשר לנסות שוב או להעתיק את הקישור האישי."}</p> : null}
    <nav className="mt-5 flex flex-wrap gap-2 border-b border-white/10 pb-4" aria-label="ניווט באזור האישי">{tabs.map(([tab, label]) => <button key={tab} type="button" aria-current={activeTab === tab ? "page" : undefined} onClick={() => open(tab)} className={`rounded-xl px-4 py-3 text-sm font-bold ${activeTab === tab ? "bg-electric text-ink" : "text-silver hover:bg-white/5"}`}>{label}</button>)}<Link className="mr-auto px-3 py-3 text-sm text-silver underline" href="/work-agreement">מסמכים ציבוריים</Link></nav>
    <div className="mt-6">
      {activeTab === "overview" ? <DashboardOverview documents={documents} onOpenDocument={openDocument} onCreate={() => open("create")} /> : null}
      {creationVisited ? <div hidden={activeTab !== "create"}><CreateDocumentFlow key={createVersion} customers={customers} customer={customer} error={query.error} /></div> : null}
      {activeTab === "pdf" ? <section className="glass rounded-2xl p-4 sm:p-7"><h2 className="mb-5 text-2xl font-bold text-white">העלאת PDF לחתימה</h2>{query.pdfError ? <p role="alert" className="mb-4 rounded-xl bg-red-300/10 p-4 text-sm text-red-100">לא ניתן לשמור את ה־PDF. בדקו את פרטי החותמים ואת מיקומי החתימות.</p> : null}<MultiSignaturePdfBuilder customers={customers} /></section> : null}
      {activeTab === "documents" ? <DocumentLibrary key={`${libraryFilter}-${documentId}`} documents={documents} siteUrl={siteUrl} requestedFilter={libraryFilter} initialDocumentId={documentId} /> : null}
      {activeTab === "customers" ? <CustomerLibrary customers={customers} documents={documents} onCreateDocument={createForCustomer} onOpenDocument={openDocument} /> : null}
      {activeTab === "security" ? <SecurityPanel twoFactorEnabled={twoFactorEnabled} recoveryCodesRemaining={recoveryCodesRemaining} securityActivity={securityActivity} /> : null}
    </div>
  </div>;
}

function SecurityPanel({ twoFactorEnabled, recoveryCodesRemaining, securityActivity }: { twoFactorEnabled: boolean; recoveryCodesRemaining: number; securityActivity: SecurityActivity[] }) {
  return <section><h2 className="mb-5 text-2xl font-bold text-white">אבטחת החשבון</h2><TwoFactorSettings initialEnabled={twoFactorEnabled} initialRecoveryCodesRemaining={recoveryCodesRemaining} /><div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="glass rounded-2xl p-5"><h3 className="font-bold text-white">הכניסה באמצעות Google</h3><p className="mt-2 text-sm leading-relaxed text-silver-muted">שינוי הסיסמה מתבצע בחשבון Google. האימות הדו־שלבי כאן מוסיף שכבת הגנה נוספת.</p><a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="btn btn-secondary mt-4 text-sm">אבטחת חשבון Google</a></div><div className="glass rounded-2xl p-5"><h3 className="font-bold text-white">פעילות כניסה אחרונה</h3><div className="mt-3 space-y-2">{securityActivity.length ? securityActivity.map((item) => <div key={item.id} className="rounded-xl border border-white/10 p-3"><p className="text-sm font-bold text-silver">כניסה מאושרת · {new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" }).format(new Date(item.createdAt))}</p><p className="mt-1 truncate text-xs text-silver-muted" title={item.device}>{item.device}</p><p className="mt-1 text-xs text-silver-muted">מזהה רשת: {item.ipHint}</p></div>) : <p className="text-sm text-silver-muted">פעילות חדשה תופיע לאחר הכניסה הבאה.</p>}</div></div></div></section>;
}
