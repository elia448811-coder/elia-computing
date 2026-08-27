"use client";

export function PrintDocumentButton() {
  return <button type="button" onClick={() => window.print()} className="btn btn-secondary no-print text-sm">הדפסה / שמירה כ-PDF</button>;
}
