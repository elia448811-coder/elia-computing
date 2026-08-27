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
      <div className="mb-7 rounded-2xl border border-amber-300/25 bg-amber-300/[0.07] p-4 text-sm leading-relaxed text-amber-50">
        המסמך הוא נוסח כללי לצורכי מידע ועבודה ואינו ייעוץ משפטי. תנאי עסקה פרטנית והוראות דין שאינן ניתנות להתניה גוברים עליו. מומלץ לקבל בדיקה של עורך דין לפני שימוש מחייב.
      </div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <div className="mt-10 rounded-2xl border border-electric/20 bg-electric/[0.06] p-5">
        <p className="font-bold text-white">צריכים מסמך מותאם ללקוח?</p>
        <p className="mt-2 text-sm text-silver-muted">באזור הניהול ניתן לבחור את התבנית, לערוך כל סעיף וליצור קישור חתימה.</p>
        <Link href="/login" className="btn btn-secondary mt-4 text-sm">מעבר לאזור הניהול</Link>
      </div>
    </>
  );
}
