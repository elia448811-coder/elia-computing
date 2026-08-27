import type { ReactNode } from "react";
import Link from "next/link";
import { PrintDocumentButton } from "@/components/PrintDocumentButton";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main id="main" className="section-y pt-28">
      <article className="container-site max-w-4xl">
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-silver-muted">
          <Link href="/" className="hover:text-electric-bright">
            חזרה לדף הבית
          </Link>
        </p><PrintDocumentButton /></div>
        <div className="document-reading-paper rounded-2xl bg-white px-5 py-8 text-slate-900 shadow-2xl sm:px-10 sm:py-12">
        <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-3 border-b border-slate-200 pb-5 text-sm text-slate-500">מסמך לקריאה, הדפסה ושמירה. מומלץ להשלים את כל השדות לפני שימוש.</p>
        <div className="prose-legal mt-8 space-y-4 text-base leading-relaxed text-slate-700">
          {children}
        </div>
        </div>
      </article>
    </main>
  );
}
