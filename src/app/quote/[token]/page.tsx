import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuoteCustomerView } from "@/components/QuoteCustomerView";
import { getPublicQuote } from "@/lib/quotes";
export const metadata: Metadata = {
  title: "הצעת המחיר שלכם",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  alternates: { canonical: null },
};
export const dynamic = "force-dynamic";
export default async function QuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const quote = await getPublicQuote(token);
  if (!quote) notFound();
  return (
    <main id="main" className="quote-public-page">
      <QuoteCustomerView initialQuote={quote} token={token} />
    </main>
  );
}
