"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
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
type PageOrientation = "portrait" | "landscape";
type RichDocumentEditorProps = {
  initialTitle?: string;
  initialContent?: string;
  initialTemplate?: DocumentTemplateKey;
  initialOrientation?: PageOrientation;
  initialPageHeader?: string;
  initialPageFooter?: string;
  initialShowPageNumbers?: boolean;
  initialFontFamily?: string;
  initialLineHeight?: string;
  draftKey?: string;
};

const fontFamilies = [
  ["Heebo", "Heebo"],
  ["Arial", "Arial"],
  ["David Libre", "David"],
  ["Times New Roman", "Times New Roman"],
] as const;

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
  initialOrientation = "portrait",
  initialPageHeader = "",
  initialPageFooter = "",
  initialShowPageNumbers = true,
  initialFontFamily = "Heebo",
  initialLineHeight = "1.75",
  draftKey = "new-document",
}: RichDocumentEditorProps) {
  const initialDecoratedContent = decorateQuickFields(initialContent);
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const contentInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const allowOpenFieldsRef = useRef<HTMLInputElement>(null);
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
  const [pageOrientation, setPageOrientation] = useState<PageOrientation>(initialOrientation);
  const [pageHeader, setPageHeader] = useState(initialPageHeader);
  const [pageFooter, setPageFooter] = useState(initialPageFooter);
  const [showPageNumbers, setShowPageNumbers] = useState(initialShowPageNumbers);
  const [fontFamily, setFontFamily] = useState(initialFontFamily);
  const [lineHeight, setLineHeight] = useState(initialLineHeight);
  const [zoom, setZoom] = useState(100);
  const [activeCommands, setActiveCommands] = useState<Set<string>>(() => new Set());
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const storageKey = `elia-document-draft:${draftKey}`;
  const toolbarButton = "inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] px-2.5 text-sm font-bold text-silver transition hover:border-electric/35 hover:bg-electric/[0.08] hover:text-white";

  const updatePageMetrics = useCallback(() => {
    const paper = editorRef.current ?? previewRef.current;
    if (!paper) return;
    const nextPageHeight = Math.max(520, paper.clientWidth * (pageOrientation === "landscape" ? 210 / 297 : 297 / 210));
    setPageHeight(nextPageHeight);
    setPageCount(Math.max(1, Math.ceil(paper.scrollHeight / nextPageHeight)));
  }, [pageOrientation]);

  const saveDraft = useCallback((nextContent = content) => {
    if (!draftReadyRef.current) return;
    setDraftStatus("saving");
    const savedAt = new Date();
    window.localStorage.setItem(storageKey, JSON.stringify({ version: 2, title, content: nextContent, template, warrantyAgreement, pageOrientation, pageHeader, pageFooter, showPageNumbers, fontFamily, lineHeight, savedAt: savedAt.toISOString() }));
    setLastSavedAt(savedAt);
    setDraftStatus("saved");
  }, [content, fontFamily, lineHeight, pageFooter, pageHeader, pageOrientation, showPageNumbers, storageKey, template, title, warrantyAgreement]);

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
    window.requestAnimationFrame(updateActiveCommands);
  }

  const updateActiveCommands = useCallback(() => {
    const selection = window.getSelection();
    if (!selection?.anchorNode || !editorRef.current?.contains(selection.anchorNode)) return;
    const commands = ["bold", "italic", "underline", "insertUnorderedList", "insertOrderedList", "justifyRight", "justifyCenter", "justifyLeft"];
    setActiveCommands(new Set(commands.filter((item) => document.queryCommandState(item))));
  }, []);

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

  function printDocument() {
    const next = editorRef.current?.innerHTML ?? content;
    if (printRef.current) printRef.current.innerHTML = next;
    setContent(next);
    window.setTimeout(() => window.print(), 50);
  }

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (stored) {
          const draft = JSON.parse(stored) as { title?: string; content?: string; template?: DocumentTemplateKey; warrantyAgreement?: string; pageOrientation?: PageOrientation; pageHeader?: string; pageFooter?: string; showPageNumbers?: boolean; fontFamily?: string; lineHeight?: string; savedAt?: string };
          if (draft.title && draft.content && draft.template && documentTemplates[draft.template]) {
            const restoredContent = decorateQuickFields(draft.content);
            setTitle(draft.title);
            setContent(restoredContent);
            setTemplate(draft.template);
            setWarrantyAgreement(draft.warrantyAgreement ?? "");
            setPageOrientation(draft.pageOrientation === "landscape" ? "landscape" : initialOrientation);
            setPageHeader(draft.pageHeader ?? initialPageHeader);
            setPageFooter(draft.pageFooter ?? initialPageFooter);
            setShowPageNumbers(draft.showPageNumbers ?? initialShowPageNumbers);
            setFontFamily(draft.fontFamily ?? initialFontFamily);
            setLineHeight(draft.lineHeight ?? initialLineHeight);
            if (draft.savedAt) setLastSavedAt(new Date(draft.savedAt));
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

    return () => {
      window.clearTimeout(restoreTimer);
    };
  }, [initialFontFamily, initialLineHeight, initialOrientation, initialPageFooter, initialPageHeader, initialShowPageNumbers, storageKey]);

  useEffect(() => {
    if (!draftReadyRef.current) return;
    setDraftStatus("saving");
    const timer = window.setTimeout(() => saveDraft(), 700);
    return () => window.clearTimeout(timer);
  }, [content, fontFamily, lineHeight, pageFooter, pageHeader, pageOrientation, saveDraft, showPageNumbers, template, title, warrantyAgreement]);

  useEffect(() => {
    const form = editorRef.current?.closest("form");
    if (!form) return;
    const validateBeforeSubmit = (event: Event) => {
      const currentContent = editorRef.current?.innerHTML ?? content;
      const plain = currentContent.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
      const unresolved = Array.from(new Set([
        ...(plain.match(/\[[^\]]{2,100}\]/g) ?? []),
        ...(plain.match(/_{4,}/g) ?? []).map(() => "קווים ריקים"),
      ])).slice(0, 8);
      if (unresolved.length) {
        const approved = window.confirm(`נמצאו פרטים שעדיין לא מולאו:\n\n${unresolved.join("\n")}\n\nהאם ליצור בכל זאת קישור לחתימה?`);
        if (!approved) { event.preventDefault(); return; }
        if (allowOpenFieldsRef.current) allowOpenFieldsRef.current.value = "true";
      }
      window.localStorage.removeItem(storageKey);
    };
    form.addEventListener("submit", validateBeforeSubmit);
    return () => form.removeEventListener("submit", validateBeforeSubmit);
  }, [content, storageKey]);

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
    document.addEventListener("selectionchange", updateActiveCommands);
    return () => document.removeEventListener("selectionchange", updateActiveCommands);
  }, [updateActiveCommands]);

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
  const statusText = draftStatus === "saving" ? "שומר טיוטה…" : draftStatus === "restoring" ? "טוען טיוטה…" : `הטיוטה נשמרה${lastSavedAt ? ` ב־${lastSavedAt.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}` : " בדפדפן"}`;
  const paperWidthClass = pageOrientation === "landscape" ? "max-w-[1120px]" : "max-w-[860px]";
  const paperAspectRatio = pageOrientation === "landscape" ? "297 / 210" : "210 / 297";

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
              <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-2 text-xs font-semibold text-emerald-100" role="status" aria-live="polite">{statusText}</span><button type="button" onClick={() => { if (window.confirm("למחוק את הטיוטה השמורה בדפדפן?")) { window.localStorage.removeItem(storageKey); setLastSavedAt(null); } }} className="rounded-full border border-white/10 px-3 py-2 text-xs text-silver hover:text-white">מחיקת טיוטה</button>
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
          <details className="mt-4 rounded-xl border border-white/10 bg-black/10 p-3">
            <summary className="cursor-pointer text-sm font-bold text-white">הגדרות עמוד, גופן ותצוגה</summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-semibold text-silver">כותרת עליונה<input value={pageHeader} onChange={(event) => setPageHeader(event.target.value)} placeholder="למשל: אליה שירותי מחשוב" className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#091627] px-3 py-2.5 text-sm text-white" /></label>
              <label className="text-xs font-semibold text-silver">כותרת תחתונה<input value={pageFooter} onChange={(event) => setPageFooter(event.target.value)} placeholder="למשל: מסמך חסוי" className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#091627] px-3 py-2.5 text-sm text-white" /></label>
              <label className="text-xs font-semibold text-silver">גופן<select value={fontFamily} onChange={(event) => setFontFamily(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#091627] px-3 py-2.5 text-sm text-white">{fontFamilies.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-xs font-semibold text-silver">מרווח בין שורות<select value={lineHeight} onChange={(event) => setLineHeight(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#091627] px-3 py-2.5 text-sm text-white"><option value="1.35">צפוף</option><option value="1.5">רגיל</option><option value="1.75">מרווח</option><option value="2">כפול</option></select></label>
              <label className="text-xs font-semibold text-silver">זום<select value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#091627] px-3 py-2.5 text-sm text-white">{[75, 90, 100, 110, 125].map((value) => <option key={value} value={value}>{value}%</option>)}</select></label>
              <label className="flex items-center gap-2 self-end rounded-xl border border-white/10 px-3 py-2.5 text-sm text-silver"><input type="checkbox" checked={showPageNumbers} onChange={(event) => setShowPageNumbers(event.target.checked)} className="accent-sky-400" />הצגת מספרי עמודים</label>
            </div>
          </details>
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
            <div className={`sticky ${fullscreen ? "top-0" : "top-[140px]"} z-30 rounded-t-[24px] border-b border-white/10 bg-[#081526]/95 shadow-lg backdrop-blur-xl`} role="toolbar" aria-label="כלי עריכת מסמך">
              <div className="flex items-center gap-1.5 overflow-x-auto p-3 sm:px-4" dir="rtl">
                <select aria-label="סגנון טקסט" title="סגנון טקסט" className="h-10 w-32 shrink-0 rounded-lg border border-white/10 bg-[#0b192b] px-2 text-sm font-bold text-white" defaultValue="p" onChange={(event) => command("formatBlock", event.target.value)}><option value="p">טקסט רגיל</option><option value="h2">כותרת ראשית</option><option value="h3">כותרת משנה</option><option value="blockquote">ציטוט</option></select>
                <label className="flex h-10 shrink-0 items-center gap-1 rounded-lg border border-electric/30 bg-electric/[0.08] px-2 text-xs font-bold text-electric-bright" title="גודל גופן במספרים">גודל<select aria-label="גודל גופן במספרים" defaultValue="12" onChange={(event) => applyFontSize(event.target.value)} className="h-8 w-16 rounded-md border border-white/15 bg-[#0b192b] px-1 text-center text-sm font-black text-white">{[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 72].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
                <span className="mx-1 h-7 w-px shrink-0 bg-white/10" aria-hidden="true" />
                <button type="button" title="מודגש" aria-label="מודגש" aria-pressed={activeCommands.has("bold")} onClick={() => command("bold")} className={`${toolbarButton} min-w-10 text-base ${activeCommands.has("bold") ? "border-electric/50 bg-electric/20 text-white" : ""}`}>B</button><button type="button" title="נטוי" aria-label="נטוי" aria-pressed={activeCommands.has("italic")} onClick={() => command("italic")} className={`${toolbarButton} min-w-10 font-serif text-base italic ${activeCommands.has("italic") ? "border-electric/50 bg-electric/20 text-white" : ""}`}>I</button><button type="button" title="קו תחתון" aria-label="קו תחתון" aria-pressed={activeCommands.has("underline")} onClick={() => command("underline")} className={`${toolbarButton} min-w-10 text-base underline ${activeCommands.has("underline") ? "border-electric/50 bg-electric/20 text-white" : ""}`}>U</button>
                <span className="mx-1 h-7 w-px shrink-0 bg-white/10" aria-hidden="true" />
                <button type="button" title="רשימת נקודות" aria-label="רשימת נקודות" aria-pressed={activeCommands.has("insertUnorderedList")} onClick={() => command("insertUnorderedList")} className={`${toolbarButton} min-w-10 text-lg ${activeCommands.has("insertUnorderedList") ? "border-electric/50 bg-electric/20 text-white" : ""}`}>☷</button><button type="button" title="רשימה ממוספרת" aria-label="רשימה ממוספרת" aria-pressed={activeCommands.has("insertOrderedList")} onClick={() => command("insertOrderedList")} className={`${toolbarButton} min-w-10 ${activeCommands.has("insertOrderedList") ? "border-electric/50 bg-electric/20 text-white" : ""}`}>1.</button>
                <button type="button" title="יישור לימין" aria-label="יישור לימין" aria-pressed={activeCommands.has("justifyRight")} onClick={() => command("justifyRight")} className={`${toolbarButton} min-w-10 text-sm ${activeCommands.has("justifyRight") ? "border-electric/50 bg-electric/20 text-white" : ""}`}>≡▸</button><button type="button" title="מרכוז" aria-label="מרכוז" aria-pressed={activeCommands.has("justifyCenter")} onClick={() => command("justifyCenter")} className={`${toolbarButton} min-w-10 text-lg ${activeCommands.has("justifyCenter") ? "border-electric/50 bg-electric/20 text-white" : ""}`}>≣</button><button type="button" title="יישור לשמאל" aria-label="יישור לשמאל" aria-pressed={activeCommands.has("justifyLeft")} onClick={() => command("justifyLeft")} className={`${toolbarButton} min-w-10 text-sm ${activeCommands.has("justifyLeft") ? "border-electric/50 bg-electric/20 text-white" : ""}`}>◂≡</button>
                <button type="button" title="הגדלת הזחה" aria-label="הגדלת הזחה" onClick={() => command("indent")} className={`${toolbarButton} min-w-10 text-lg`}>⇥</button><button type="button" title="הקטנת הזחה" aria-label="הקטנת הזחה" onClick={() => command("outdent")} className={`${toolbarButton} min-w-10 text-lg`}>⇤</button>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto border-t border-white/[0.08] bg-black/10 p-3 sm:px-4" dir="rtl">
                <button type="button" title="ביטול פעולה" aria-label="ביטול פעולה" onClick={() => command("undo")} className={`${toolbarButton} min-w-10 text-lg`}>↶</button><button type="button" title="חזרה על פעולה" aria-label="חזרה על פעולה" onClick={() => command("redo")} className={`${toolbarButton} min-w-10 text-lg`}>↷</button>
                <button type="button" title="הוספת קישור" aria-label="הוספת קישור" onClick={addLink} className={`${toolbarButton} min-w-10 text-lg`}>🔗</button><button type="button" title="קו מפריד" aria-label="קו מפריד" onClick={() => command("insertHorizontalRule")} className={`${toolbarButton} min-w-10 text-lg`}>―</button><button type="button" title="הוספת טבלה" aria-label="הוספת טבלה" onClick={addTable} className={`${toolbarButton} min-w-10 text-lg`}>▦</button>
                <label className={`${toolbarButton} min-w-10 cursor-pointer px-1`} title="צבע טקסט"><span className="border-b-4 border-sky-400 px-1 text-base font-black">A</span><input aria-label="צבע טקסט" type="color" defaultValue="#0f172a" onChange={(event) => command("foreColor", event.target.value)} className="h-0 w-0 opacity-0" /></label><label className={`${toolbarButton} min-w-10 cursor-pointer px-1`} title="צבע הדגשה"><span className="rounded bg-yellow-200 px-1 text-base font-black text-slate-900">A</span><input aria-label="צבע הדגשה" type="color" defaultValue="#fef08a" onChange={(event) => command("hiliteColor", event.target.value)} className="h-0 w-0 opacity-0" /></label>
                <button type="button" title="ניקוי עיצוב" aria-label="ניקוי עיצוב" onClick={() => command("removeFormat")} className={`${toolbarButton} min-w-10`}>Tx</button>
                <select aria-label="הוספת שדה חכם" title="הוספת שדה חכם" defaultValue="" onChange={(event) => { if (event.target.value) insertQuickField(event.target.value); event.target.value = ""; }} className="h-10 w-36 shrink-0 rounded-lg border border-electric/25 bg-[#0b192b] px-2 text-sm font-bold text-sky-100"><option value="">+ שדה חכם</option>{quickFields.map((field) => <option key={field} value={field}>{field}</option>)}</select>
                <label className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-[#0b192b] px-2 text-xs font-bold text-silver">כיוון דף<select aria-label="כיוון הדף" value={pageOrientation} onChange={(event) => setPageOrientation(event.target.value as PageOrientation)} className="h-8 rounded-md border border-white/10 bg-[#091627] px-2 text-sm font-bold text-white"><option value="portrait">לאורך</option><option value="landscape">לרוחב</option></select></label>
                <button type="button" onClick={printDocument} title="הדפסת המסמך" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-green-300/25 bg-green-300/[0.08] px-3 text-sm font-bold text-green-100 transition hover:bg-green-300/[0.14]"><span aria-hidden="true">▣</span> הדפסה</button>
                <button type="button" onClick={() => setFullscreen((value) => !value)} className="mr-auto inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-electric/30 bg-electric/10 px-3 text-sm font-bold text-electric-bright transition hover:bg-electric/15">{fullscreen ? "יציאה ממצב כתיבה" : "מצב כתיבה"}</button>
              </div>
            </div>
            <div className="overflow-auto bg-[radial-gradient(circle_at_50%_0%,rgba(69,200,255,.08),transparent_45%)] p-3 sm:p-6 lg:p-8">
              <div className={`relative mx-auto w-full ${paperWidthClass}`} style={{ zoom: zoom / 100 } as CSSProperties}>{pageGuides}{pageHeader ? <div className="pointer-events-none absolute inset-x-12 top-5 z-20 border-b border-slate-200 pb-2 text-center text-xs text-slate-500">{pageHeader}</div> : null}<div ref={editorRef} data-orientation={pageOrientation} contentEditable suppressContentEditableWarning onInput={sync} dangerouslySetInnerHTML={{ __html: content }} style={{ colorScheme: "only light", aspectRatio: paperAspectRatio, fontFamily, lineHeight }} className="document-paper rich-editor relative w-full overflow-hidden rounded-md border border-slate-200 bg-white px-6 py-12 text-right text-slate-900 shadow-[0_24px_70px_rgba(0,0,0,.38)] focus:outline-none focus:ring-2 focus:ring-electric sm:px-12 sm:py-16" />{(pageFooter || showPageNumbers) ? <div className="pointer-events-none absolute inset-x-12 bottom-5 z-20 flex justify-between border-t border-slate-200 pt-2 text-xs text-slate-500"><span>{pageFooter}</span>{showPageNumbers ? <span>עמוד 1 מתוך {pageCount}</span> : null}</div> : null}</div>
            </div>
          </div>
        ) : (
          <div className="overflow-auto rounded-[24px] border border-white/10 bg-[#020813] p-3 sm:p-6 lg:p-8"><div className={`relative mx-auto w-full ${paperWidthClass}`} style={{ zoom: zoom / 100 } as CSSProperties}>{pageGuides}{pageHeader ? <div className="absolute inset-x-12 top-5 z-20 border-b border-slate-200 pb-2 text-center text-xs text-slate-500">{pageHeader}</div> : null}<div ref={previewRef} data-orientation={pageOrientation} style={{ colorScheme: "only light", aspectRatio: paperAspectRatio, fontFamily, lineHeight }} className="document-paper document-preview relative w-full rounded-md border border-slate-200 bg-white px-6 py-12 text-slate-900 shadow-[0_24px_70px_rgba(0,0,0,.38)] sm:px-12 sm:py-16" dangerouslySetInnerHTML={{ __html: content }} />{(pageFooter || showPageNumbers) ? <div className="absolute inset-x-12 bottom-5 z-20 flex justify-between border-t border-slate-200 pt-2 text-xs text-slate-500"><span>{pageFooter}</span>{showPageNumbers ? <span>עמוד 1 מתוך {pageCount}</span> : null}</div> : null}</div></div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs text-silver-muted"><span className="font-semibold">{wordCount.toLocaleString("he-IL")} מילים · {pageCount.toLocaleString("he-IL")} {pageCount === 1 ? "עמוד" : "עמודים"}</span><span>שמירה אוטומטית פעילה · Ctrl+S לשמירה מיידית</span></div>
        <input ref={contentInputRef} type="hidden" name="content" defaultValue={initialDecoratedContent} />
        <input type="hidden" name="pageOrientation" value={pageOrientation} />
        <input type="hidden" name="pageHeader" value={pageHeader} />
        <input type="hidden" name="pageFooter" value={pageFooter} />
        <input type="hidden" name="showPageNumbers" value={showPageNumbers ? "true" : "false"} />
        <input type="hidden" name="fontFamily" value={fontFamily} />
        <input type="hidden" name="lineHeight" value={lineHeight} />
        <input ref={allowOpenFieldsRef} type="hidden" name="allowOpenFields" defaultValue="false" />
        <div ref={printRef} className="document-print-root document-preview" data-orientation={pageOrientation} dir="rtl" style={{ fontFamily, lineHeight }}><div className="document-print-header">{pageHeader}</div><div dangerouslySetInnerHTML={{ __html: content }} /><div className="document-print-footer"><span>{pageFooter}</span>{showPageNumbers ? <span className="document-page-counter" /> : null}</div></div>
      </div>
    </div>
  );
}
