"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPdfDocumentAction } from "@/app/dashboard/actions";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { SignerFields, blankSigner } from "@/components/SignerFields";
import type { Customer } from "@/lib/customers";
import type { SignatureField } from "@/lib/documents";
import type { PdfDraftData, PdfDraftEnvelope } from "@/lib/pdf-draft-types";
import { readLocalPdfDraft, writeLocalPdfDraft } from "@/lib/pdf-local-draft";
import type { WorkspaceSigner } from "@/lib/workspace-types";

const colors = ["#9f494e", "#6e59a5", "#37785d", "#96621e", "#326b88", "#8c4e7d"];
export function MultiSignaturePdfBuilder({ customers }: { customers: Customer[] }) {
  const [pending, setPending] = useState(false);
  const paused = useRef(false);
  const [signers, setSigners] = useState<WorkspaceSigner[]>([{ id: "first-signer", label: "הלקוח", name: "", identityNumber: "", email: "", phone: "" }]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File>();
  const [pdf, setPdf] = useState<PDFDocumentProxy>();
  const [page, setPage] = useState(1);
  const [step, setStep] = useState(1);
  const [activeSigner, setActiveSigner] = useState("first-signer");
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("טוען טיוטה…");
  const [ready, setReady] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldSize, setFieldSize] = useState([0.3, 0.1]);
  const [revision, setRevision] = useState<string | null>(null);
  const revisionRef = useRef<string | null>(null);
  const uploadedFile = useRef<File | undefined>(undefined);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadGeneration = useRef(0);

  const loadPdf = useCallback(async (next: File, reset = true) => {
    const generation = ++loadGeneration.current;
    setLoading(true); setError("");
    if (reset) { setFile(undefined); setPdf(undefined); setFields([]); }
    if (next.size > 4 * 1024 * 1024 || !next.name.toLowerCase().endsWith(".pdf")) { if (fileInputRef.current) fileInputRef.current.value = ""; setError("יש לבחור PDF בגודל עד 4MB."); setLoading(false); return; }
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const loaded = await pdfjs.getDocument({ data: await next.arrayBuffer() }).promise;
      if (generation !== loadGeneration.current) return;
      setFile(next); setPdf(loaded); setPage(1);
      if (reset) setFields([]);
      if (fileInputRef.current) { const transfer = new DataTransfer(); transfer.items.add(next); fileInputRef.current.files = transfer.files; }
    } catch { setError("הקובץ אינו PDF תקין או שהוא מוגן בסיסמה."); }
    finally { if (generation === loadGeneration.current) setLoading(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      let local;
      try { local = await readLocalPdfDraft(); } catch { /* Browser storage may be unavailable. */ }
      let data = local?.data, nextFile = local?.file;
      try {
        const response = await fetch("/api/dashboard/pdf-draft", { cache: "no-store" });
        if (!response.ok) throw new Error("load");
        const cloud = await response.json() as PdfDraftEnvelope | null;
        revisionRef.current = cloud?.revision ?? null;
        setRevision(cloud?.revision ?? null);
        if (cloud && !(local && local.revision === cloud.revision && local.data.updatedAt > cloud.data.updatedAt)) {
          const fileResponse = await fetch(`/api/dashboard/pdf-draft?file=1&revision=${cloud.revision}`, { cache: "no-store" });
          if (!fileResponse.ok) throw new Error("file");
          data = cloud.data; nextFile = new File([await fileResponse.blob()], data.fileName, { type: "application/pdf" }); uploadedFile.current = nextFile;
        } else if (!cloud && local?.revision) { data = undefined; nextFile = undefined; }
      } catch { setStatus("הענן לא זמין. מנסה לשחזר מהמכשיר."); }
      if (cancelled) return;
      if (data && nextFile) { setTitle(data.title); setSigners(data.signers); setActiveSigner(data.signers[0].id); setFields(data.fields); setStep(data.step); await loadPdf(nextFile, false); }
      else { const signer = blankSigner(); setSigners([signer]); setActiveSigner(signer.id); }
      setReady(true); setStatus(data ? "הטיוטה שוחזרה" : "הטיוטה תישמר אוטומטית לאחר בחירת קובץ");
    }
    void restore();
    return () => { cancelled = true; };
  }, [loadPdf]);

  useEffect(() => () => { void pdf?.loadingTask.destroy(); }, [pdf]);

  useEffect(() => {
    if (!ready || !file || conflict || pending) return;
    const data: PdfDraftData = { title, fileName: file.name, signers, fields, step, updatedAt: new Date().toISOString() };
    void writeLocalPdfDraft({ data, file, revision: revisionRef.current }).catch(() => {});
    const timer = setTimeout(() => {
      queue.current = queue.current.then(async () => {
        if (conflict || paused.current) return;
        setStatus("שומר טיוטת PDF…");
        const form = new FormData(); form.set("data", JSON.stringify(data)); form.set("revision", revisionRef.current ?? "");
        if (uploadedFile.current !== file) form.set("file", file);
        try {
          const response = await fetch("/api/dashboard/pdf-draft", { method: "PUT", body: form });
          if (response.status === 409) { setConflict(true); setStatus("קיימת טיוטה חדשה ממכשיר אחר. העותק במכשיר נשמר."); return; }
          if (!response.ok) throw new Error("save");
          const saved = await response.json() as PdfDraftEnvelope;
          revisionRef.current = saved.revision; setRevision(saved.revision); uploadedFile.current = file;
          await writeLocalPdfDraft({ data, file, revision: saved.revision }).catch(() => {});
          setStatus("טיוטת ה־PDF נשמרה בענן ובמכשיר");
        } catch { setStatus("השמירה בענן לא הצליחה. נשמר עותק במכשיר כשאפשר."); }
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [ready, file, title, signers, fields, step, conflict, pending]);

  useEffect(() => {
    if (!pdf || !canvasRef.current || !stageRef.current || step < 3) return;
    let cancelled = false, generation = 0, task: RenderTask | undefined, frame = 0;
    async function render() {
      const current = ++generation;
      task?.cancel();
      const pdfPage = await pdf!.getPage(page);
      if (cancelled || current !== generation) return;
      const base = pdfPage.getViewport({ scale: 1 }), width = Math.max(240, Math.min(820, (stageRef.current?.clientWidth ?? 820) - 16));
      const viewport = pdfPage.getViewport({ scale: width / base.width });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(viewport.width * ratio); canvas.height = Math.round(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
      const context = canvas.getContext("2d"); if (!context) return;
      task = pdfPage.render({ canvas, canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
      await task.promise;
    }
    function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { void render().catch((reason) => { if (reason?.name !== "RenderingCancelledException" && !cancelled) setError("לא ניתן להציג את העמוד."); }); }); }
    const observer = new ResizeObserver(schedule); observer.observe(stageRef.current); schedule();
    return () => { cancelled = true; cancelAnimationFrame(frame); task?.cancel(); observer.disconnect(); };
  }, [pdf, page, step]);

  const complete = signers.every((signer) => fields.some((field) => field.signerId === signer.id));
  function go(next: number) {
    if (next > 1 && (!pdf || !title.trim())) { setError("יש לבחור קובץ ולהזין שם למסמך."); return; }
    if (next > 2 && signers.some((signer) => !signer.name.trim() || !/^\d{9}$/.test(signer.identityNumber) || signer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signer.email))) { setError("יש להשלים את שם החותם, תעודת הזהות וכתובת אימייל תקינה אם הוזנה."); return; }
    if (next === 4 && !complete) { setError("יש לסמן מקום חתימה לכל חותם."); return; }
    setError(""); setStep(next);
  }
  function placeField(event: React.PointerEvent<HTMLDivElement>) {
    if (!canvasRef.current || step !== 3) return;
    const bounds = canvasRef.current.getBoundingClientRect(), [width, height] = fieldSize;
    const x = Math.min(1 - width, Math.max(0, (event.clientX - bounds.left) / bounds.width - width / 2)), y = Math.min(1 - height, Math.max(0, (event.clientY - bounds.top) / bounds.height - height / 2));
    setFields((current) => [...current.filter((field) => field.signerId !== activeSigner), { id: `field-${activeSigner}`, signerId: activeSigner, page, x, y, width, height }]);
  }
  if (!ready) return <p className="p-6 text-silver">טוען טיוטת PDF…</p>;
  return <form onSubmit={(event) => { if (step !== 4) event.preventDefault(); }} action={async (formData) => { if (!file) { setError("יש לבחור קובץ PDF."); return; } paused.current = true; setPending(true); await queue.current; formData.set("pdfFile", file); formData.set("pdfDraftRevision", revisionRef.current ?? ""); try { await createPdfDocumentAction(formData); } finally { paused.current = false; setPending(false); } }} className="space-y-5">
    <p className="text-sm text-silver" role="status">{status}</p>{conflict ? <button type="button" className="btn btn-secondary" onClick={() => location.reload()}>טעינת הטיוטה מהענן</button> : null}
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">{["בחירת PDF", "לקוחות וחותמים", "מיקום חתימות", "בדיקה ושמירה"].map((label, index) => <li key={label}><button type="button" aria-current={step === index + 1 ? "step" : undefined} className={`w-full rounded-xl border p-3 text-right text-sm ${step === index + 1 ? "border-electric bg-electric/15 text-white" : "border-white/10 text-silver"}`} onClick={() => go(index + 1)}>{index + 1}. {label}</button></li>)}</ol>
    {error ? <p role="alert" className="rounded-xl bg-red-300/10 p-3 text-sm text-red-100">{error}</p> : null}
    <div hidden={step !== 1}><label className="text-sm text-silver">שם המסמך<input className="workspace-input" name="pdfTitle" required value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} /></label><div className="mt-5 rounded-xl border border-dashed border-electric/40 p-6 text-center" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const next = event.dataTransfer.files[0]; if (next) void loadPdf(next); }}><input className="sr-only" ref={fileInputRef} name="pdfFile" type="file" accept="application/pdf,.pdf" onChange={(event) => { const next = event.target.files?.[0]; if (next) void loadPdf(next); }} /><p className="text-silver">גררו PDF לכאן · עד 4MB</p><button className="btn btn-secondary mt-4" type="button" disabled={loading} onClick={() => fileInputRef.current?.click()}>{loading ? "טוען…" : "בחירת קובץ"}</button>{file ? <p className="mt-3 text-sm text-electric-bright">{file.name} · {pdf?.numPages} עמודים</p> : null}</div></div>
    <div hidden={step !== 2}><SignerFields signers={signers} customers={customers} onChange={(next) => { setSigners(next); setFields((current) => current.filter((field) => next.some((signer) => signer.id === field.signerId))); if (!next.some((signer) => signer.id === activeSigner)) setActiveSigner(next[0].id); }} /></div>
    {signers.map((signer, index) => <div key={signer.id}>{Object.entries({ Id: signer.id, Label: signer.label, Name: signer.name, IdentityNumber: signer.identityNumber, Email: signer.email, Phone: signer.phone }).map(([key, value]) => <input type="hidden" key={key} name={`signer${index + 1}${key}`} value={value} />)}</div>)}
    <div hidden={step < 3}>
      {step === 4 ? <div className="mb-4 text-silver"><h3 className="text-xl font-bold text-white">{title}</h3><p className="mt-2 text-sm">{signers.map((signer) => signer.name).join(" · ")}</p><p className="mt-2 text-sm">בדקו שהחתימות ממוקמות נכון. שליחה במייל מתבצעת מהספרייה אחרי השמירה.</p></div> : <div className="mb-4 space-y-3"><p className="text-sm text-silver">בחרו חותם ולחצו על המקום במסמך שבו תופיע חתימתו.</p><div className="flex flex-wrap gap-2">{signers.map((signer, index) => <button className={`rounded-full border px-4 py-2 text-sm ${activeSigner === signer.id ? "border-electric bg-electric/15 text-white" : "border-white/15 text-silver"}`} type="button" key={signer.id} onClick={() => setActiveSigner(signer.id)}>{index + 1}. {signer.name || signer.label}{fields.some((field) => field.signerId === signer.id) ? " ✓" : ""}</button>)}</div><div className="flex flex-wrap gap-2">{([["קטן", 0.24, 0.08], ["רגיל", 0.3, 0.1], ["גדול", 0.42, 0.14]] as const).map(([label, width, height]) => <button type="button" key={label} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-silver" onClick={() => { setFieldSize([width, height]); setFields((current) => current.map((field) => field.signerId === activeSigner ? { ...field, width, height, x: Math.min(field.x, 1 - width), y: Math.min(field.y, 1 - height) } : field)); }}>{label}</button>)}</div></div>}
      <div className="mb-3 flex items-center justify-between gap-2 text-sm text-silver"><button type="button" className="btn btn-secondary min-h-10" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>העמוד הקודם</button><span>עמוד {page} מתוך {pdf?.numPages ?? 0}</span><button type="button" className="btn btn-secondary min-h-10" disabled={!pdf || page >= pdf.numPages} onClick={() => setPage((current) => current + 1)}>העמוד הבא</button></div>
      <div ref={stageRef} className="overflow-auto rounded-xl bg-black/15 p-2"><div onPointerDown={placeField} className={`relative mx-auto w-fit ${step === 3 ? "cursor-crosshair" : ""}`}><canvas ref={canvasRef} className="block max-w-full bg-white" />{fields.filter((field) => field.page === page).map((field) => { const index = signers.findIndex((signer) => signer.id === field.signerId); return <div key={field.id} className="pointer-events-none absolute flex items-center justify-center overflow-hidden rounded border-2 border-dashed bg-white/80 px-1 text-center text-xs font-bold text-ink" style={{ left: `${field.x * 100}%`, top: `${field.y * 100}%`, width: `${field.width * 100}%`, height: `${field.height * 100}%`, borderColor: colors[index] }}>{signers[index]?.name || signers[index]?.label}</div>; })}</div></div>
    </div>
    <input type="hidden" name="signatureFields" value={JSON.stringify(fields)} /><input type="hidden" name="signerCount" value={signers.length} /><input type="hidden" name="pdfDraftRevision" value={revision ?? ""} />
    <div className="flex flex-wrap justify-between gap-3 border-t border-white/10 pt-4"><button className="btn btn-secondary" type="button" disabled={step === 1 || pending} onClick={() => go(step - 1)}>חזרה</button>{step < 4 ? <button key="next" className="btn btn-primary" type="button" disabled={loading} onClick={() => go(step + 1)}>המשך</button> : <button key="save" className="btn btn-primary" type="submit" disabled={!pdf || !complete || conflict || pending}>{pending ? "שומר…" : "שמירה ויצירת קישורי חתימה"}</button>}</div>
  </form>;
}
