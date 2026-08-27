"use client";

import { useRef, useState } from "react";
import { documentTemplates, type DocumentTemplateKey } from "@/data/documentTemplates";

const tools = [
  ["bold", "מודגש", "B"], ["italic", "נטוי", "I"], ["underline", "קו תחתון", "U"],
  ["insertUnorderedList", "רשימת נקודות", "• רשימה"], ["insertOrderedList", "רשימה ממוספרת", "1. רשימה"],
  ["justifyRight", "יישור לימין", "ימין"], ["justifyCenter", "מרכוז", "מרכז"],
  ["undo", "ביטול פעולה", "↶"], ["redo", "חזרה על פעולה", "↷"],
] as const;

export function RichDocumentEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const contentInputRef = useRef<HTMLInputElement>(null);
  const [template, setTemplate] = useState<DocumentTemplateKey>("blank");
  const [title, setTitle] = useState<string>(documentTemplates.blank.title);
  const [warrantyAgreement, setWarrantyAgreement] = useState("");

  function sync() {
    if (contentInputRef.current) contentInputRef.current.value = editorRef.current?.innerHTML ?? "";
  }
  function command(name: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
    sync();
  }
  function chooseTemplate(key: DocumentTemplateKey) {
    setTemplate(key);
    setTitle(documentTemplates[key].title);
    setWarrantyAgreement("");
    if (editorRef.current) editorRef.current.innerHTML = documentTemplates[key].html;
    if (contentInputRef.current) contentInputRef.current.value = documentTemplates[key].html;
  }
  function updateWarrantyAgreement(value: string) {
    setWarrantyAgreement(value);
    const field = editorRef.current?.querySelector("#warranty-special-terms");
    if (field) {
      field.textContent = `במסגרת האחריות שלנו סוכם ש... ${value || "[הקלידו כאן את התנאים הספציפיים שסוכמו עם הלקוח]"}`;
      sync();
    }
  }
  function addLink() {
    const url = window.prompt("הדביקו כתובת קישור מלאה");
    if (url) command("createLink", url);
  }

  return <div className="space-y-4">
    <div className="rounded-2xl border border-electric/20 bg-electric/[0.06] p-4">
      <label className="block text-sm font-semibold text-silver">בחירת תבנית מוכנה
        <select name="template" value={template} onChange={(event) => chooseTemplate(event.target.value as DocumentTemplateKey)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#0b1729] px-4 py-3 text-white">
          {Object.entries(documentTemplates).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
        </select>
      </label>
      <p className="mt-2 text-xs leading-relaxed text-silver-muted">בחירת תבנית מחליפה את תוכן הכתבן. לאחר מכן אפשר לערוך כל סעיף, להוסיף או למחוק פרטים.</p>
    </div>
    {template === "workAgreement" ? (
      <div className="rounded-2xl border border-sky-300/20 bg-sky-300/[0.06] p-4 text-sm leading-relaxed text-sky-100">
        חוזה העבודה פתוח לעריכה מלאה: אפשר לשנות את היקף הפרויקט, המחיר, אבני הדרך, הקניין הרוחני, האחריות וכל סעיף אחר לפני יצירת קישור החתימה.
      </div>
    ) : null}
    {template === "warrantyPolicy" ? (
      <label className="block rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] p-4 text-sm font-semibold text-amber-50">
        במסגרת האחריות שלנו סוכם ש...
        <textarea
          value={warrantyAgreement}
          onChange={(event) => updateWarrantyAgreement(event.target.value)}
          rows={4}
          placeholder="למשל: האחריות כוללת גם שתי שעות הדרכה ועדכון אחד לטופס במשך 6 חודשים."
          className="mt-2 w-full rounded-xl border border-white/15 bg-[#0b1729] px-4 py-3 font-normal leading-relaxed text-white placeholder:text-silver-muted"
        />
        <span className="mt-2 block text-xs font-normal text-amber-100/70">הטקסט שתכתבו כאן משתלב מיד בסעיף 12 של מסמך האחריות, ועדיין ניתן לערוך אותו גם בתוך הכתבן.</span>
      </label>
    ) : null}
    <label className="block text-sm font-semibold text-silver">שם המסמך
      <input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="למשל: הצעת מחיר לאתר עבור כהן בע״מ" className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" />
    </label>
    <div>
      <span className="mb-2 block text-sm font-semibold text-silver">תוכן המסמך</span>
      <div className="flex flex-wrap gap-1 rounded-t-2xl border border-b-0 border-white/15 bg-[#0b1729] p-2" role="toolbar" aria-label="כלי עריכת מסמך">
        <select aria-label="סגנון טקסט" className="rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white" defaultValue="p" onChange={(event) => command("formatBlock", event.target.value)}><option value="p">טקסט רגיל</option><option value="h2">כותרת ראשית</option><option value="h3">כותרת משנה</option><option value="blockquote">ציטוט</option></select>
        {tools.map(([name, label, icon]) => <button key={name} type="button" title={label} aria-label={label} onClick={() => command(name)} className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-bold text-silver hover:border-electric/40 hover:text-white">{icon}</button>)}
        <button type="button" onClick={addLink} className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-bold text-silver hover:text-white">קישור</button>
        <button type="button" onClick={() => command("removeFormat")} className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-silver hover:text-white">ניקוי עיצוב</button>
      </div>
      <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={sync} dangerouslySetInnerHTML={{ __html: documentTemplates.blank.html }} className="rich-editor min-h-[440px] rounded-b-2xl border border-white/15 bg-white px-6 py-7 text-right leading-8 text-slate-900 focus:outline-none focus:ring-2 focus:ring-electric" />
      <input ref={contentInputRef} type="hidden" name="content" defaultValue={documentTemplates.blank.html} />
    </div>
  </div>;
}
