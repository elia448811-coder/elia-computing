import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RichDocumentEditor } from "@/components/RichDocumentEditor";
import { documentTemplates, type DocumentTemplateKey } from "@/data/documentTemplates";
import { isAuthenticated } from "@/lib/auth";
import { getDocumentById } from "@/lib/documents";
import { updateDocumentAction } from "@/app/dashboard/actions";

export const metadata: Metadata = { title: "עריכת מסמך", robots: { index: false } };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function EditDocumentPage({ params, searchParams }: Props) {
  if (!(await isAuthenticated())) redirect("/login");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const document = await getDocumentById(id);
  if (!document) notFound();
  if (document.sourceType === "pdf" || document.signedAt) redirect("/dashboard#documents");
  const template = document.template && document.template in documentTemplates ? document.template as DocumentTemplateKey : "blank";
  const action = updateDocumentAction.bind(null, id);

  return (
    <main id="main" className="min-h-screen px-4 pb-20 pt-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div><Link href="/dashboard#documents" className="text-sm font-bold text-electric-bright">← חזרה לספריית המסמכים</Link><h1 className="mt-2 text-3xl font-bold text-white">עריכת מסמך</h1><p className="mt-2 text-sm text-silver-muted">אפשר לשנות את פרטי הלקוח ואת כל תוכן המסמך כל עוד טרם נחתם.</p></div>
          <Link href={`/sign/${document.token}`} className="btn btn-secondary text-sm">תצוגת החותם</Link>
        </div>
        {query.saved ? <p className="mb-5 rounded-2xl border border-green-400/25 bg-green-400/10 p-4 text-green-100">השינויים נשמרו בהצלחה והקישור הקיים עודכן.</p> : null}
        {query.error ? <p className="mb-5 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-red-100">לא ניתן לשמור. ודאו שכל השדות מלאים ושהמסמך טרם נחתם.</p> : null}
        <form action={action} className="glass space-y-5 rounded-[var(--radius-xl)] p-5 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-silver">שם הלקוח / החותם<input name="recipientName" required defaultValue={document.recipientName} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" /></label><label className="block text-sm font-semibold text-silver">אימייל<input name="recipientEmail" type="email" defaultValue={document.recipientEmail} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" /></label></div>
          <RichDocumentEditor initialTitle={document.title} initialContent={document.content ?? ""} initialTemplate={template} draftKey={`document-${document.id}`} />
          <div className="sticky bottom-3 flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-[#07111f]/95 p-3 shadow-2xl backdrop-blur-xl"><button type="submit" className="btn btn-primary flex-1">שמירת כל השינויים</button><Link href="/dashboard#documents" className="btn btn-secondary">ביטול</Link></div>
        </form>
      </div>
    </main>
  );
}
