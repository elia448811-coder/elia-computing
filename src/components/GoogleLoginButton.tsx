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
      const response = await fetch("/api/auth/firebase-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: await result.user.getIdToken() }),
      });
      if (!response.ok) {
        await signOut(auth);
        setError("לא הצלחנו לאמת את חשבון Google. נסו שוב.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (reason) {
      const code = reason && typeof reason === "object" && "code" in reason ? String(reason.code) : "";
      if (code !== "auth/popup-closed-by-user") setError("הכניסה עם Google לא הושלמה. נסו שוב.");
    } finally {
      setBusy(false);
    }
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
