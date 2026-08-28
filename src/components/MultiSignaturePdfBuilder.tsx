"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { SignatureField } from "@/lib/documents";

const initialSigners = [
  { id: "side-a", label: "צד ראשון", color: "#38bdf8" },
  { id: "side-b", label: "צד שני", color: "#a78bfa" },
] as Array<{ id: string; label: string; color: string }>;

const signerColors = ["#38bdf8", "#a78bfa", "#34d399", "#f59e0b"];
const signerLabels = ["צד ראשון", "צד שני", "צד שלישי", "צד רביעי"];

export function MultiSignaturePdfBuilder() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [signers, setSigners] = useState(initialSigners);
  const [fileName, setFileName] = useState("");
  const [pdf, setPdf] = useState<PDFDocumentProxy>();
  const [page, setPage] = useState(1);
  const [activeSigner, setActiveSigner] = useState<string>(initialSigners[0].id);
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldWidth, setFieldWidth] = useState(0.3);
  const [fieldHeight, setFieldHeight] = useState(0.1);

  useEffect(() => {
    if (!pdf || !canvasRef.current || !stageRef.current) return;
    let cancelled = false;
    const render = async () => {
      const pdfPage = await pdf.getPage(page);
      const base = pdfPage.getViewport({ scale: 1 });
      const availableWidth = Math.min(820, stageRef.current?.clientWidth ?? 820);
      const viewport = pdfPage.getViewport({ scale: availableWidth / base.width });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.round(viewport.width * ratio);
      canvas.height = Math.round(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      const context = canvas.getContext("2d");
      if (!context) return;
      await pdfPage.render({ canvas, canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] }).promise;
    };
    render().catch(() => setError("לא הצלחנו להציג את העמוד. נסו PDF אחר."));
    const observer = new ResizeObserver(() => void render());
    observer.observe(stageRef.current);
    return () => { cancelled = true; observer.disconnect(); };
  }, [page, pdf]);

  async function loadPdf(file?: File) {
    setError("");
    setFields([]);
    setPdf(undefined);
    if (!file) { setFileName(""); return; }
    if (file.type !== "application/pdf" || file.size > 4 * 1024 * 1024) {
      setError("יש לבחור קובץ PDF בגודל של עד 4MB.");
      return;
    }
    setLoading(true);
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const loaded = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      setPdf(loaded);
      setFileName(file.name);
      setPage(1);
    } catch {
      setError("הקובץ אינו PDF תקין או שהוא מוגן בסיסמה.");
    } finally {
      setLoading(false);
    }
  }

  function addSigner() {
    if (signers.length >= 4) return;
    const usedLabels = new Set(signers.map((signer) => signer.label));
    const index = signerLabels.findIndex((label) => !usedLabels.has(label));
    setSigners((current) => [...current, { id: `side-${Date.now()}-${index}`, label: signerLabels[index], color: signerColors[index] }]);
  }

  function removeSigner(id: string) {
    if (signers.length <= 2) return;
    const remaining = signers.filter((signer) => signer.id !== id);
    setSigners(remaining);
    setFields((current) => current.filter((field) => field.signerId !== id));
    if (activeSigner === id) setActiveSigner(remaining[0].id);
  }

  function placeField(event: React.PointerEvent<HTMLDivElement>) {
    if (!pdf || !canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const width = fieldWidth, height = fieldHeight;
    const x = Math.min(1 - width, Math.max(0, (event.clientX - bounds.left) / bounds.width - width / 2));
    const y = Math.min(1 - height, Math.max(0, (event.clientY - bounds.top) / bounds.height - height / 2));
    setFields((current) => [
      ...current.filter((field) => field.signerId !== activeSigner),
      { id: `field-${activeSigner}`, signerId: activeSigner, page, x, y, width, height },
    ]);
  }

  const complete = signers.every((signer) => fields.some((field) => field.signerId === signer.id));

  function resizeActiveField(width: number, height: number) {
    setFieldWidth(width); setFieldHeight(height);
    setFields((current) => current.map((field) => field.signerId === activeSigner ? { ...field, width, height, x: Math.min(field.x, 1 - width), y: Math.min(field.y, 1 - height) } : field));
  }

  return (
    <div className="space-y-5">
      <ol className="grid grid-cols-3 gap-2 text-center text-xs font-bold"><li className="rounded-xl bg-electric/10 px-2 py-3 text-electric-bright">1. בחירת PDF</li><li className={`rounded-xl px-2 py-3 ${pdf ? "bg-electric/10 text-electric-bright" : "bg-white/5 text-silver-muted"}`}>2. הוספת חותמים</li><li className={`rounded-xl px-2 py-3 ${complete ? "bg-green-400/10 text-green-100" : "bg-white/5 text-silver-muted"}`}>3. סימון חתימות</li></ol>
      <label className="block text-sm font-semibold text-silver">
        שם המסמך
        <input name="pdfTitle" required placeholder="למשל: הסכם בין דוד לשרה" className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" />
      </label>
      <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file && fileInputRef.current) { const transfer = new DataTransfer(); transfer.items.add(file); fileInputRef.current.files = transfer.files; void loadPdf(file); } }} className="rounded-2xl border border-dashed border-electric/35 bg-electric/[0.05] p-6 text-center">
        <input ref={fileInputRef} name="pdfFile" type="file" accept="application/pdf,.pdf" required onChange={(event) => void loadPdf(event.target.files?.[0])} className="sr-only" />
        <p className="font-bold text-white">גררו לכאן PDF או בחרו קובץ</p>
        <p className="mt-1 text-xs text-silver-muted">עד 4MB · הקובץ מוצג לפני יצירת קישורי החתימה</p>
        <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-secondary mt-4 min-h-10 px-5 py-2 text-sm">בחירת קובץ</button>
        {fileName ? <p className="mt-3 text-sm font-bold text-green-200">נבחר: {fileName}</p> : null}
      </div>
      {error ? <p className="rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-white">החותמים במסמך</p><p className="text-xs text-silver-muted">אפשר להוסיף עד ארבעה חותמים ולסמן לכל אחד מקום נפרד.</p></div><button type="button" onClick={addSigner} disabled={signers.length >= 4} className="rounded-full border border-electric/30 px-4 py-2 text-sm font-bold text-electric-bright disabled:opacity-40">+ הוספת חותם</button></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {signers.map((signer, index) => (
          <fieldset key={signer.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <legend className="px-2 text-sm font-bold" style={{ color: signer.color }}>{signer.label}</legend>
            {signers.length > 2 ? <button type="button" onClick={() => removeSigner(signer.id)} className="float-left text-xs text-red-200 hover:text-red-100">הסרה</button> : null}
            <input type="hidden" name={`signer${index + 1}Id`} value={signer.id} />
            <input type="hidden" name={`signer${index + 1}Label`} value={signer.label} />
            <label className="block text-xs font-semibold text-silver">שם מלא<input name={`signer${index + 1}Name`} required className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-white" /></label>
            <label className="mt-3 block text-xs font-semibold text-silver">תעודת זהות<input name={`signer${index + 1}IdentityNumber`} required inputMode="numeric" pattern="[0-9]{9}" maxLength={9} autoComplete="off" className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-white" /></label>
            <label className="mt-3 block text-xs font-semibold text-silver">אימייל (אופציונלי)<input name={`signer${index + 1}Email`} type="email" className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-white" /></label>
            <label className="mt-3 block text-xs font-semibold text-silver">טלפון (אופציונלי)<input name={`signer${index + 1}Phone`} type="tel" className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-white" /></label>
          </fieldset>
        ))}
      </div>
      {pdf ? (
        <div className="rounded-2xl border border-white/10 bg-[#07111f] p-3 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {signers.map((signer) => (
                <button key={signer.id} type="button" onClick={() => setActiveSigner(signer.id)} className={`rounded-full border px-4 py-2 text-sm font-bold ${activeSigner === signer.id ? "border-sky-300 bg-sky-300/15 text-white" : "border-white/15 text-silver"}`}>
                  מיקום חתימת {signer.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-silver">
              <button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-white/15 px-3 py-1.5 disabled:opacity-30">הקודם</button>
              <span>עמוד {page} מתוך {pdf.numPages}</span>
              <button type="button" disabled={page === pdf.numPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-white/15 px-3 py-1.5 disabled:opacity-30">הבא</button>
            </div>
          </div>
          <p className="mb-3 text-sm text-silver-muted">בחרו צד ולחצו על המקום במסמך שבו תופיע החתימה שלו.</p>
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3"><span className="text-xs font-bold text-silver">גודל אזור החתימה:</span><button type="button" onClick={() => resizeActiveField(0.24, 0.08)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-silver">קטן</button><button type="button" onClick={() => resizeActiveField(0.3, 0.1)} className="rounded-full border border-electric/25 px-3 py-1.5 text-xs text-sky-100">רגיל</button><button type="button" onClick={() => resizeActiveField(0.42, 0.14)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-silver">גדול</button><span className="text-xs text-silver-muted">אפשר לבחור גודל מחדש גם אחרי הסימון.</span></div>
          <div ref={stageRef} className="w-full overflow-auto rounded-xl bg-slate-700/40 p-2">
            <div onPointerDown={placeField} className="relative mx-auto w-fit cursor-crosshair touch-manipulation">
              <canvas ref={canvasRef} className="block max-w-full bg-white shadow-2xl" />
              {fields.filter((field) => field.page === page).map((field) => {
                const signer = signers.find((item) => item.id === field.signerId)!;
                return <div key={field.id} className="pointer-events-none absolute flex items-center justify-center rounded border-2 border-dashed bg-sky-400/15 text-xs font-extrabold text-slate-950" style={{ left: `${field.x * 100}%`, top: `${field.y * 100}%`, width: `${field.width * 100}%`, height: `${field.height * 100}%`, borderColor: signer.color }}>{signer.label}</div>;
              })}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {signers.map((signer) => <span key={signer.id} className={`rounded-full px-3 py-1.5 ${fields.some((field) => field.signerId === signer.id) ? "bg-green-400/10 text-green-200" : "bg-amber-400/10 text-amber-200"}`}>{signer.label}: {fields.some((field) => field.signerId === signer.id) ? "המיקום סומן" : "טרם סומן"}</span>)}
          </div>
        </div>
      ) : loading ? <p className="text-center text-sm text-silver-muted">טוען את המסמך…</p> : null}
      <input type="hidden" name="signatureFields" value={JSON.stringify(fields)} />
      <input type="hidden" name="signerCount" value={signers.length} />
      <button className="btn btn-primary w-full" type="submit" disabled={!pdf || !complete}>
        יצירת {signers.length} קישורים אישיים לחתימה
      </button>
      {pdf && !complete ? <p className="text-center text-xs text-amber-200">יש לסמן במסמך מקום חתימה לכל אחד מהחותמים.</p> : null}
    </div>
  );
}
