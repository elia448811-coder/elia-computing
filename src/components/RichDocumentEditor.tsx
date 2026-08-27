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
  const toolbarButton = "inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] px-3 text-sm font-bold text-silver transition hover:border-electric/35 hover:bg-electric/[0.08] hover:text-white";

  return (
    <div className={fullscreen ? "fixed inset-3 z-[80] overflow-y-auto rounded-[28px] border border-electric/25 bg-[#050d19] p-3 shadow-2xl sm:inset-6 sm:p-5" : "rounded-[28px] border border-white/10 bg-[#050d19]/65 p-3 shadow-[0_28px_80px_rgba(0,0,0,.28)] sm:p-5"}>
      <div className="space-y-5">
        <section className="rounded-2xl border border-electric/15 bg-[linear-gradient(135deg,rgba(69,200,255,.08),rgba(255,255,255,.025))] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-electric-bright">הגדרות המסמך</p>
              <p className="mt-1 text-xs text-silver-muted">בחרו תבנית ותנו למסמך שם ברור לפני שמתחילים לכתוב.</p>
            </div>
            <div className="flex rounded-xl border border-white/10 bg-black/20 p-1" aria-label="מצב תצוגה">
              <button type="button" onClick={() => setView("edit")} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${view === "edit" ? "bg-electric text-slate-950 shadow-lg" : "text-silver hover:text-white"}`}>עריכה</button>
              <button type="button" onClick={() => { sync(); setView("preview"); }} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${view === "preview" ? "bg-electric text-slate-950 shadow-lg" : "text-silver hover:text-white"}`}>תצוגה מקדימה</button>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block text-sm font-semibold text-silver">שם המסמך
              <input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="למשל: הסכם פיתוח עבור כהן בע״מ" className="mt-2 w-full rounded-xl border border-white/15 bg-[#091627] px-4 py-3 text-white placeholder:text-silver-muted focus:border-electric/50 focus:outline-none" />
            </label>
            <label className="block text-sm font-semibold text-silver">תבנית מקצועית
              <select name="template" value={template} onChange={(event) => chooseTemplate(event.target.value as DocumentTemplateKey)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#091627] px-4 py-3 text-white focus:border-electric/50 focus:outline-none">
                {Object.entries(documentTemplates).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
              </select>
            </label>
          </div>
        </section>

        {template === "workAgreement" ? <div className="rounded-2xl border border-sky-300/20 bg-sky-300/[0.06] p-4 text-sm leading-relaxed text-sky-100">כל סעיפי החוזה פתוחים לעריכה. השלימו את השדות המסומנים בסוגריים לפני יצירת הקישור.</div> : null}
        {template === "warrantyPolicy" ? (
          <label className="block rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] p-4 text-sm font-semibold text-amber-50">במסגרת האחריות שלנו סוכם ש...
            <textarea value={warrantyAgreement} onChange={(event) => updateWarrantyAgreement(event.target.value)} rows={3} placeholder="למשל: האחריות כוללת שתי שעות הדרכה ועדכון אחד במשך 6 חודשים." className="mt-2 w-full rounded-xl border border-white/15 bg-[#0b1729] px-4 py-3 font-normal leading-relaxed text-white placeholder:text-silver-muted" />
            <span className="mt-2 block text-xs font-normal text-amber-100/70">הטקסט משתלב מיד בסעיף ההסכמות המיוחדות.</span>
          </label>
        ) : null}

        {view === "edit" ? (
          <div className="overflow-hidden rounded-[24px] border border-white/12 bg-[#020813] shadow-2xl">
            <div className="sticky top-20 z-20 border-b border-white/10 bg-[#081526]/95 shadow-lg backdrop-blur-xl" role="toolbar" aria-label="כלי עריכת מסמך">
              <div className="flex flex-wrap items-center gap-2 p-3 sm:p-4">
                <select aria-label="סגנון טקסט" className="min-h-10 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-sm font-bold text-white" defaultValue="p" onChange={(event) => command("formatBlock", event.target.value)}><option value="p">טקסט רגיל</option><option value="h2">כותרת ראשית</option><option value="h3">כותרת משנה</option><option value="blockquote">ציטוט</option></select>
                <span className="hidden h-7 w-px bg-white/10 sm:block" aria-hidden="true" />
                <div className="flex gap-1 rounded-xl bg-black/15 p-1">
                  {formattingTools.slice(0, 3).map(([name, label, icon]) => <button key={name} type="button" title={label} aria-label={label} onClick={() => command(name)} className={toolbarButton}>{icon}</button>)}
                </div>
                <div className="flex gap-1 rounded-xl bg-black/15 p-1">
                  {formattingTools.slice(3, 5).map(([name, label, icon]) => <button key={name} type="button" title={label} aria-label={label} onClick={() => command(name)} className={toolbarButton}>{icon}</button>)}
                </div>
                <div className="flex gap-1 rounded-xl bg-black/15 p-1">
                  {formattingTools.slice(5, 7).map(([name, label, icon]) => <button key={name} type="button" title={label} aria-label={label} onClick={() => command(name)} className={toolbarButton}>{icon}</button>)}
                </div>
                <div className="flex gap-1 rounded-xl bg-black/15 p-1">
                  {formattingTools.slice(7).map(([name, label, icon]) => <button key={name} type="button" title={label} aria-label={label} onClick={() => command(name)} className={toolbarButton}>{icon}</button>)}
                </div>
                <button type="button" onClick={addLink} className={toolbarButton}>קישור</button>
                <button type="button" onClick={() => command("insertHorizontalRule")} className={toolbarButton}>קו מפריד</button>
                <button type="button" onClick={() => command("removeFormat")} className={toolbarButton}>ניקוי עיצוב</button>
                <button type="button" onClick={() => setFullscreen((value) => !value)} className="ms-auto inline-flex min-h-10 items-center justify-center rounded-xl border border-electric/30 bg-electric/10 px-4 text-sm font-bold text-electric-bright transition hover:bg-electric/15">{fullscreen ? "יציאה ממסך מלא" : "מסך מלא"}</button>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.07] px-3 py-3 sm:px-4">
                <span className="text-xs font-semibold text-silver-muted">שדות מהירים</span>
                {quickFields.map((field) => <button key={field} type="button" onClick={() => command("insertText", field)} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-silver transition hover:border-electric/30 hover:bg-electric/[0.07] hover:text-white">{field}</button>)}
              </div>
            </div>
            <div className="bg-[radial-gradient(circle_at_50%_0%,rgba(69,200,255,.08),transparent_45%)] p-3 sm:p-6 lg:p-8">
              <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={sync} dangerouslySetInnerHTML={{ __html: content }} style={{ colorScheme: "only light" }} className={`document-paper rich-editor mx-auto w-full max-w-[860px] overflow-auto rounded-md border border-slate-200 bg-white px-6 py-8 text-right leading-8 text-slate-900 shadow-[0_24px_70px_rgba(0,0,0,.38)] focus:outline-none focus:ring-2 focus:ring-electric sm:px-12 sm:py-12 ${fullscreen ? "min-h-[68vh]" : "min-h-[680px]"}`} />
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-white/10 bg-[#020813] p-3 sm:p-6 lg:p-8">
            <div style={{ colorScheme: "only light" }} className="document-paper document-preview mx-auto min-h-[680px] w-full max-w-[860px] rounded-md border border-slate-200 bg-white px-6 py-8 leading-8 text-slate-900 shadow-[0_24px_70px_rgba(0,0,0,.38)] sm:px-12 sm:py-12" dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs text-silver-muted"><span className="font-semibold">{wordCount.toLocaleString("he-IL")} מילים</span><span>השינויים נשמרים בלחיצה על כפתור השמירה</span></div>
        <input ref={contentInputRef} type="hidden" name="content" defaultValue={initialContent} />
      </div>
    </div>
  );
}
