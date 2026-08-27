import type { Metadata } from "next";
import { LegalDocumentTemplate } from "@/components/LegalDocumentTemplate";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: "תנאי שימוש",
  description: `תנאי השימוש של ${siteConfig.name}`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="תנאי שימוש">
      <LegalDocumentTemplate template="termsOfUse" />
    </LegalPage>
  );
}
