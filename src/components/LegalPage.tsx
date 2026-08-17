import type { ReactNode } from "react";
import Link from "next/link";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main id="main" className="section-y pt-[calc(var(--header-h)+1.5rem)]">
      <article className="container-site max-w-3xl">
        <p className="mb-4 text-sm text-silver-muted">
          <Link href="/" className="hover:text-electric-bright">
            חזרה לדף הבית
          </Link>
        </p>
        <h1 className="text-[1.65rem] font-bold text-white sm:text-4xl">{title}</h1>
        <div className="prose-legal mt-6 space-y-4 text-[0.95rem] leading-relaxed text-silver-muted sm:mt-8 sm:text-base">
          {children}
        </div>
      </article>
    </main>
  );
}
