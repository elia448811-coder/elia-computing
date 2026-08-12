import type { Metadata } from "next";
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
      <p>
        השימוש באתר {siteConfig.name} מהווה הסכמה לתנאים אלה.
      </p>
      <p>
        תוכן האתר נועד לספק מידע כללי על השירותים. אין לראות בו הצעה מחייבת,
        ייעוץ משפטי או התחייבות לתוצאה ספציפית ללא התקשרות מסחרית נפרדת.
      </p>
      <p>
        כל הזכויות על עיצוב האתר, המיתוג והתכנים שמורות ל-{siteConfig.name},
        אלא אם צוין אחרת.
      </p>
      <p>
        ייתכן שהאתר יכלול קישורים חיצוניים. אין לנו שליטה על תוכן אתרים של
        צדדים שלישיים.
      </p>
    </LegalPage>
  );
}
