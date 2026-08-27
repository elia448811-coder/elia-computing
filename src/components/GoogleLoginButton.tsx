"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const allowedEmail = "elia448811@gmail.com";
const firebaseConfig = {
  apiKey: "AIzaSyDkC5gGQo9qgaXSt8FDBUF2eqtMjrTwkmE",
  authDomain: "elia-computing-2026.firebaseapp.com",
  projectId: "elia-computing-2026",
  storageBucket: "elia-computing-2026.firebasestorage.app",
  messagingSenderId: "948903449892",
  appId: "1:948903449892:web:db9b3caf6fe311cc4c8fb1",
};

function firebaseAuth() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  auth.languageCode = "he";
  return auth;
}

export function GoogleLoginButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingIdToken, setPendingIdToken] = useState("");
  const [totpCode, setTotpCode] = useState("");

  async function completeLogin(idToken: string, code = "") {
    const response = await fetch("/api/auth/firebase-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, totpCode: code }),
    });
    const result = await response.json() as { mfaRequired?: boolean; error?: string };
    if (response.status === 202 && result.mfaRequired) {
      setPendingIdToken(idToken);
      setError("");
      return false;
    }
    if (!response.ok) {
      if (result.error === "invalid-totp") setError("הקוד מהמאמת אינו נכון או שפג תוקפו.");
      else if (result.error === "totp-locked") setError("בוצעו יותר מדי ניסיונות. נסו שוב בעוד 15 דקות.");
      else setError("לא הצלחנו לאמת את חשבון Google. נסו שוב.");
      return false;
    }
    router.replace("/dashboard");
    router.refresh();
    return true;
  }

  async function login() {
    setBusy(true);
    setError("");
    const auth = firebaseAuth();
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account", login_hint: allowedEmail });
      const result = await signInWithPopup(auth, provider);
      if (result.user.email?.toLowerCase() !== allowedEmail) {
        await signOut(auth);
        setError("הגישה מותרת רק לחשבון Google של אליה.");
        return;
      }
      if (!(await completeLogin(await result.user.getIdToken()))) {
        if (pendingIdToken) await signOut(auth);
        return;
      }
    } catch (reason) {
      const code = reason && typeof reason === "object" && "code" in reason ? String(reason.code) : "";
      if (code !== "auth/popup-closed-by-user") setError("הכניסה עם Google לא הושלמה. נסו שוב.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyAuthenticatorCode() {
    if (!(/^\d{6}$/.test(totpCode) || /^[A-Z0-9]{4}-?[A-Z0-9]{4}-?[A-Z0-9]{4}$/.test(totpCode)) || !pendingIdToken) {
      setError("יש להזין קוד בן 6 ספרות או קוד שחזור.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await completeLogin(pendingIdToken, totpCode);
    } finally {
      setBusy(false);
    }
  }

  async function cancelTwoFactor() {
    setPendingIdToken("");
    setTotpCode("");
    setError("");
    try {
      await signOut(firebaseAuth());
    } catch {
      // The local Firebase session may already be cleared.
    }
  }

  if (pendingIdToken) {
    return (
      <div>
        <div className="rounded-2xl border border-electric/20 bg-electric/[0.06] p-5">
          <p className="text-center text-sm font-bold text-electric-bright">אימות דו־שלבי</p>
          <p className="mt-2 text-center text-sm leading-relaxed text-silver-muted">הקלידו קוד בן 6 ספרות מהמאמת, או קוד שחזור חד־פעמי.</p>
          <input aria-label="קוד מאפליקציית המאמת או קוד שחזור" value={totpCode} onChange={(event) => setTotpCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 14))} onKeyDown={(event) => { if (event.key === "Enter") void verifyAuthenticatorCode(); }} autoComplete="one-time-code" maxLength={14} placeholder="000000" className="mt-4 w-full rounded-xl border border-white/15 bg-[#091627] px-4 py-3 text-center font-mono text-xl tracking-[0.2em] text-white placeholder:text-silver-muted focus:border-electric/50 focus:outline-none" />
          <button type="button" onClick={verifyAuthenticatorCode} disabled={busy || !(totpCode.length === 6 || totpCode.replace(/-/g, "").length === 12)} className="btn btn-primary mt-3 w-full disabled:cursor-not-allowed disabled:opacity-60">{busy ? "מאמת…" : "אימות וכניסה"}</button>
          <button type="button" onClick={cancelTwoFactor} disabled={busy} className="mt-3 w-full text-center text-sm text-silver-muted hover:text-white">ביטול וחזרה</button>
        </div>
        {error ? <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-center text-sm text-red-200">{error}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={login} disabled={busy} className="btn w-full border border-white/20 bg-white text-slate-900 shadow-lg hover:bg-slate-100 disabled:cursor-wait disabled:opacity-70">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-black text-blue-600" aria-hidden="true">G</span>
        {busy ? "מתחבר לחשבון Google…" : "כניסה עם Google"}
      </button>
      <p className="mt-3 text-center text-xs text-silver-muted">הגישה מוגבלת ל־{allowedEmail}</p>
      {error ? <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-center text-sm text-red-200">{error}</p> : null}
    </div>
  );
}
