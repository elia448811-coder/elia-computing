"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { createDocumentAction } from "@/app/dashboard/actions";
import { SignerFields, blankSigner } from "@/components/SignerFields";
import { documentTemplates, type DocumentTemplateKey } from "@/data/documentTemplates";
import type { Customer } from "@/lib/customers";
import type { EditorDraft, WorkspaceDraft } from "@/lib/workspace-types";

const RichDocumentEditor = dynamic(() => import("@/components/RichDocumentEditor").then((module) => module.RichDocumentEditor), { ssr: false, loading: () => <p className="p-8 text-silver">טוען את העורך…</p> });
const LOCAL_KEY = "elia-workspace-draft-v1";
type DraftEnvelope = { data: WorkspaceDraft; revision: string | null };
function initialEditor(): EditorDraft { return { title: documentTemplates.blank.title, content: documentTemplates.blank.html, template: "blank", pageOrientation: "portrait", pageHeader: "", pageFooter: "", showPageNumbers: true, fontFamily: "Heebo", lineHeight: "1.75" }; }

export function CreateDocumentFlow({ customers, customer, error }: { customers: Customer[]; customer?: Customer; error?: string }) {
  const [draft, setDraft] = useState<WorkspaceDraft>(() => ({ version: 1, updatedAt: "", signers: [{ id: "initial-signer", label: "הלקוח", name: "", identityNumber: "", email: "", phone: "" }], editor: initialEditor(), step: 1 }));
  const [ready, setReady] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [status, setStatus] = useState("טוען טיוטה…");
  const [conflict, setConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const revisionRef = useRef<string | null>(null);
  const latest = useRef(draft);
  const savedJson = useRef("");
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const paused = useRef(false);
  const [editorInitial, setEditorInitial] = useState(initialEditor);
  useEffect(() => { latest.current = draft; }, [draft]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let local: DraftEnvelope | null = null;
      try {
        local = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "null");
        if (!local) {
          const legacy = JSON.parse(localStorage.getItem("elia-document-draft:new-document") ?? "null");
          if (legacy?.content && legacy?.title) local = { revision: null, data: { version: 1, updatedAt: legacy.savedAt ?? new Date().toISOString(), step: 2, signers: [blankSigner()], editor: { ...initialEditor(), ...legacy } } };
        }
      } catch { /* Empty or unavailable local storage. */ }
      let chosen = local;
      try {
        const response = await fetch("/api/dashboard/draft", { cache: "no-store" });
        if (!response.ok) throw new Error("load");
        const cloud = await response.json() as DraftEnvelope | null;
        if (cloud && !(local && local.revision === cloud.revision && local.data.updatedAt > cloud.data.updatedAt)) chosen = cloud;
        revisionRef.current = cloud?.revision ?? null;
        if (!cloud && local?.revision) chosen = null; // A confirmed save on another device removed this draft.
      } catch { setStatus("החיבור לענן לא זמין. הטיוטה נשמרת במכשיר."); }
      if (cancelled) return;
      let next = chosen?.data;
      if (!next?.editor || !Array.isArray(next.signers) || next.signers.length === 0) next = { ...latest.current, signers: [blankSigner()] };
      if (customer) { next = { ...next, step: 2, signers: [{ ...blankSigner(), name: customer.fullName, identityNumber: customer.identityNumber, email: customer.email, phone: customer.phone }] }; }
      setEditorInitial(next.editor);
      setDraft(next);
      latest.current = next;
      setEditorKey((key) => key + 1);
      setReady(true);
    }
    void load();
    return () => { cancelled = true; };
  }, [customer]);

  const persist = useCallback(() => {
    queue.current = queue.current.then(async () => {
      const data = latest.current;
      const json = JSON.stringify(data);
      if (paused.current) return false;
      if (savedJson.current === json) return true;
      setStatus("שומר טיוטה…");
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ data, revision: revisionRef.current })); } catch { setStatus("אין מקום לשמירה במכשיר. מנסה לשמור בענן…"); }
      try {
        const response = await fetch("/api/dashboard/draft", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data, revision: revisionRef.current }) });
        if (response.status === 409) { paused.current = true; setConflict(true); setStatus("קיימת טיוטה חדשה ממכשיר אחר. העותק המקומי נשמר."); return false; }
        if (!response.ok) throw new Error("save");
        const saved = await response.json() as DraftEnvelope;
        revisionRef.current = saved.revision;
        savedJson.current = json;
        try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ data, revision: saved.revision })); } catch { /* Cloud copy succeeded. */ }
        setStatus(`נשמר בענן ובמכשיר · ${new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`);
        return true;
      } catch { setStatus("השמירה בענן לא הצליחה. העותק במכשיר נשמר כשאפשר."); return false; }
    });
    return queue.current;
  }, []);
  useEffect(() => {
    if (!ready || submitting) return;
    const timer = setTimeout(() => void persist(), 900);
    return () => clearTimeout(timer);
  }, [draft, ready, submitting, persist]);
  const updateEditor = useCallback((editor: EditorDraft) => setDraft((current) => ({ ...current, editor, updatedAt: new Date().toISOString() })), []);
  function go(step: number) {
    if (step >= 3 && draft.signers.some((signer) => !signer.name.trim() || !/^\d{9}$/.test(signer.identityNumber) || signer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signer.email))) { setMessage("יש להשלים שם, תעודת זהות בת 9 ספרות ואימייל תקין אם הוזן."); return; }
    if (step === 4 && draft.signers.some((signer) => !draft.editor.content.includes(`data-signer-id="${signer.id}"`))) { setMessage("יש לסמן בעורך מקום חתימה לכל חותם לפני הבדיקה הסופית."); return; }
    setMessage("");
    setDraft((current) => ({ ...current, step, updatedAt: new Date().toISOString() }));
  }
  if (!ready) return <p className="glass rounded-2xl p-8 text-silver" role="status">טוען טיוטה…</p>;
  const template = draft.editor.template in documentTemplates ? draft.editor.template as DocumentTemplateKey : "blank";
  return <section className="glass rounded-2xl p-4 sm:p-7">
    <div className="mb-5 flex flex-wrap justify-between gap-3"><h2 className="text-2xl font-bold text-white">מסמך חדש</h2><span className="text-sm text-silver" role="status">{status}</span></div>
    {conflict ? <div className="mb-4 rounded-xl border border-amber-200/30 p-4 text-sm text-silver">{status}<button type="button" className="btn btn-secondary mr-3 text-sm" onClick={() => window.location.reload()}>טעינת הטיוטה מהענן</button></div> : null}
    <ol className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">{["בחירת מסמך", "לקוחות וחותמים", "תוכן וחתימות", "בדיקה ושמירה"].map((label, index) => <li key={label}><button type="button" aria-current={draft.step === index + 1 ? "step" : undefined} className={`w-full rounded-xl border p-3 text-right text-sm ${draft.step === index + 1 ? "border-electric bg-electric/15 text-white" : "border-white/10 text-silver"}`} onClick={() => go(index + 1)}>{index + 1}. {label}</button></li>)}</ol>
    {error || message ? <p role="alert" className="mb-4 rounded-xl bg-red-300/10 p-4 text-red-100">{message || (error === "signature-fields" ? "יש להוסיף מקום חתימה לכל חותם." : error === "open-fields" ? "יש להשלים את השדות הפתוחים במסמך." : "בדקו את פרטי החותמים ואת שדות החובה. הטיוטה נשמרה.")}</p> : null}
    <form onSubmit={(event) => { if (draft.step !== 4) event.preventDefault(); }} action={async (formData) => {
      setSubmitting(true);
      await persist();
      if (paused.current) { setSubmitting(false); return; }
      paused.current = true;
      formData.set("draftRevision", revisionRef.current ?? "");
      try { await createDocumentAction(formData); }
      finally { paused.current = false; setSubmitting(false); }
    }}>
      <div hidden={draft.step !== 1} className="space-y-4"><p className="text-silver">בחרו תבנית להתחלה. אפשר לערוך את כל התוכן בהמשך.</p><div className="grid gap-3 sm:grid-cols-2">{Object.entries(documentTemplates).map(([key, value]) => <button className={`rounded-xl border p-4 text-right ${template === key ? "border-electric bg-electric/10 text-white" : "border-white/15 text-silver"}`} key={key} type="button" onClick={() => { const editor = { ...initialEditor(), title: value.title, content: value.html, template: key }; setEditorInitial(editor); updateEditor(editor); setEditorKey((current) => current + 1); }}><strong>{value.label}</strong></button>)}</div></div>
      <div hidden={draft.step !== 2}><SignerFields customers={customers} signers={draft.signers} onChange={(signers) => setDraft((current) => ({ ...current, signers, updatedAt: new Date().toISOString() }))} /></div>
      <input type="hidden" name="htmlSigners" value={JSON.stringify(draft.signers)} />
      <div hidden={draft.step !== 3}><RichDocumentEditor key={editorKey} managedDraft initialTitle={editorInitial.title} initialContent={editorInitial.content} initialTemplate={editorInitial.template in documentTemplates ? editorInitial.template as DocumentTemplateKey : "blank"} initialOrientation={editorInitial.pageOrientation} initialPageHeader={editorInitial.pageHeader} initialPageFooter={editorInitial.pageFooter} initialShowPageNumbers={editorInitial.showPageNumbers} initialFontFamily={editorInitial.fontFamily} initialLineHeight={editorInitial.lineHeight} initialWarrantyAgreement={editorInitial.warrantyAgreement} signers={draft.signers} onDraftChange={updateEditor} /></div>
      {draft.step === 4 ? <div className="space-y-4"><h3 className="text-xl font-bold text-white">{draft.editor.title}</h3><p className="text-sm text-silver">{draft.signers.map((signer) => signer.name).join(" · ")}</p><iframe title="בדיקה סופית של המסמך" sandbox="" className="h-[55vh] w-full rounded-xl border border-white/15 bg-white" srcDoc={`<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><style>body{font-family:Arial;line-height:1.8;padding:24px;color:#241b21}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}.signature-field{display:inline-block;border:1px dashed #997776;padding:12px;margin:8px}</style></head><body>${draft.editor.content}</body></html>`} /><p className="text-sm text-silver-muted">השמירה יוצרת קישורים אישיים. שליחה במייל מתבצעת מהספרייה לאחר השמירה.</p></div> : null}
      <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-5"><button type="button" className="btn btn-secondary" disabled={draft.step === 1 || submitting} onClick={() => go(draft.step - 1)}>חזרה</button>{draft.step < 4 ? <button key="next" type="button" className="btn btn-primary" onClick={() => go(draft.step + 1)}>המשך</button> : <button key="save" type="submit" className="btn btn-primary" disabled={submitting || conflict}>{submitting ? "שומר…" : "שמירה ויצירת קישורי חתימה"}</button>}</div>
    </form>
  </section>;
}
