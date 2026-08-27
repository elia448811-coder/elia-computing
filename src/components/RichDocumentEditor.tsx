"use client";

import { useRef, useState } from "react";
import { documentTemplates, type DocumentTemplateKey } from "@/data/documentTemplates";

const formattingTools = [
  ["bold", "מודגש", "B"], ["italic", "נטוי", "I"], ["underline", "קו תחתון", "U"],
  ["insertUnorderedList", "רשימת נקודות", "• רשימה"], ["insertOrderedList", "רשימה ממוספרת", "1. רשימה"],
  ["justifyRight", "יישור לימין", "ימין"], ["justifyCenter", "מרכוז", "מרכז"],
  ["undo", "ביטול פעולה", "↶"], ["redo", "חזרה על פעולה", "↷"],
] as const;

const quickFields = ["[שם הלקוח]", "[שם העסק]", "[תאריך]", "[סכום]", "[מספר עוסק]", "[חתימת הלקוח]"];

type RichDocumentEditorProps = {
  initialTitle?: string;
  initialContent?: string;
  initialTemplate?: DocumentTemplateKey;
};

export function RichDocumentEditor({
  initialTitle = documentTemplates.blank.title,
  initialContent = documentTemplates.blank.html,
  initialTemplate = "blank",
}: RichDocumentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const contentInputRef = useRef<HTMLInputElement>(null);
  const [template, setTemplate] = useState<DocumentTemplateKey>(initialTemplate);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [warrantyAgreement, setWarrantyAgreement] = useState("");
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [fullscreen, setFullscreen] = useState(false);

  function sync() {
    const next = editorRef.current?.innerHTML ?? "";
    setContent(next);
    if (contentInputRef.current) contentInputRef.current.value = next;
  }

  function command(name: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
    sync();
  }

  function chooseTemplate(key: DocumentTemplateKey) {
    const next = documentTemplates[key];
    setTemplate(key);
    setTitle(next.title);
    setContent(next.html);
    setWarrantyAgreement("");
    if (editorRef.current) editorRef.current.innerHTML = next.html;
    if (contentInputRef.current) contentInputRef.current.value = next.html;
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

  const wordCount = content.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className={fullscreen ? "fixed inset-3 z-[80] overflow-auto rounded-3xl border border-electric/25 bg-[#07111f] p-4 shadow-2xl sm:inset-6 sm:p-6" : "space-y-4"}>
      <div className="grid gap-4 rounded-2xl border border-electric/20 bg-electric/[0.06] p-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="block text-sm font-semibold text-silver">בחירת תבנית מקצועית
          <select name="template" value={template} onChange={(event) => chooseTemplate(event.target.value as DocumentTemplateKey)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#0b1729] px-4 py-3 text-white">
            {Object.entries(documentTemplates).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
          </select>
        </label>
        <div className="flex rounded-xl border border-white/10 bg-black/15 p-1">
          <button type="button" onClick={() => setView("edit")} className={`rounded-lg px-4 py-2 text-sm font-bold ${view === "edit" ? "bg-electric text-slate-950" : "text-silver"}`}>עריכה</button>
          <button type="button" onClick={() => { sync(); setView("preview"); }} className={`rounded-lg px-4 py-2 text-sm font-bold ${view === "preview" ? "bg-electric text-slate-950" : "text-silver"}`}>תצוגה מקדימה</button>
        </div>
      </div>

      {template === "workAgreement" ? <div className="rounded-2xl border border-sky-300/20 bg-sky-300/[0.06] p-4 text-sm leading-relaxed text-sky-100">כל סעיפי החוזה פתוחים לעריכה. השלימו את השדות המסומנים בסוגריים לפני יצירת הקישור.</div> : null}
      {template === "warrantyPolicy" ? (
        <label className="block rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] p-4 text-sm font-semibold text-amber-50">במסגרת האחריות שלנו סוכם ש...
          <textarea value={warrantyAgreement} onChange={(event) => updateWarrantyAgreement(event.target.value)} rows={3} placeholder="למשל: האחריות כוללת שתי שעות הדרכה ועדכון אחד במשך 6 חודשים." className="mt-2 w-full rounded-xl border border-white/15 bg-[#0b1729] px-4 py-3 font-normal leading-relaxed text-white placeholder:text-silver-muted" />
          <span className="mt-2 block text-xs font-normal text-amber-100/70">הטקסט משתלב מיד בסעיף ההסכמות המיוחדות.</span>
        </label>
      ) : null}

      <label className="block text-sm font-semibold text-silver">שם המסמך
        <input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="למשל: הסכם פיתוח עבור כהן בע״מ" className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" />
      </label>

      {view === "edit" ? (
        <div>
          <div className="flex flex-wrap items-center gap-1 rounded-t-2xl border border-b-0 border-white/15 bg-[#0b1729] p-2" role="toolbar" aria-label="כלי עריכת מסמך">
            <select aria-label="סגנון טקסט" className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white" defaultValue="p" onChange={(event) => command("formatBlock", event.target.value)}><option value="p">טקסט רגיל</option><option value="h2">כותרת ראשית</option><option value="h3">כותרת משנה</option><option value="blockquote">ציטוט</option></select>
            {formattingTools.map(([name, label, icon]) => <button key={name} type="button" title={label} aria-label={label} onClick={() => command(name)} className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-bold text-silver hover:border-electric/40 hover:text-white">{icon}</button>)}
            <button type="button" onClick={addLink} className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-bold text-silver hover:text-white">קישור</button>
            <button type="button" onClick={() => command("insertHorizontalRule")} className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-silver hover:text-white">קו מפריד</button>
            <button type="button" onClick={() => command("removeFormat")} className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-silver hover:text-white">ניקוי עיצוב</button>
            <button type="button" onClick={() => setFullscreen((value) => !value)} className="mr-auto min-h-9 rounded-lg border border-electric/25 bg-electric/10 px-3 text-sm font-bold text-electric-bright">{fullscreen ? "יציאה ממסך מלא" : "מסך מלא"}</button>
          </div>
          <div className="flex flex-wrap gap-2 border-x border-white/15 bg-[#0b1729] px-3 pb-3">
            <span className="py-1 text-xs text-silver-muted">הוספת שדה מהיר:</span>
            {quickFields.map((field) => <button key={field} type="button" onClick={() => command("insertText", field)} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-silver hover:border-electric/30 hover:text-white">{field}</button>)}
          </div>
          <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={sync} dangerouslySetInnerHTML={{ __html: content }} className={`rich-editor overflow-auto rounded-b-2xl border border-white/15 bg-white px-6 py-7 text-right leading-8 text-slate-900 focus:outline-none focus:ring-2 focus:ring-electric ${fullscreen ? "min-h-[60vh]" : "min-h-[520px]"}`} />
        </div>
      ) : (
        <div className="document-preview min-h-[520px] rounded-2xl border border-white/15 bg-white px-6 py-8 leading-8 text-slate-900 shadow-inner" dangerouslySetInnerHTML={{ __html: content }} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-silver-muted"><span>{wordCount.toLocaleString("he-IL")} מילים</span><span>השינויים נשמרים בלחיצה על כפתור השמירה</span></div>
      <input ref={contentInputRef} type="hidden" name="content" defaultValue={initialContent} />
    </div>
  );
}
