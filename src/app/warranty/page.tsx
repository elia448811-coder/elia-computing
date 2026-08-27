import type { Metadata } from "next";
import { LegalDocumentTemplate } from "@/components/LegalDocumentTemplate";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: "מדיניות אחריות ותמיכה",
  description: `מדיניות האחריות לפרויקטי פיתוח, מערכות ואתרים של ${siteConfig.name}`,
  alternates: { canonical: "/warranty" },
};

export default function WarrantyPage() {
  return (
    <LegalPage title="מדיניות אחריות ותמיכה">
      <LegalDocumentTemplate template="warrantyPolicy" />
    </LegalPage>
  );
}
