"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { documentTemplates, type DocumentTemplateKey } from "@/data/documentTemplates";

const quickFields = ["[שם הלקוח]", "[שם העסק]", "[שם הפרויקט]", "[תאריך]", "[סכום]", "[מספר עוסק]", "[חתימת הלקוח]"];
const quickFieldLabels: Record<string, string> = {
  "[שם הלקוח]": "שם הלקוח",
  "[שם העסק]": "שם העסק של הלקוח",
  "[שם הפרויקט]": "שם הפרויקט",
  "[תאריך]": "תאריך",
  "[סכום]": "סכום",
  "[מספר עוסק]": "מספר עוסק / חברה",
  "[חתימת הלקוח]": "חתימת הלקוח",
};

type DraftStatus = "restoring" | "saving" | "saved";
type RichDocumentEditorProps = {
  initialTitle?: string;
  initialContent?: string;
  initialTemplate?: DocumentTemplateKey;
  draftKey?: string;
};

function decorateQuickFields(html: string) {
  const protectedFields: string[] = [];
  const protectedHtml = html.replace(/<span\b[^>]*class="[^"]*quick-field-token[^"]*"[^>]*>.*?<\/span>/g, (token) => {
    const field = token.match(/data-field="([^"]+)"/)?.[1] ?? quickFields.find((candidate) => token.includes(`>${candidate}</span>`));
    const value = token.replace(/^<span\b[^>]*>/, "").replace(/<\/span>$/, "");
    protectedFields.push(field ? `<span class="quick-field-token" contenteditable="true" data-field="${field}">${value}</span>` : token);
    return `__QUICK_FIELD_${protectedFields.length - 1}__`;
  });
  const decorated = quickFields.reduce(
    (result, field) => result.split(field).join(`<span class="quick-field-token" contenteditable="true" data-field="${field}">${field}</span>`),
    protectedHtml,
  );
  return protectedFields.reduce((result, field, index) => result.replace(`__QUICK_FIELD_${index}__`, field), decorated);
}

function clampTableSize(value: string | null) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(8, Math.max(1, parsed)) : 0;
}

export function RichDocumentEditor({
  initialTitle = documentTemplates.blank.title,
  initialContent = documentTemplates.blank.html,
  initialTemplate = "blank",
  draftKey = "new-document",
}: RichDocumentEditorProps) {
  const initialDecoratedContent = decorateQuickFields(initialContent);
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const contentInputRef = useRef<HTMLInputElement>(null);
  const draftReadyRef = useRef(false);
  const [template, setTemplate] = useState<DocumentTemplateKey>(initialTemplate);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(() => decorateQuickFields(initialContent));
  const [warrantyAgreement, setWarrantyAgreement] = useState("");
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [fullscreen, setFullscreen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("restoring");
  const [pageHeight, setPageHeight] = useState(1120);
  const [pageCount, setPageCount] = useState(1);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const storageKey = `elia-document-draft:${draftKey}`;
  const toolbarButton = "inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] px-2.5 text-sm font-bold text-silver transition hover:border-electric/35 hover:bg-electric/[0.08] hover:text-white";

  const updatePageMetrics = useCallback(() => {
    const paper = editorRef.current ?? previewRef.current;
    if (!paper) return;
    const nextPageHeight = Math.max(520, paper.clientWidth * (297 / 210));
    setPageHeight(nextPageHeight);
    setPageCount(Math.max(1, Math.ceil(paper.scrollHeight / nextPageHeight)));
  }, []);

  const saveDraft = useCallback((nextContent = content) => {
    if (!draftReadyRef.current) return;
    setDraftStatus("saving");
    window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, title, content: nextContent, template, warrantyAgreement, savedAt: new Date().toISOString() }));
    setDraftStatus("saved");
  }, [content, storageKey, template, title, warrantyAgreement]);

  const sync = useCallback(() => {
    const next = editorRef.current?.innerHTML ?? content;
    setContent(next);
    if (contentInputRef.current) contentInputRef.current.value = next;
    window.requestAnimationFrame(updatePageMetrics);
  }, [content, updatePageMetrics]);

  function command(name: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
    sync();
  }

  function chooseTemplate(key: DocumentTemplateKey) {
    const next = documentTemplates[key];
    const nextContent = decorateQuickFields(next.html);
    setTemplate(key);
    setTitle(next.title);
    setContent(nextContent);
    setWarrantyAgreement("");
    if (editorRef.current) editorRef.current.innerHTML = nextContent;
    if (contentInputRef.current) contentInputRef.current.value = nextContent;
    window.requestAnimationFrame(updatePageMetrics);
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

  function addTable() {
    const rows = clampTableSize(window.prompt("כמה שורות להוסיף? (1–8)", "3"));
    if (!rows) return;
    const columns = clampTableSize(window.prompt("כמה עמודות להוסיף? (1–8)", "3"));
    if (!columns) return;
    const body = Array.from({ length: rows }, () => `<tr>${Array.from({ length: columns }, () => "<td>תא</td>").join("")}</tr>`).join("");
    command("insertHTML", `<table><tbody>${body}</tbody></table><p><br></p>`);
  }

  function insertQuickField(field: string) {
    command("insertHTML", `<span class="quick-field-token" contenteditable="true" data-field="${field}">${fieldValues[field] || field}</span>&nbsp;`);
  }

  function updateQuickField(field: string, value: string) {
    setFieldValues((current) => ({ ...current, [field]: value }));
    const detachedRoot = document.createElement("div");
    detachedRoot.innerHTML = content;
    const root = editorRef.current || detachedRoot;
    root.querySelectorAll<HTMLElement>(".quick-field-token").forEach((token) => {
      if (token.dataset.field === field) token.textContent = value || field;
    });
    const next = root.innerHTML;
    setContent(next);
    if (contentInputRef.current) contentInputRef.current.value = next;
  }

  function applyFontSize(points: string) {
    editorRef.current?.focus();
    document.execCommand("fontSize", false, "7");
    editorRef.current?.querySelectorAll('font[size="7"]').forEach((font) => {
      const span = document.createElement("span");
      span.style.fontSize = `${points}pt`;
      while (font.firstChild) span.appendChild(font.firstChild);
      font.replaceWith(span);
    });
    sync();
  }

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (stored) {
          const draft = JSON.parse(stored) as { title?: string; content?: string; template?: DocumentTemplateKey; warrantyAgreement?: string };
          if (draft.title && draft.content && draft.template && documentTemplates[draft.template]) {
            const restoredContent = decorateQuickFields(draft.content);
            setTitle(draft.title);
            setContent(restoredContent);
            setTemplate(draft.template);
            setWarrantyAgreement(draft.warrantyAgreement ?? "");
            if (contentInputRef.current) contentInputRef.current.value = restoredContent;
          }
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      } finally {
        draftReadyRef.current = true;
        setDraftStatus("saved");
      }
    }, 0);

    const form = editorRef.current?.closest("form");
    const clearSubmittedDraft = () => window.localStorage.removeItem(storageKey);
    form?.addEventListener("submit", clearSubmittedDraft);
    return () => {
      window.clearTimeout(restoreTimer);
      form?.removeEventListener("submit", clearSubmittedDraft);
    };
  }, [storageKey]);

  useEffect(() => {
    if (!draftReadyRef.current) return;
    setDraftStatus("saving");
    const timer = window.setTimeout(() => saveDraft(), 700);
    return () => window.clearTimeout(timer);
  }, [content, saveDraft, template, title, warrantyAgreement]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        sync();
        saveDraft(editorRef.current?.innerHTML ?? content);
      }
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [content, saveDraft, sync]);

  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [fullscreen]);

  useEffect(() => {
    const paper = editorRef.current ?? previewRef.current;
    if (!paper) return;
    updatePageMetrics();
    const observer = new ResizeObserver(updatePageMetrics);
    observer.observe(paper);
    return () => observer.disconnect();
  }, [content, updatePageMetrics, view]);

  const wordCount = content.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  const statusText = draftStatus === "saving" ? "שומר טיוטה…" : draftStatus === "restoring" ? "טוען טיוטה…" : "הטיוטה נשמרה בדפדפן";

  const pageGuides = (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      {Array.from({ length: pageCount }, (_, index) => (
        <div key={index} className="absolute inset-x-0 border-b border-dashed border-slate-300/90" style={{ top: Math.max(0, ((index + 1) * pageHeight) - 1) }}>
          <span className="absolute bottom-2 left-4 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">עמוד {index + 1}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className={fullscreen ? "fixed inset-0 z-[100] overflow-y-auto bg-[#030914] p-3 sm:p-6" : "rounded-[28px] border border-white/10 bg-[#050d19]/65 p-3 shadow-[0_28px_80px_rgba(0,0,0,.28)] sm:p-5"}>
      <div className="space-y-5">
        <section className="rounded-2xl border border-electric/15 bg-[linear-gradient(135deg,rgba(69,200,255,.08),rgba(255,255,255,.025))] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm font-bold text-electric-bright">הגדרות המסמך</p><p className="mt-1 text-xs text-silver-muted">בחרו תבנית ותנו למסמך שם ברור לפני שמתחילים לכתוב.</p></div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-2 text-xs font-semibold text-emerald-100" role="status" aria-live="polite">{statusText}</span>
              <div className="flex rounded-xl border border-white/10 bg-black/20 p-1" aria-label="מצב תצוגה">
                <button type="button" onClick={() => setView("edit")} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${view === "edit" ? "bg-electric text-slate-950 shadow-lg" : "text-silver hover:text-white"}`}>עריכה</button>
                <button type="button" onClick={() => { sync(); setView("preview"); }} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${view === "preview" ? "bg-electric text-slate-950 shadow-lg" : "text-silver hover:text-white"}`}>תצוגה מקדימה</button>
              </div>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block text-sm font-semibold text-silver">שם המסמך<input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="למשל: הסכם פיתוח עבור כהן בע״מ" className="mt-2 w-full rounded-xl border border-white/15 bg-[#091627] px-4 py-3 text-white placeholder:text-silver-muted focus:border-electric/50 focus:outline-none" /></label>
            <label className="block text-sm font-semibold text-silver">תבנית מקצועית<select name="template" value={template} onChange={(event) => chooseTemplate(event.target.value as DocumentTemplateKey)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#091627] px-4 py-3 text-white focus:border-electric/50 focus:outline-none">{Object.entries(documentTemplates).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
          </div>
        </section>

        {template === "workAgreement" ? <div className="rounded-2xl border border-sky-300/20 bg-sky-300/[0.06] p-4 text-sm leading-relaxed text-sky-100">כל סעיפי החוזה פתוחים לעריכה. השלימו את השדות החכמים המסומנים לפני יצירת הקישור.</div> : null}
        {template === "warrantyPolicy" ? <label className="block rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] p-4 text-sm font-semibold text-amber-50">במסגרת האחריות שלנו סוכם ש...<textarea value={warrantyAgreement} onChange={(event) => updateWarrantyAgreement(event.target.value)} rows={3} placeholder="למשל: האחריות כוללת שתי שעות הדרכה ועדכון אחד במשך 6 חודשים." className="mt-2 w-full rounded-xl border border-white/15 bg-[#0b1729] px-4 py-3 font-normal leading-relaxed text-white placeholder:text-silver-muted" /><span className="mt-2 block text-xs font-normal text-amber-100/70">הטקסט משתלב מיד בסעיף ההסכמות המיוחדות.</span></label> : null}

        {template !== "blank" ? (
          <details open className="rounded-2xl border border-electric/15 bg-electric/[0.045] p-4 sm:p-5">
            <summary className="cursor-pointer font-bold text-white">מילוי אוטומטי של פרטי המסמך</summary>
            <p className="mt-2 text-xs leading-relaxed text-silver-muted">הקלידו פעם אחת והפרט יתעדכן בכל המקומות במסמך. אפשר גם ללחוץ ישירות על שדה כחול בתוך הדף ולערוך אותו ידנית.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quickFields.filter((field) => field !== "[חתימת הלקוח]").map((field) => <label key={field} className="text-xs font-semibold text-silver">{quickFieldLabels[field]}<input value={fieldValues[field] ?? ""} onChange={(event) => updateQuickField(field, event.target.value)} placeholder={field} className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#091627] px-3 py-2.5 text-sm text-white placeholder:text-silver-muted focus:border-electric/45 focus:outline-none" /></label>)}
            </div>
          </details>
        ) : null}

        {view === "edit" ? (
          <div className="overflow-visible rounded-[24px] border border-white/12 bg-[#020813] shadow-2xl">
            <div className={`sticky ${fullscreen ? "top-0" : "top-20"} z-30 rounded-t-[24px] border-b border-white/10 bg-[#081526]/95 shadow-lg backdrop-blur-xl`} role="toolbar" aria-label="כלי עריכת מסמך">
              <div className="flex items-center gap-1.5 overflow-x-auto p-3 [scrollbar-width:thin] sm:px-4" dir="rtl">
                <select aria-label="סגנון טקסט" title="סגנון טקסט" className="h-10 w-32 shrink-0 rounded-lg border border-white/10 bg-[#0b192b] px-2 text-sm font-bold text-white" defaultValue="p" onChange={(event) => command("formatBlock", event.target.value)}><option value="p">טקסט רגיל</option><option value="h2">כותרת ראשית</option><option value="h3">כותרת משנה</option><option value="blockquote">ציטוט</option></select>
                <label className="flex h-10 shrink-0 items-center gap-1 rounded-lg border border-electric/30 bg-electric/[0.08] px-2 text-xs font-bold text-electric-bright" title="גודל גופן במספרים">גודל<select aria-label="גודל גופן במספרים" defaultValue="12" onChange={(event) => applyFontSize(event.target.value)} className="h-8 w-16 rounded-md border border-white/15 bg-[#0b192b] px-1 text-center text-sm font-black text-white">{[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 72].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
                <span className="mx-1 h-7 w-px shrink-0 bg-white/10" aria-hidden="true" />
                <button type="button" title="מודגש" aria-label="מודגש" onClick={() => command("bold")} className={`${toolbarButton} min-w-10 text-base`}>B</button><button type="button" title="נטוי" aria-label="נטוי" onClick={() => command("italic")} className={`${toolbarButton} min-w-10 font-serif text-base italic`}>I</button><button type="button" title="קו תחתון" aria-label="קו תחתון" onClick={() => command("underline")} className={`${toolbarButton} min-w-10 text-base underline`}>U</button>
                <span className="mx-1 h-7 w-px shrink-0 bg-white/10" aria-hidden="true" />
                <button type="button" title="רשימת נקודות" aria-label="רשימת נקודות" onClick={() => command("insertUnorderedList")} className={`${toolbarButton} min-w-10 text-lg`}>☷</button><button type="button" title="רשימה ממוספרת" aria-label="רשימה ממוספרת" onClick={() => command("insertOrderedList")} className={`${toolbarButton} min-w-10`}>1.</button>
                <button type="button" title="יישור לימין" aria-label="יישור לימין" onClick={() => command("justifyRight")} className={`${toolbarButton} min-w-10 text-lg`}>≡</button><button type="button" title="מרכוז" aria-label="מרכוז" onClick={() => command("justifyCenter")} className={`${toolbarButton} min-w-10 text-lg`}>≣</button><button type="button" title="יישור לשמאל" aria-label="יישור לשמאל" onClick={() => command("justifyLeft")} className={`${toolbarButton} min-w-10 text-lg`}>≡</button>
                <button type="button" title="הגדלת הזחה" aria-label="הגדלת הזחה" onClick={() => command("indent")} className={`${toolbarButton} min-w-10 text-lg`}>⇥</button><button type="button" title="הקטנת הזחה" aria-label="הקטנת הזחה" onClick={() => command("outdent")} className={`${toolbarButton} min-w-10 text-lg`}>⇤</button>
                <span className="mx-1 h-7 w-px shrink-0 bg-white/10" aria-hidden="true" />
                <button type="button" title="ביטול פעולה" aria-label="ביטול פעולה" onClick={() => command("undo")} className={`${toolbarButton} min-w-10 text-lg`}>↶</button><button type="button" title="חזרה על פעולה" aria-label="חזרה על פעולה" onClick={() => command("redo")} className={`${toolbarButton} min-w-10 text-lg`}>↷</button>
                <button type="button" title="הוספת קישור" aria-label="הוספת קישור" onClick={addLink} className={`${toolbarButton} min-w-10 text-lg`}>🔗</button><button type="button" title="קו מפריד" aria-label="קו מפריד" onClick={() => command("insertHorizontalRule")} className={`${toolbarButton} min-w-10 text-lg`}>―</button><button type="button" title="הוספת טבלה" aria-label="הוספת טבלה" onClick={addTable} className={`${toolbarButton} min-w-10 text-lg`}>▦</button>
                <label className={`${toolbarButton} min-w-10 cursor-pointer px-1`} title="צבע טקסט"><span className="border-b-4 border-sky-400 px-1 text-base font-black">A</span><input aria-label="צבע טקסט" type="color" defaultValue="#0f172a" onChange={(event) => command("foreColor", event.target.value)} className="h-0 w-0 opacity-0" /></label><label className={`${toolbarButton} min-w-10 cursor-pointer px-1`} title="צבע הדגשה"><span className="rounded bg-yellow-200 px-1 text-base font-black text-slate-900">A</span><input aria-label="צבע הדגשה" type="color" defaultValue="#fef08a" onChange={(event) => command("hiliteColor", event.target.value)} className="h-0 w-0 opacity-0" /></label>
                <button type="button" title="ניקוי עיצוב" aria-label="ניקוי עיצוב" onClick={() => command("removeFormat")} className={`${toolbarButton} min-w-10`}>Tx</button>
                <select aria-label="הוספת שדה חכם" title="הוספת שדה חכם" defaultValue="" onChange={(event) => { if (event.target.value) insertQuickField(event.target.value); event.target.value = ""; }} className="h-10 w-36 shrink-0 rounded-lg border border-electric/25 bg-[#0b192b] px-2 text-sm font-bold text-sky-100"><option value="">+ שדה חכם</option>{quickFields.map((field) => <option key={field} value={field}>{field}</option>)}</select>
                <button type="button" onClick={() => setFullscreen((value) => !value)} className="mr-auto inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-electric/30 bg-electric/10 px-3 text-sm font-bold text-electric-bright transition hover:bg-electric/15">{fullscreen ? "יציאה ממצב כתיבה" : "מצב כתיבה"}</button>
              </div>
            </div>
            <div className="bg-[radial-gradient(circle_at_50%_0%,rgba(69,200,255,.08),transparent_45%)] p-3 sm:p-6 lg:p-8">
              <div className="relative mx-auto w-full max-w-[860px]">{pageGuides}<div ref={editorRef} contentEditable suppressContentEditableWarning onInput={sync} dangerouslySetInnerHTML={{ __html: content }} style={{ colorScheme: "only light" }} className="document-paper rich-editor relative w-full overflow-hidden rounded-md border border-slate-200 bg-white px-6 py-8 text-right leading-8 text-slate-900 shadow-[0_24px_70px_rgba(0,0,0,.38)] focus:outline-none focus:ring-2 focus:ring-electric sm:px-12 sm:py-12" /></div>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-white/10 bg-[#020813] p-3 sm:p-6 lg:p-8"><div className="relative mx-auto w-full max-w-[860px]">{pageGuides}<div ref={previewRef} style={{ colorScheme: "only light" }} className="document-paper document-preview relative w-full rounded-md border border-slate-200 bg-white px-6 py-8 leading-8 text-slate-900 shadow-[0_24px_70px_rgba(0,0,0,.38)] sm:px-12 sm:py-12" dangerouslySetInnerHTML={{ __html: content }} /></div></div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs text-silver-muted"><span className="font-semibold">{wordCount.toLocaleString("he-IL")} מילים · {pageCount.toLocaleString("he-IL")} {pageCount === 1 ? "עמוד" : "עמודים"}</span><span>שמירה אוטומטית פעילה · Ctrl+S לשמירה מיידית</span></div>
        <input ref={contentInputRef} type="hidden" name="content" defaultValue={initialDecoratedContent} />
      </div>
    </div>
  );
}
