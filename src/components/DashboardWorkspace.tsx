"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { clearSubmittedText } from "@/lib/draft-submission";
import { logoutAction } from "@/app/dashboard/actions";
import { DocumentLibrary, type LibraryFilter } from "@/components/DocumentLibrary";
import { CustomerLibrary } from "@/components/CustomerLibrary";
import { PasswordSettings } from "@/components/PasswordSettings";
import { QuotesWorkspace } from "@/components/QuotesWorkspace";
import { DashboardOverview } from "@/components/DashboardOverview";
import { CreateDocumentFlow } from "@/components/CreateDocumentFlow";
import { TwoFactorSettings } from "@/components/TwoFactorSettings";
import type { SecurityActivity } from "@/lib/auth";
import type { Customer } from "@/lib/customers";
import type { SignatureDocument } from "@/lib/documents";

type Tab = "quotes" | "overview" | "create" | "pdf" | "documents" | "customers" | "security";
type Query = { draftReceipt?: string; created?: string; duplicated?: string; pdfCreated?: string; pdfError?: string; error?: string; sent?: string; mailError?: string };
const tabs: Array<[Tab, string]> = [["quotes", "הצעות מחיר"], ["overview", "סקירה"], ["create", "מסמך חדש"], ["pdf", "העלאת PDF"], ["documents", "ספריית מסמכים"], ["customers", "לקוחות"], ["security", "אבטחת חשבון"]];

function WorkspaceIcon({ name }: { name: Tab | "logout" | "external" }) {
  const paths: Record<Tab | "logout" | "external", string> = {
    quotes: "M7 3h8l4 4v14H5V3h2m8 0v5h4M8 12h8M8 16h5",
    overview: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    create: "M14 3H5v18h14V8m-5-5v5h5M9 14h6M12 11v6",
    pdf: "M5 16v5h14v-5M12 3v13m-5-5 5 5 5-5",
    documents: "M3 7h7l2-3h9v17H3V7m0 4h18",
    customers: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m7-7a4 4 0 0 1 0 7m3 4a4 4 0 0 1 3 4v2",
    security: "M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4m-4 9 3 3 5-6",
    logout: "M9 3H4v18h5m5-14 5 5-5 5m-6-5h11",
    external: "M14 3h7v7m0-7L10 14M10 3H3v18h18v-7",
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
const MultiSignaturePdfBuilder = dynamic(() => import("@/components/MultiSignaturePdfBuilder").then((module) => module.MultiSignaturePdfBuilder), { ssr: false, loading: () => <p className="p-8 text-silver">טוען את כלי ה־PDF…</p> });
function tabFromHash(): Tab { const value = window.location.hash.replace("#", "") as Tab; return tabs.some(([tab]) => tab === value) ? value : "quotes"; }
const mailErrors: Record<string, string> = { cooldown: "המסמך נשלח בחמש הדקות האחרונות. אפשר לשלוח תזכורת בהמשך.", completed: "החתימה כבר הושלמה. אין צורך בתזכורת.", recipient: "יש להשלים כתובת אימייל לחותם לפני השליחה.", config: "שליחת המייל אינה זמינה כרגע. אפשר להעתיק את הקישור האישי.", unavailable: "המסמך אינו זמין לשליחה." };

export function DashboardWorkspace({ documents, customers, siteUrl, twoFactorEnabled, recoveryCodesRemaining, securityActivity, stats, query }: {
  documents: SignatureDocument[]; customers: Customer[]; siteUrl: string; twoFactorEnabled: boolean; recoveryCodesRemaining: number;
  securityActivity: SecurityActivity[]; stats: { active: number; waiting: number; completed: number; signers: number }; query: Query;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("quotes");
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("active");
  const [documentId, setDocumentId] = useState(query.created || query.pdfCreated || query.duplicated || "");
  const [customer, setCustomer] = useState<Customer>();
  const [createVersion, setCreateVersion] = useState(0);
  const [creationVisited, setCreationVisited] = useState(false);
  useEffect(() => {
    const sync = () => { const tab = tabFromHash(); setActiveTab(tab); if (tab === "create") setCreationVisited(true); };
    sync(); window.addEventListener("hashchange", sync);
    if (query.pdfCreated && query.draftReceipt) void import("@/lib/pdf-local-draft").then((module) => module.clearSubmittedPdf(query.draftReceipt)).catch(() => {});
    if (query.created) clearSubmittedText("elia-workspace-draft-v1", query.draftReceipt);
    if (query.created || query.pdfCreated) { const url = new URL(window.location.href); url.searchParams.delete("created"); url.searchParams.delete("pdfCreated"); url.searchParams.delete("draftReceipt"); window.history.replaceState(null, "", url); window.scrollTo({ top: 0 }); }
    return () => window.removeEventListener("hashchange", sync);
  }, [query.created, query.pdfCreated, query.draftReceipt]);
  function open(tab: Tab, filter?: LibraryFilter) { if (filter) { setLibraryFilter(filter); setDocumentId(""); } if (tab === "create") setCreationVisited(true); setActiveTab(tab); window.history.replaceState(null, "", `#${tab}`); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function openDocument(id: string) { setDocumentId(id); setLibraryFilter("all"); open("documents"); }
  function createForCustomer(selected: Customer) { setCustomer(selected); setCreateVersion((value) => value + 1); open("create"); }
  return <div className="container-site workspace workspace-shell">
    <aside className="workspace-sidebar no-print">
      <div className="workspace-sidebar-heading"><span className="workspace-brand-symbol" aria-hidden="true">E</span><div><strong>ניהול העסק</strong><span>אליה שירותי מחשוב</span></div></div>
      <a href="#workspace-content" className="sr-only focus:not-sr-only" onClick={(event) => { event.preventDefault(); document.getElementById("workspace-content")?.focus(); }}>דילוג לסביבת העבודה</a>
      <nav className="workspace-navigation" aria-label="ניווט באזור האישי">
        {tabs.map(([tab, label]) => <button key={tab} type="button" aria-current={activeTab === tab ? "page" : undefined} onClick={() => open(tab)} className={`workspace-nav-item ${activeTab === tab ? "workspace-nav-active" : ""}`}><WorkspaceIcon name={tab} /><span>{label}</span>{tab === "documents" && stats.waiting > 0 ? <span className="workspace-nav-count" aria-label={`${stats.waiting} ממתינים לחתימה`}>{stats.waiting}</span> : null}</button>)}
      </nav>
      <div className="workspace-sidebar-footer"><Link href="/work-agreement"><WorkspaceIcon name="external" /><span>מסמכים ציבוריים</span></Link><form action={logoutAction}><button type="submit"><WorkspaceIcon name="logout" /><span>יציאה מהחשבון</span></button></form></div>
    </aside>
    <div className="workspace-main" id="workspace-content" tabIndex={-1}>
    <header className="workspace-topbar no-print"><div><p>סביבת העבודה שלך</p><h1>{tabs.find(([tab]) => tab === activeTab)?.[1]}</h1></div><div className="workspace-topbar-actions">{activeTab !== "quotes" && activeTab !== "create" ? <button type="button" onClick={() => open("create")} className="btn btn-primary text-sm"><span aria-hidden="true">+</span> מסמך חדש</button> : null}<span className="workspace-account-avatar" title="אליה שירותי מחשוב" aria-label="האזור האישי של אליה">א</span></div></header>
    <div hidden={activeTab === "quotes"} className="workspace-summary no-print">{([["ממתינים לחתימה", stats.waiting, "waiting"], ["הושלמו", stats.completed, "completed"], ["מסמכים פעילים", stats.active, "active"]] as const).map(([label, value, filter]) => <button key={label} type="button" onClick={() => open("documents", filter)}><span>{label}</span><strong>{value}</strong></button>)}<button type="button" onClick={() => open("customers")}><span>לקוחות</span><strong>{customers.length}</strong></button></div>
    {query.created || query.pdfCreated || query.duplicated ? <p role="status" className="mt-4 rounded-xl border border-green-200/20 bg-green-300/10 p-4 text-sm text-green-100">המסמך נשמר. הקישורים האישיים זמינים בספרייה.</p> : null}
    {query.sent ? <p role="status" className="mt-4 rounded-xl border border-green-200/20 bg-green-300/10 p-4 text-sm text-green-100">המייל נשלח. מועד השליחה עודכן במעקב.</p> : null}
    {query.mailError ? <p role="alert" className="mt-4 rounded-xl bg-red-300/10 p-4 text-sm text-red-100">{mailErrors[query.mailError] || "שליחת המייל לא הושלמה. אפשר לנסות שוב או להעתיק את הקישור האישי."}</p> : null}
    <div className="workspace-content">
      <div hidden={activeTab !== "quotes"}><QuotesWorkspace customers={customers} /></div>
      {activeTab === "overview" ? <DashboardOverview documents={documents} onOpenDocument={openDocument} onCreate={() => open("create")} /> : null}
      {creationVisited ? <div hidden={activeTab !== "create"}><CreateDocumentFlow key={createVersion} customers={customers} customer={customer} error={query.error} /></div> : null}
      {activeTab === "pdf" ? <section className="glass rounded-2xl p-4 sm:p-7"><h2 className="mb-5 text-2xl font-bold text-white">העלאת PDF לחתימה</h2>{query.pdfError ? <p role="alert" className="mb-4 rounded-xl bg-red-300/10 p-4 text-sm text-red-100">לא ניתן לשמור את ה־PDF. בדקו את פרטי החותמים ואת מיקומי החתימות.</p> : null}<MultiSignaturePdfBuilder customers={customers} /></section> : null}
      {activeTab === "documents" ? <DocumentLibrary key={`${libraryFilter}-${documentId}`} documents={documents} siteUrl={siteUrl} requestedFilter={libraryFilter} initialDocumentId={documentId} /> : null}
      {activeTab === "customers" ? <CustomerLibrary customers={customers} documents={documents} onCreateDocument={createForCustomer} onOpenDocument={openDocument} /> : null}
      {activeTab === "security" ? <SecurityPanel twoFactorEnabled={twoFactorEnabled} recoveryCodesRemaining={recoveryCodesRemaining} securityActivity={securityActivity} /> : null}
    </div>
    </div>
  </div>;
}

function SecurityPanel({ twoFactorEnabled, recoveryCodesRemaining, securityActivity }: { twoFactorEnabled: boolean; recoveryCodesRemaining: number; securityActivity: SecurityActivity[] }) {
  return <section><h2 className="mb-5 text-2xl font-bold text-white">אבטחת החשבון</h2><TwoFactorSettings initialEnabled={twoFactorEnabled} initialRecoveryCodesRemaining={recoveryCodesRemaining} /><PasswordSettings /><div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="glass rounded-2xl p-5"><h3 className="font-bold text-white">הכניסה באמצעות Google</h3><p className="mt-2 text-sm leading-relaxed text-silver-muted">אפשר להיכנס גם באמצעות Google וגם בשם משתמש וסיסמה. האימות הדו־שלבי חל על שתי דרכי הכניסה.</p><a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="btn btn-secondary mt-4 text-sm">אבטחת חשבון Google</a></div><div className="glass rounded-2xl p-5"><h3 className="font-bold text-white">פעילות כניסה אחרונה</h3><div className="mt-3 space-y-2">{securityActivity.length ? securityActivity.map((item) => <div key={item.id} className="rounded-xl border border-white/10 p-3"><p className="text-sm font-bold text-silver">כניסה מאושרת · {new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" }).format(new Date(item.createdAt))}</p><p className="mt-1 truncate text-xs text-silver-muted" title={item.device}>{item.device}</p><p className="mt-1 text-xs text-silver-muted">מזהה רשת: {item.ipHint}</p></div>) : <p className="text-sm text-silver-muted">פעילות חדשה תופיע לאחר הכניסה הבאה.</p>}</div></div></div></section>;
}
