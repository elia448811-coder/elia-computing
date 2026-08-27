"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { SignatureField } from "@/lib/documents";

const signers = [
  { id: "side-a", label: "צד ראשון", color: "#38bdf8" },
  { id: "side-b", label: "צד שני", color: "#a78bfa" },
] as const;

export function MultiSignaturePdfBuilder() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy>();
  const [page, setPage] = useState(1);
  const [activeSigner, setActiveSigner] = useState<string>(signers[0].id);
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    if (!file) return;
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
      setPage(1);
    } catch {
      setError("הקובץ אינו PDF תקין או שהוא מוגן בסיסמה.");
    } finally {
      setLoading(false);
    }
  }

  function placeField(event: React.PointerEvent<HTMLDivElement>) {
    if (!pdf || !canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const width = 0.3, height = 0.1;
    const x = Math.min(1 - width, Math.max(0, (event.clientX - bounds.left) / bounds.width - width / 2));
    const y = Math.min(1 - height, Math.max(0, (event.clientY - bounds.top) / bounds.height - height / 2));
    setFields((current) => [
      ...current.filter((field) => field.signerId !== activeSigner),
      { id: `field-${activeSigner}`, signerId: activeSigner, page, x, y, width, height },
    ]);
  }

  const complete = signers.every((signer) => fields.some((field) => field.signerId === signer.id));

  return (
    <div className="space-y-5">
      <label className="block text-sm font-semibold text-silver">
        שם המסמך
        <input name="pdfTitle" required placeholder="למשל: הסכם בין דוד לשרה" className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" />
      </label>
      <label className="block rounded-2xl border border-dashed border-electric/35 bg-electric/[0.05] p-5 text-sm font-semibold text-silver">
        העלאת מסמך PDF
        <input name="pdfFile" type="file" accept="application/pdf,.pdf" required onChange={(event) => void loadPdf(event.target.files?.[0])} className="mt-3 block w-full text-sm text-silver file:ml-3 file:rounded-full file:border-0 file:bg-sky-400 file:px-4 file:py-2 file:font-bold file:text-slate-950" />
        <span className="mt-2 block text-xs font-normal text-silver-muted">קובץ PDF עד 4MB</span>
      </label>
      {error ? <p className="rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {signers.map((signer, index) => (
          <fieldset key={signer.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <legend className="px-2 text-sm font-bold" style={{ color: signer.color }}>{signer.label}</legend>
            <input type="hidden" name={`signer${index + 1}Id`} value={signer.id} />
            <input type="hidden" name={`signer${index + 1}Label`} value={signer.label} />
            <label className="block text-xs font-semibold text-silver">שם מלא<input name={`signer${index + 1}Name`} required className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-white" /></label>
            <label className="mt-3 block text-xs font-semibold text-silver">אימייל (אופציונלי)<input name={`signer${index + 1}Email`} type="email" className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-white" /></label>
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
      <button className="btn btn-primary w-full" type="submit" disabled={!pdf || !complete}>
        יצירת שני קישורים לחתימה
      </button>
      {pdf && !complete ? <p className="text-center text-xs text-amber-200">יש לסמן במסמך מקום חתימה לכל אחד משני הצדדים.</p> : null}
    </div>
  );
}
