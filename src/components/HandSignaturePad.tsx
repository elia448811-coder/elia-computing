"use client";

import { useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

export function HandSignaturePad({ name = "signature" }: { name?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const image = canvas.toDataURL("image/png");
      const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(ratio, ratio);
      context.lineWidth = 2.6;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#0f172a";
      if (value) {
        const previous = new Image();
        previous.onload = () => context.drawImage(previous, 0, 0, width, height);
        previous.src = image;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [value]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }
  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = point(event);
  }
  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !lastPointRef.current) return;
    const next = point(event), context = event.currentTarget.getContext("2d");
    if (!context) return;
    context.beginPath();
    context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    lastPointRef.current = next;
  }
  function finish(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    setValue(event.currentTarget.toDataURL("image/png"));
  }
  function clear() {
    const canvas = canvasRef.current, context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    setValue("");
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border-2 border-dashed border-sky-300/50 bg-white">
        <canvas
          ref={canvasRef}
          className="block h-48 w-full touch-none cursor-crosshair"
          aria-label="משטח לציור חתימה ביד"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={finish}
        />
      </div>
      <input type="hidden" name={name} value={value} required />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-silver-muted">חתמו בתוך המסגרת בעזרת האצבע או העכבר.</p>
        <button type="button" onClick={clear} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-silver hover:text-white">
          ניקוי החתימה
        </button>
      </div>
    </div>
  );
}
