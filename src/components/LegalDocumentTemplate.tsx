import Link from "next/link";
import { documentTemplates, type DocumentTemplateKey } from "@/data/documentTemplates";
import { siteConfig } from "@/data/site";

export function LegalDocumentTemplate({ template }: { template: DocumentTemplateKey }) {
  const html = documentTemplates[template].html
    .replaceAll("[דוא״ל]", siteConfig.contact.email || "בדוא״ל המופיע באתר")
    .replaceAll("[טלפון]", siteConfig.contact.phone || "בפרטי הקשר באתר")
    .replaceAll("[כתובת]", siteConfig.contact.address || "כתובת העסק תימסר במסמך ההתקשרות");

  return (
    <>
      <div className="mb-7 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
        המסמך הוא נוסח כללי לצורכי מידע ועבודה ואינו ייעוץ משפטי. תנאי עסקה פרטנית והוראות דין שאינן ניתנות להתניה גוברים עליו. מומלץ לקבל בדיקה של עורך דין לפני שימוש מחייב.
      </div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <div className="no-print mt-10 rounded-2xl border border-sky-200 bg-sky-50 p-5">
        <p className="font-bold text-slate-950">צריכים מסמך מותאם ללקוח?</p>
        <p className="mt-2 text-sm text-slate-600">באזור הניהול ניתן לבחור את התבנית, לערוך כל סעיף וליצור קישור חתימה.</p>
        <Link href="/login" className="mt-4 inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white">מעבר לאזור הניהול</Link>
      </div>
    </>
  );
}
