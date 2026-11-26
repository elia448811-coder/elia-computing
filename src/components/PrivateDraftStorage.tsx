"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createDraftCipher, type DraftCipher } from "@/lib/local-draft-cipher";
import { migrateLocalPdfDraft } from "@/lib/pdf-local-draft";

const Context = createContext<DraftCipher | null>(null);
export function PrivateDraftStorage({ children }: { children: ReactNode }) {
  const [cipher] = useState(createDraftCipher);
  useEffect(() => {
    // Upgrade existing drafts on this device, even if the user opens a different dashboard tab.
    try {
      for (const name of Object.keys(localStorage)) {
        if (name === "elia-workspace-draft-v1" || name.startsWith("elia-document-draft:")) void cipher.migrateText(name).catch(() => {});
      }
      void migrateLocalPdfDraft(cipher).catch(() => {});
    } catch { /* The browser may disable local storage. */ }
    const revoke = () => cipher.forget();
    window.addEventListener("pagehide", revoke);
    return () => { window.removeEventListener("pagehide", revoke); revoke(); };
  }, [cipher]);
  return <Context.Provider value={cipher}>{children}</Context.Provider>;
}
export function usePrivateDrafts() {
  const cipher = useContext(Context);
  if (!cipher) throw new Error("private-draft-storage-required");
  return cipher;
}
