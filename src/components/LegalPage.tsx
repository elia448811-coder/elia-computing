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
    <main id="main" className="section-y pt-28">
      <article className="container-site max-w-3xl">
        <p className="mb-4 text-sm text-silver-muted">
          <Link href="/" className="hover:text-electric-bright">
            חזרה לדף הבית
          </Link>
        </p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">{title}</h1>
        <div className="prose-legal mt-8 space-y-4 text-base leading-relaxed text-silver-muted">
          {children}
        </div>
      </article>
    </main>
  );
}
