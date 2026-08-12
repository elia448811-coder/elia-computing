import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: "מדיניות פרטיות",
  description: `מדיניות הפרטיות של ${siteConfig.name}`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="מדיניות פרטיות">
      <p>
        מדיניות זו מסבירה כיצד {siteConfig.name} מטפלת במידע שנמסר דרך האתר.
      </p>
      <p>
        מידע שנשלח בטופס יצירת הקשר (כגון שם, טלפון, אימייל ותוכן הפנייה)
        משמש אך ורק לצורך מענה לפנייה ולמתן שירות.
      </p>
      <p>
        איננו מוכרים או מעבירים פרטים אישיים לצדדים שלישיים לצורכי שיווק,
        למעט ספקי תשתית טכניים הנדרשים להפעלת האתר או לשליחת ההודעות.
      </p>
      <p>
        ניתן לפנות בבקשה לעדכון או מחיקת פרטים דרך ערוצי יצירת הקשר המפורסמים
        באתר.
      </p>
      <p>מסמך זה עשוי להתעדכן מעת לעת.</p>
    </LegalPage>
  );
}
