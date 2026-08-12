import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: "הצהרת נגישות",
  description: `הצהרת נגישות של ${siteConfig.name}`,
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
  return (
    <LegalPage title="הצהרת נגישות">
      <p>
        {siteConfig.name} פועלת להנגשת האתר לכלל המשתמשים, כולל אנשים עם
        מוגבלויות.
      </p>
      <p>
        האתר נבנה עם דגש על ניווט מקלדת, מבנה סמנטי, ניגודיות קריאה, תמיכה ב-RTL
        וכיבוד העדפת prefers-reduced-motion.
      </p>
      <p>
        אם נתקלתם בבעיית נגישות, נשמח שתפנו אלינו דרך טופס יצירת הקשר כדי שנוכל
        לתקן במהירות.
      </p>
    </LegalPage>
  );
}
