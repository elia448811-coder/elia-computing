"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";

export function PdfDocumentPreview({ src, title }: { src: string; title: string }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const linkId = useId();

  useEffect(() => {
    let disposed = false;
    let loadingTask: PDFDocumentLoadingTask | undefined;
    const controller = new AbortController();
    setPdf(null);
    setPage(1);
    setLoading(true);
    setRendering(false);
    setError("");

    async function load() {
      try {
        const url = new URL(src, window.location.href);
        if (url.origin !== window.location.origin) throw new Error("invalid-source");
        const response = await fetch(url, {
          cache: "no-store",
          credentials: "same-origin",
          mode: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("load-failed");
        const data = await response.arrayBuffer();
        if (disposed) return;
        const pdfjs = await import("pdfjs-dist");
        if (disposed) return;
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        loadingTask = pdfjs.getDocument({ data });
        const document = await loadingTask.promise;
        if (disposed) return;
        setRendering(true);
        setPdf(document);
      } catch {
        if (!disposed) setError("לא ניתן לטעון את המסמך כרגע. אפשר לנסות שוב או לפתוח את ה־PDF בחלון נפרד.");
      } finally {
        if (!disposed) setLoading(false);
      }
    }
    void load();
    return () => {
      disposed = true;
      controller.abort();
      renderTaskRef.current?.cancel();
      if (loadingTask) void loadingTask.destroy().catch(() => {});
    };
  }, [src, retry]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!pdf || !stage) return;
    let disposed = false;
    let generation = 0;
    let frame = 0;
    let lastWidth = 0;

    async function render() {
      const current = ++generation;
      const previous = renderTaskRef.current;
      previous?.cancel();
      if (previous) await previous.promise.catch(() => {});
      if (disposed || current !== generation) return;
      let task: RenderTask | undefined;
      try {
        setRendering(true);
        const pdfPage = await pdf!.getPage(page);
        const canvas = canvasRef.current;
        if (disposed || current !== generation || !canvas) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const width = Math.max(1, Math.min(820, stage!.clientWidth - 24));
        const viewport = pdfPage.getViewport({ scale: width / base.width });
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(viewport.width * ratio);
        canvas.height = Math.round(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("canvas-unavailable");
        task = pdfPage.render({ canvas, canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
        renderTaskRef.current = task;
        await task.promise;
      } catch (reason) {
        if (!disposed && current === generation && !(reason instanceof Error && reason.name === "RenderingCancelledException")) {
          setError("לא ניתן להציג את העמוד. אפשר לנסות שוב או לפתוח את ה־PDF בחלון נפרד.");
        }
      } finally {
        if (task && renderTaskRef.current === task) renderTaskRef.current = null;
        if (!disposed && current === generation) setRendering(false);
      }
    }

    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { void render(); });
    }
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width !== lastWidth) { lastWidth = width; schedule(); }
    });
    observer.observe(stage);
    schedule();
    return () => {
      disposed = true;
      generation++;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderTaskRef.current?.cancel();
    };
  }, [pdf, page, src]);

  function changePage(next: number) {
    setRendering(true);
    setError("");
    setPage(next);
  }

  return (
    <section aria-label={`תצוגת ${title}`} aria-busy={loading || rendering} className="overflow-hidden rounded-2xl border border-white/15 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/5 p-3">
        <div className="flex flex-wrap items-center gap-2" aria-label="ניווט בעמודי המסמך">
          <button type="button" className="btn btn-secondary min-h-10 px-3 py-2 text-sm" disabled={!pdf || loading || rendering || page <= 1} onClick={() => changePage(page - 1)}>העמוד הקודם</button>
          <span className="text-sm text-silver" aria-live="polite">{pdf ? `עמוד ${page} מתוך ${pdf.numPages}` : "מסמך PDF"}</span>
          <button type="button" className="btn btn-secondary min-h-10 px-3 py-2 text-sm" disabled={!pdf || loading || rendering || page >= pdf.numPages} onClick={() => changePage(page + 1)}>העמוד הבא</button>
        </div>
        <a id={linkId} href={src} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-electric-bright underline underline-offset-4">פתיחת PDF בחלון נפרד<span className="sr-only"> (נפתח בחלון חדש)</span></a>
      </div>
      <div ref={stageRef} className="min-h-60 overflow-auto bg-white p-3">
        {loading || rendering ? <p role="status" className="p-6 text-center text-sm text-silver">{loading ? "טוען את המסמך…" : "מציג את העמוד…"}</p> : null}
        {error ? <div role="alert" className="p-6 text-center"><p className="text-sm text-red-200">{error}</p><button type="button" className="btn btn-secondary mt-4 text-sm" onClick={() => setRetry((value) => value + 1)}>ניסיון נוסף</button></div> : null}
        <canvas ref={canvasRef} role="img" aria-label={`${title}, עמוד ${page}`} aria-describedby={linkId} className={`${loading || rendering || error ? "hidden" : "block"} mx-auto max-w-full bg-white`}>לקריאת המסמך אפשר לפתוח את ה־PDF בחלון נפרד באמצעות הקישור שמעל התצוגה.</canvas>
      </div>
    </section>
  );
}
