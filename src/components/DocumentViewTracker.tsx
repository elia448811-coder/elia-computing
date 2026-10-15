"use client";
import { useEffect } from "react";

export function DocumentViewTracker({ token }: { token: string }) {
  useEffect(() => {
    let recorded = false;
    function record() {
      if (recorded || document.visibilityState !== "visible") return;
      recorded = true;
      void fetch(`/api/sign/${token}/view`, { method: "POST", credentials: "same-origin" }).catch(() => {});
    }
    record();
    document.addEventListener("visibilitychange", record);
    return () => document.removeEventListener("visibilitychange", record);
  }, [token]);
  return null;
}
