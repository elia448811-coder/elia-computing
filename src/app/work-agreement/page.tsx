import type { Metadata } from "next";
import { LegalDocumentTemplate } from "@/components/LegalDocumentTemplate";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: "חוזה עבודה לפיתוח מערכת או אתר",
  description: `תבנית הסכם עבודה מקצועית לפיתוח תוכנה, מערכות ואתרים של ${siteConfig.name}`,
  alternates: { canonical: "/work-agreement" },
};

export default function WorkAgreementPage() {
  return (
    <LegalPage title="חוזה עבודה לפיתוח מערכת או אתר">
      <LegalDocumentTemplate template="workAgreement" />
    </LegalPage>
  );
}
