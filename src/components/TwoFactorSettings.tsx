"use client";

import Image from "next/image";
import { useState } from "react";
import { beginTwoFactorAction, cancelTwoFactorAction, confirmTwoFactorAction, disableTwoFactorAction } from "@/app/dashboard/two-factor-actions";

type Enrollment = { qrDataUrl: string; secretKey: string };

export function TwoFactorSettings({ initialEnabled, initialRecoveryCodesRemaining = 0 }: { initialEnabled: boolean; initialRecoveryCodesRemaining?: number }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryCodesRemaining, setRecoveryCodesRemaining] = useState(initialRecoveryCodesRemaining);

  function updateCode(value: string) { setCode(value.replace(/\D/g, "").slice(0, 6)); }

  async function begin() {
    setBusy(true); setError(""); setMessage("");
    const result = await beginTwoFactorAction();
    if (result.ok) setEnrollment({ qrDataUrl: result.qrDataUrl, secretKey: result.secretKey });
    else setError("לא הצלחנו להתחיל את ההגדרה. נסו שוב.");
    setBusy(false);
  }

  async function confirm() {
    if (code.length !== 6) return setError("יש להזין קוד בן 6 ספרות.");
    setBusy(true); setError("");
    const result = await confirmTwoFactorAction(code);
    if (result.ok) {
      setEnabled(true); setEnrollment(null); setCode("");
      setRecoveryCodes(result.recoveryCodes);
      setRecoveryCodesRemaining(result.recoveryCodes.length);
      setMessage("האימות הדו־שלבי הופעל. בכניסה הבאה יידרש קוד מהמאמת.");
    } else setError(result.error === "invalid-code" ? "הקוד אינו נכון או שפג תוקפו. המתינו לקוד הבא ונסו שוב." : "לא הצלחנו להפעיל את האימות.");
    setBusy(false);
  }

  async function disable() {
    if (code.length !== 6) return setError("כדי להסיר את האימות יש להזין קוד נוכחי מהמאמת.");
    setBusy(true); setError(""); setMessage("");
    const result = await disableTwoFactorAction(code);
    if (result.ok) {
      setEnabled(false); setCode("");
      setRecoveryCodes([]); setRecoveryCodesRemaining(0);
      setMessage("האימות הדו־שלבי הוסר מהחשבון.");
    } else setError(result.error === "invalid-code" ? "הקוד אינו נכון או שפג תוקפו." : "לא הצלחנו להסיר את האימות.");
    setBusy(false);
  }

  async function cancelEnrollment() {
    setBusy(true);
    await cancelTwoFactorAction();
    setEnrollment(null); setCode(""); setError("");
    setBusy(false);
  }

  return (
    <section className="rounded-2xl border border-electric/20 bg-electric/[0.055] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-bold text-electric-bright">אפליקציית מאמת</p><h3 className="mt-1 text-xl font-bold text-white">אימות דו־שלבי</h3><p className="mt-2 max-w-xl text-sm leading-relaxed text-silver-muted">לאחר הכניסה עם Google תידרשו להקליד קוד מתחלף מאפליקציה כמו Google Authenticator או Microsoft Authenticator.</p></div>
        <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${enabled ? "border-green-300/25 bg-green-300/10 text-green-100" : "border-amber-300/20 bg-amber-300/[0.08] text-amber-100"}`}>{enabled ? "מופעל" : "לא מופעל"}</span>
      </div>

      {!enabled && !enrollment ? <button type="button" onClick={begin} disabled={busy} className="btn btn-primary mt-5 w-full sm:w-auto">{busy ? "מכין QR…" : "הוספת אפליקציית מאמת"}</button> : null}

      {enrollment ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#07111f] p-4 sm:p-5">
          <ol className="space-y-2 text-sm leading-relaxed text-silver"><li><strong className="text-white">1.</strong> פתחו את אפליקציית המאמת ובחרו הוספת חשבון.</li><li><strong className="text-white">2.</strong> סרקו את ה־QR או הזינו את המפתח הידני.</li><li><strong className="text-white">3.</strong> הקלידו כאן את הקוד בן 6 הספרות.</li></ol>
          <div className="mt-4 grid gap-4 sm:grid-cols-[260px_1fr] sm:items-center">
            <div className="mx-auto overflow-hidden rounded-xl bg-white p-2"><Image src={enrollment.qrDataUrl} alt="QR להוספת חשבון באפליקציית המאמת" width={260} height={260} unoptimized /></div>
            <div><p className="text-xs font-semibold text-silver-muted">מפתח להזנה ידנית</p><code dir="ltr" className="mt-2 block break-all rounded-xl border border-white/10 bg-black/25 p-3 text-sm font-bold tracking-widest text-sky-100">{enrollment.secretKey}</code><p className="mt-2 text-xs leading-relaxed text-amber-100/75">שמרו את המפתח בסוד. מי שמחזיק בו יכול ליצור קודי כניסה.</p></div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input aria-label="קוד לאישור הפעלת המאמת" value={code} onChange={(event) => updateCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="rounded-xl border border-white/15 bg-[#091627] px-4 py-3 text-center font-mono text-xl tracking-[0.3em] text-white" /><button type="button" onClick={confirm} disabled={busy || code.length !== 6} className="btn btn-primary disabled:opacity-60">{busy ? "מאמת…" : "אישור והפעלה"}</button><button type="button" onClick={cancelEnrollment} disabled={busy} className="btn btn-secondary">ביטול</button></div>
        </div>
      ) : null}

      {recoveryCodes.length ? <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/[0.07] p-5"><h4 className="font-bold text-amber-50">קודי שחזור חד־פעמיים</h4><p className="mt-2 text-sm leading-relaxed text-amber-100/80">שמרו אותם במקום בטוח. כל קוד עובד פעם אחת במקרה שאין גישה לאפליקציית המאמת.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{recoveryCodes.map((item) => <code key={item} dir="ltr" className="rounded-lg bg-black/20 px-3 py-2 text-center font-bold tracking-wider text-white">{item}</code>)}</div><button type="button" onClick={() => navigator.clipboard.writeText(recoveryCodes.join("\n"))} className="btn btn-secondary mt-4 text-sm">העתקת כל הקודים</button></div> : null}

      {enabled ? <div className="mt-5 rounded-xl border border-red-300/15 bg-red-300/[0.04] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold text-white">הסרת אימות דו־שלבי</p><p className="mt-1 text-xs text-silver-muted">נדרש קוד נוכחי מהמאמת כדי למנוע הסרה לא מורשית.</p></div><span className="rounded-full bg-white/5 px-3 py-1 text-xs text-silver">{recoveryCodesRemaining} קודי שחזור נותרו</span></div><div className="mt-3 flex flex-col gap-3 sm:flex-row"><input aria-label="קוד להסרת המאמת" value={code} onChange={(event) => updateCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="rounded-xl border border-white/15 bg-[#091627] px-4 py-3 text-center font-mono text-xl tracking-[0.3em] text-white" /><button type="button" onClick={disable} disabled={busy || code.length !== 6} className="btn border border-red-300/25 bg-red-300/10 text-red-100 hover:bg-red-300/15 disabled:opacity-60">{busy ? "מסיר…" : "הסרת האימות"}</button></div></div> : null}
      {message ? <p className="mt-4 rounded-xl border border-green-300/20 bg-green-300/[0.08] p-3 text-sm text-green-100" role="status">{message}</p> : null}
      {error ? <p className="mt-4 rounded-xl border border-red-300/20 bg-red-300/[0.08] p-3 text-sm text-red-100" role="alert">{error}</p> : null}
    </section>
  );
}
