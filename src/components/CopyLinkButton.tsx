"use client";

import { useState } from "react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return <button type="button" className="rounded-full border border-electric/30 px-3 py-1.5 text-xs font-bold text-electric-bright" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? "הקישור הועתק" : "העתקת קישור"}</button>;
}
