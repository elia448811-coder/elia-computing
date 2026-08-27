import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { HandSignaturePad } from "@/components/HandSignaturePad";
import { Logo } from "@/components/Logo";
import { getSignerByToken } from "@/lib/documents";
import { signDocumentAction } from "./actions";

export const metadata: Metadata = { title: "חתימה ידנית על מסמך", robots: { index: false } };

export default async function SignPage({ params, searchParams }: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const context = await getSignerByToken(token);
  if (!context) notFound();
  const { document, signer } = context;
  const isPdf = document.sourceType === "pdf" && signer;
  const signedAt = signer?.signedAt ?? document.signedAt;
  const signerName = signer?.name ?? document.recipientName ?? "";
  const signature = signer?.signature ?? document.signature;
  const allComplete = document.signers?.every((item) => item.signedAt) ?? Boolean(document.signedAt);
  const action = signDocumentAction.bind(null, token);

  return (
    <main id="main" className="min-h-screen px-4 pb-20 pt-28">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-center gap-3"><Logo variant="for-dark" className="h-14 w-14 rounded-full" sizes="56px" /><span className="font-bold text-white">אליה שירותי מחשוב · חתימות מרובות</span></div>
        <article className="glass rounded-[var(--radius-xl)] p-5 sm:p-9">
          <div className="border-b border-white/10 pb-6">
            <p className="text-sm font-bold text-electric-bright">מסמך לחתימה ידנית</p>
            <h1 className="mt-2 text-3xl font-bold text-white">{document.title}</h1>
            <p className="mt-2 text-silver-muted">הקישור האישי של {signer?.label ?? "החותם"}: {signerName}</p>
          </div>

          {isPdf ? (
            <div className="my-7">
              <p className="mb-3 rounded-xl bg-sky-400/10 p-3 text-sm text-sky-100">אזור החתימה שלך מסומן במסגרת כחולה במסמך.</p>
              <iframe title={`תצוגת ${document.title}`} src={`/api/sign/${token}/pdf?preview=1`} className="h-[68vh] min-h-[520px] w-full rounded-2xl border border-white/15 bg-white" />
            </div>
          ) : <div className="document-preview my-8 rounded-2xl bg-white p-5 leading-8 text-slate-900 sm:p-8" dangerouslySetInnerHTML={{ __html: document.content ?? "" }} />}

          {signedAt ? (
            <div className="rounded-2xl border border-green-400/25 bg-green-400/10 p-6 text-center">
              <p className="text-xl font-bold text-green-100">החתימה שלך נשמרה בהצלחה</p>
              <p className="mt-2 text-sm text-green-200/80">נחתם על ידי {signerName}</p>
              {signature ? <div className="mx-auto mt-4 max-w-sm rounded-xl bg-white p-3"><Image src={signature} alt={`החתימה של ${signerName}`} width={700} height={240} unoptimized className="h-auto w-full" /></div> : null}
              {isPdf && allComplete ? <a href={`/api/sign/${token}/pdf?download=1`} className="btn btn-primary mt-5 w-full sm:w-auto">הורדת המסמך החתום</a> : isPdf ? <p className="mt-4 text-sm text-green-100">המסמך ממתין כעת לחתימה של הצד השני.</p> : null}
            </div>
          ) : (
            <form action={action} className="space-y-5 border-t border-white/10 pt-7">
              {query.error ? <p className="rounded-xl bg-red-400/10 p-3 text-sm text-red-200">יש לצייר חתימה ולאשר שקראת את המסמך.</p> : null}
              <label className="block text-sm font-semibold text-silver">שם מלא<input name="signerName" required defaultValue={signerName} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" /></label>
              <div><span className="mb-2 block text-sm font-semibold text-silver">החתימה שלך ביד</span><HandSignaturePad /></div>
              <label className="flex items-start gap-3 rounded-xl bg-white/[0.04] p-4 text-sm leading-relaxed text-silver"><input name="approved" type="checkbox" required className="mt-1 h-4 w-4 accent-sky-400" /><span>קראתי את המסמך, בדקתי שהפרטים נכונים, ואני מאשר/ת להטמיע בו את החתימה שציירתי.</span></label>
              <button className="btn btn-primary w-full" type="submit">שמירת החתימה במסמך</button>
            </form>
          )}
        </article>
        <p className="mt-4 text-center text-xs text-silver-muted">הקישור אישי. אין להעביר אותו לאדם אחר.</p>
      </div>
    </main>
  );
}
