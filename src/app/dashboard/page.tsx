import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DocumentLibrary } from "@/components/DocumentLibrary";
import { MultiSignaturePdfBuilder } from "@/components/MultiSignaturePdfBuilder";
import { RichDocumentEditor } from "@/components/RichDocumentEditor";
import { siteConfig } from "@/data/site";
import { isAuthenticated } from "@/lib/auth";
import { listDocuments } from "@/lib/documents";
import { changePasswordAction, createDocumentAction, createPdfDocumentAction, logoutAction } from "./actions";

export const metadata: Metadata = { title: "מרכז ניהול חוזים", robots: { index: false } };

type DashboardQuery = {
  created?: string; duplicated?: string; pdfCreated?: string; pdfError?: string;
  passwordChanged?: string; passwordError?: string; error?: string; sent?: string; mailError?: string;
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<DashboardQuery> }) {
  if (!(await isAuthenticated())) redirect("/login");
  const [query, documents] = await Promise.all([searchParams, listDocuments()]);
  const activeDocuments = documents.filter((document) => !document.archivedAt);
  const completed = activeDocuments.filter((document) => document.sourceType === "pdf" ? document.signers?.every((signer) => signer.signedAt) : document.signedAt).length;
  const waiting = activeDocuments.length - completed;
  const totalSigners = activeDocuments.reduce((sum, document) => sum + (document.signers?.length ?? (document.recipientName ? 1 : 0)), 0);
  const libraryDocuments = documents.map((document) => ({
    ...document, signature: undefined, signerIpHash: undefined, signerUserAgent: undefined,
    signers: document.signers?.map((signer) => ({ ...signer, signature: undefined, signerIpHash: undefined, signerUserAgent: undefined })),
  }));

  return (
    <main id="main" className="min-h-screen px-4 pb-20 pt-24 sm:pt-28">
      <div className="container-site">
        <header className="relative overflow-hidden rounded-[var(--radius-xl)] border border-electric/15 bg-[linear-gradient(135deg,rgba(14,165,233,.14),rgba(15,23,42,.82)_52%,rgba(139,92,246,.09))] p-6 shadow-2xl sm:p-9">
          <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-electric/10 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div><div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-full border border-green-300/20 bg-green-300/10 px-3 py-1 text-xs font-bold text-green-100">● מערכת פעילה</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-silver">אזור ניהול מאובטח</span></div><h1 className="text-3xl font-black text-white sm:text-5xl">מרכז ניהול חוזים</h1><p className="mt-3 max-w-2xl text-base leading-relaxed text-silver-muted">צרו מסמכים מקצועיים, העלו PDF, מקמו חתימות, עקבו אחר כל חותם ונהלו את כל מחזור החיים של ההסכם.</p></div>
            <div className="flex flex-wrap gap-2"><a href="#create" className="btn btn-primary text-sm">+ מסמך חדש</a><form action={logoutAction}><button className="btn btn-secondary text-sm">יציאה</button></form></div>
          </div>
          <div className="relative mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="מסמכים פעילים" value={activeDocuments.length} tone="sky" />
            <StatCard label="ממתינים לחתימה" value={waiting} tone="amber" />
            <StatCard label="הושלמו" value={completed} tone="green" />
            <StatCard label="חותמים מנוהלים" value={totalSigners} tone="violet" />
          </div>
        </header>

        {(query.created || query.pdfCreated || query.duplicated) ? <div className="mt-5 rounded-2xl border border-green-400/25 bg-green-400/10 p-4 text-green-100">הפעולה הושלמה בהצלחה. המסמך מופיע כעת בספרייה וניתן לשתף את קישור החתימה.</div> : null}
        {query.sent ? <div className="mt-5 rounded-2xl border border-green-400/25 bg-green-400/10 p-4 text-green-100">המסמך נשלח בהצלחה לכתובת האימייל של החותם.</div> : null}
        {query.mailError ? <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-red-100">לא ניתן לשלוח את המייל כרגע. ודאו שהוגדרה כתובת לחותם וששירות המייל פעיל.</div> : null}

        <nav className="sticky top-20 z-30 mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-[#07111f]/90 p-2 shadow-xl backdrop-blur-xl" aria-label="ניווט באזור הניהול">
          <a href="#create" className="whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold text-white hover:bg-white/5">יצירת מסמך</a>
          <a href="#documents" className="whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold text-silver hover:bg-white/5 hover:text-white">ספריית מסמכים</a>
          <a href="#security" className="whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold text-silver hover:bg-white/5 hover:text-white">אבטחת חשבון</a>
          <Link href="/work-agreement" className="mr-auto whitespace-nowrap rounded-xl px-4 py-2 text-sm text-electric-bright hover:bg-electric/10">צפייה במסמכים הציבוריים</Link>
        </nav>

        <section id="create" className="mt-7">
          <div className="mb-5"><p className="text-sm font-bold text-electric-bright">מתחילים כאן</p><h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">איך תרצו ליצור את המסמך?</h2></div>
          <div className="grid items-start gap-5">
            <details open className="group glass rounded-[var(--radius-xl)] p-5 sm:p-7">
              <summary className="cursor-pointer list-none"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-400/15 text-xl font-black text-sky-200">Aa</span><div><p className="font-bold text-white">מסמך חדש בעורך החכם</p><p className="mt-1 text-sm leading-relaxed text-silver-muted">תבניות חוזה, אחריות, הצעת מחיר ותנאי שימוש עם עריכה מלאה ותצוגה מקדימה.</p></div><span className="mr-auto text-silver-muted group-open:rotate-180">⌄</span></div></summary>
              <form action={createDocumentAction} className="mt-7 space-y-5 border-t border-white/10 pt-6">
                {query.error ? <p className="rounded-xl bg-red-400/10 p-3 text-sm text-red-200">יש להשלים שם לקוח, כותרת ותוכן.</p> : null}
                <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-silver">שם הלקוח / החותם<input name="recipientName" required placeholder="ישראל ישראלי" className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" /></label><label className="block text-sm font-semibold text-silver">אימייל<input name="recipientEmail" type="email" placeholder="name@example.com" className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" /></label></div>
                <RichDocumentEditor />
                <button className="btn btn-primary w-full" type="submit">שמירה ויצירת קישור לחתימה</button>
              </form>
            </details>

            <details className="group glass rounded-[var(--radius-xl)] p-5 sm:p-7">
              <summary className="cursor-pointer list-none"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-400/15 text-xl font-black text-violet-200">PDF</span><div><p className="font-bold text-white">העלאת PDF והוספת חתימות</p><p className="mt-1 text-sm leading-relaxed text-silver-muted">גררו קובץ קיים, הוסיפו 2–4 חותמים וסמנו לכל אחד מקום במסמך.</p></div><span className="mr-auto text-silver-muted group-open:rotate-180">⌄</span></div></summary>
              <div className="mt-7 border-t border-white/10 pt-6">
                {query.pdfError ? <p className="mb-5 rounded-xl bg-red-400/10 p-4 text-sm text-red-200">{query.pdfError === "size" ? "הקובץ גדול מדי. ניתן להעלות PDF עד 4MB." : query.pdfError === "fields" ? "יש לסמן מקום חתימה לכל החותמים." : "לא הצלחנו לקרוא את הקובץ. ודאו שמדובר ב-PDF תקין שאינו מוגן בסיסמה."}</p> : null}
                <form action={createPdfDocumentAction}><MultiSignaturePdfBuilder /></form>
              </div>
            </details>
          </div>
        </section>

        <div className="mt-7"><DocumentLibrary documents={libraryDocuments} siteUrl={siteConfig.url} /></div>

        <details id="security" className="glass mt-7 rounded-[var(--radius-xl)] p-6 sm:p-8">
          <summary className="cursor-pointer text-xl font-bold text-white">אבטחת החשבון ושינוי סיסמה</summary>
          <div className="mt-6 grid gap-7 border-t border-white/10 pt-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <div><p className="text-sm font-bold text-electric-bright">גישה מוגנת</p><h2 className="mt-1 text-2xl font-bold text-white">שינוי סיסמה</h2><p className="mt-3 text-sm leading-relaxed text-silver-muted">לאחר השינוי כל החיבורים הישנים מתבטלים מיד.</p></div>
            <form action={changePasswordAction} className="grid gap-4 sm:grid-cols-2">
              {query.passwordChanged ? <p className="rounded-xl bg-green-400/10 p-3 text-sm text-green-200 sm:col-span-2">הסיסמה שונתה בהצלחה.</p> : null}
              {query.passwordError ? <p className="rounded-xl bg-red-400/10 p-3 text-sm text-red-200 sm:col-span-2">{query.passwordError === "current" ? "הסיסמה הנוכחית אינה נכונה." : query.passwordError === "mismatch" ? "הסיסמאות החדשות אינן תואמות." : "יש לבחור לפחות 12 תווים הכוללים אות גדולה, אות קטנה, מספר וסימן מיוחד."}</p> : null}
              <label className="block text-sm font-semibold text-silver sm:col-span-2">סיסמה נוכחית<input name="currentPassword" type="password" autoComplete="current-password" required className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" /></label>
              <label className="block text-sm font-semibold text-silver">סיסמה חדשה<input name="newPassword" type="password" autoComplete="new-password" minLength={12} required className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" /></label>
              <label className="block text-sm font-semibold text-silver">אימות סיסמה<input name="confirmation" type="password" autoComplete="new-password" minLength={12} required className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" /></label>
              <button className="btn btn-secondary sm:col-span-2" type="submit">עדכון הסיסמה</button>
            </form>
          </div>
        </details>
      </div>
    </main>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "sky" | "amber" | "green" | "violet" }) {
  const colors = { sky: "border-sky-300/15 bg-sky-300/[0.07] text-sky-100", amber: "border-amber-300/15 bg-amber-300/[0.07] text-amber-100", green: "border-green-300/15 bg-green-300/[0.07] text-green-100", violet: "border-violet-300/15 bg-violet-300/[0.07] text-violet-100" };
  return <div className={`rounded-2xl border p-4 ${colors[tone]}`}><p className="text-2xl font-black sm:text-3xl">{value.toLocaleString("he-IL")}</p><p className="mt-1 text-xs font-bold opacity-75">{label}</p></div>;
}
