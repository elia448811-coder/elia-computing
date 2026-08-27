import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { MultiSignaturePdfBuilder } from "@/components/MultiSignaturePdfBuilder";
import { RichDocumentEditor } from "@/components/RichDocumentEditor";
import { isAuthenticated } from "@/lib/auth";
import { listDocuments } from "@/lib/documents";
import { siteConfig } from "@/data/site";
import { changePasswordAction, createDocumentAction, createPdfDocumentAction, logoutAction } from "./actions";

export const metadata: Metadata = { title: "מסמכים וחתימות", robots: { index: false } };

type DashboardQuery = {
  created?: string;
  pdfCreated?: string;
  pdfError?: string;
  passwordChanged?: string;
  passwordError?: string;
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<DashboardQuery> }) {
  if (!(await isAuthenticated())) redirect("/login");
  const [query, documents] = await Promise.all([searchParams, listDocuments()]);
  return (
    <main id="main" className="min-h-screen px-4 pb-20 pt-28">
      <div className="container-site">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-electric-bright">אזור ניהול מאובטח</p>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">מסמכים וחתימות</h1>
            <p className="mt-2 max-w-2xl text-silver-muted">יוצרים ועורכים חוזי עבודה, תנאי שימוש ומסמכי אחריות, או מעלים PDF לחתימות מרובות.</p>
          </div>
          <form action={logoutAction}><button className="btn btn-secondary text-sm">יציאה</button></form>
        </div>

        {query.pdfCreated ? <div className="mb-6 rounded-2xl border border-green-400/25 bg-green-400/10 p-4 text-green-100">המסמך נוצר בהצלחה. שני הקישורים האישיים מחכים לך ברשימת המסמכים.</div> : null}
        {query.created ? <div className="mb-6 rounded-2xl border border-green-400/25 bg-green-400/10 p-4 text-green-100">המסמך נוצר. אפשר להעתיק את הקישור מהרשימה.</div> : null}

        <section id="multiple-signatures" className="glass rounded-[var(--radius-xl)] p-6 sm:p-8">
          <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-bold text-electric-bright">המסלול המומלץ</p>
              <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">PDF עם שתי חתימות ידניות</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-silver-muted">כל חותם מקבל קישור משלו, מצייר חתימה ביד, והיא מוטמעת אוטומטית באזור שסימנת עבורו.</p>
            </div>
            <div className="flex gap-2 text-xs font-bold">
              <span className="rounded-full bg-sky-400/10 px-3 py-2 text-sky-200">1. מעלים</span>
              <span className="rounded-full bg-violet-400/10 px-3 py-2 text-violet-200">2. מסמנים</span>
              <span className="rounded-full bg-green-400/10 px-3 py-2 text-green-200">3. שולחים</span>
            </div>
          </div>
          {query.pdfError ? <p className="mb-5 rounded-xl bg-red-400/10 p-4 text-sm text-red-200">{query.pdfError === "size" ? "הקובץ גדול מדי. ניתן להעלות PDF עד 4MB." : query.pdfError === "fields" ? "יש לסמן מקום חתימה לכל אחד משני הצדדים." : "לא הצלחנו לקרוא את הקובץ. ודאו שמדובר ב-PDF תקין שאינו מוגן בסיסמה."}</p> : null}
          <form action={createPdfDocumentAction}><MultiSignaturePdfBuilder /></form>
        </section>

        <section id="documents" className="glass mt-7 rounded-[var(--radius-xl)] p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-2xl font-bold text-white">המסמכים שלי</h2><p className="mt-2 text-sm text-silver-muted">קישורים, מצב החתימות והורדת המסמך המעודכן</p></div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-silver">{documents.length} מסמכים</span>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {documents.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-silver-muted lg:col-span-2">עדיין אין מסמכים. צרו את הראשון למעלה.</div> : documents.map((document) => {
              const isPdf = document.sourceType === "pdf" && document.signers;
              const complete = isPdf ? document.signers!.every((signer) => signer.signedAt) : Boolean(document.signedAt);
              const legacyUrl = document.token ? `${siteConfig.url}/sign/${document.token}` : "";
              return (
                <article key={document.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="mb-1 text-xs font-bold text-electric-bright">{isPdf ? "PDF · חתימות מרובות" : `לקוח: ${document.recipientName}`}</p>
                      <h3 className="font-bold text-white">{document.title}</h3>
                      <p className="mt-1 text-xs text-silver-muted">{new Intl.DateTimeFormat("he-IL").format(new Date(document.createdAt))}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${complete ? "bg-green-400/10 text-green-200" : "bg-amber-400/10 text-amber-200"}`}>{complete ? "הושלם" : "ממתין לחתימות"}</span>
                  </div>
                  {isPdf ? (
                    <div className="mt-4 space-y-3">
                      {document.signers!.map((signer) => {
                        const url = `${siteConfig.url}/sign/${signer.token}`;
                        return <div key={signer.id} className="rounded-xl border border-white/10 bg-black/10 p-3"><div className="mb-2 flex items-center justify-between gap-2"><p className="text-sm font-bold text-white">{signer.label}: {signer.name}</p><span className={`text-xs font-bold ${signer.signedAt ? "text-green-200" : "text-amber-200"}`}>{signer.signedAt ? "חתם/ה" : "טרם חתם/ה"}</span></div><div className="flex flex-wrap gap-2"><CopyLinkButton url={url} /><Link href={`/sign/${signer.token}`} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-silver">פתיחת הקישור</Link></div></div>;
                      })}
                      {complete ? <a href={`/api/sign/${document.signers![0].token}/pdf?download=1`} className="btn btn-primary mt-2 w-full">הורדת ה-PDF החתום</a> : null}
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2"><CopyLinkButton url={legacyUrl} /><Link href={`/sign/${document.token}`} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-silver">צפייה במסמך</Link></div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <details open className="glass mt-7 rounded-[var(--radius-xl)] p-6 sm:p-8">
          <summary className="cursor-pointer text-xl font-bold text-white">יצירת חוזה עבודה או מסמך משפטי</summary>
          <p className="mt-2 text-sm leading-relaxed text-silver-muted">בחרו תבנית מקצועית, ערכו כל סעיף בתוך האתר והוסיפו תנאים מיוחדים ללקוח. בסיום ייווצר קישור לחתימה ידנית.</p>
          <form action={createDocumentAction} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-silver">שם החותם<input name="recipientName" required className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" /></label><label className="block text-sm font-semibold text-silver">אימייל (אופציונלי)<input name="recipientEmail" type="email" className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" /></label></div>
            <RichDocumentEditor />
            <button className="btn btn-primary w-full" type="submit">שמירה ויצירת קישור לחתימה</button>
          </form>
        </details>

        <section id="security" className="glass mt-7 rounded-[var(--radius-xl)] p-6 sm:p-8">
          <div className="grid gap-7 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <div><p className="text-sm font-bold text-electric-bright">אבטחת החשבון</p><h2 className="mt-1 text-2xl font-bold text-white">שינוי סיסמה</h2><p className="mt-3 text-sm leading-relaxed text-silver-muted">לאחר השינוי כל החיבורים הישנים מתבטלים מיד.</p></div>
            <form action={changePasswordAction} className="grid gap-4 sm:grid-cols-2">
              {query.passwordChanged ? <p className="rounded-xl bg-green-400/10 p-3 text-sm text-green-200 sm:col-span-2">הסיסמה שונתה בהצלחה.</p> : null}
              {query.passwordError ? <p className="rounded-xl bg-red-400/10 p-3 text-sm text-red-200 sm:col-span-2">{query.passwordError === "current" ? "הסיסמה הנוכחית אינה נכונה." : query.passwordError === "mismatch" ? "הסיסמאות החדשות אינן תואמות." : "יש לבחור לפחות 12 תווים הכוללים אות גדולה, אות קטנה, מספר וסימן מיוחד."}</p> : null}
              <label className="block text-sm font-semibold text-silver sm:col-span-2">סיסמה נוכחית<input name="currentPassword" type="password" autoComplete="current-password" required className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" /></label>
              <label className="block text-sm font-semibold text-silver">סיסמה חדשה<input name="newPassword" type="password" autoComplete="new-password" minLength={12} required className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" /></label>
              <label className="block text-sm font-semibold text-silver">אימות סיסמה חדשה<input name="confirmation" type="password" autoComplete="new-password" minLength={12} required className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" /></label>
              <button className="btn btn-secondary sm:col-span-2" type="submit">עדכון הסיסמה</button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
