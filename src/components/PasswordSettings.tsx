"use client";
import { useActionState } from "react";
import { setCredentialsAction } from "@/app/dashboard/credential-actions";
export function PasswordSettings() {
  const [result, action, pending] = useActionState(setCredentialsAction, {
    ok: false,
    message: "",
  });
  return (
    <section className="glass mt-5 rounded-2xl p-5 quotes-app">
      <h3 className="text-lg font-bold text-white">שם משתמש וסיסמה</h3>
      <p className="mt-2 text-sm text-silver-muted">
        הגדירו פרטי כניסה לבחירתכם. אפשר להמשיך להשתמש גם בכניסה עם Google. אם
        הופעל אימות דו־שלבי, יש להזין קוד תקין לעדכון.
      </p>
      <form action={action} className="q-form-grid mt-5">
        <label className="q-label">
          שם משתמש
          <input
            name="username"
            required
            minLength={3}
            maxLength={160}
            autoComplete="username"
            dir="ltr"
            className="q-input"
          />
        </label>
        <label className="q-label">
          קוד מאמת / שחזור (אם הופעל)
          <input
            name="totpCode"
            autoComplete="one-time-code"
            maxLength={14}
            dir="ltr"
            className="q-input"
          />
        </label>
        <label className="q-label">
          סיסמה חדשה
          <input
            name="password"
            type="password"
            required
            minLength={12}
            maxLength={256}
            autoComplete="new-password"
            dir="ltr"
            className="q-input"
          />
        </label>
        <label className="q-label">
          אימות הסיסמה
          <input
            name="confirmation"
            type="password"
            required
            minLength={12}
            maxLength={256}
            autoComplete="new-password"
            dir="ltr"
            className="q-input"
          />
        </label>
        <p className="q-full q-help">
          לפחות 12 תווים, אות גדולה וקטנה באנגלית, ספרה וסימן מיוחד.
        </p>
        {result.message ? (
          <p
            className={`q-full q-alert ${result.ok ? "q-success" : "q-error"}`}
            role={result.ok ? "status" : "alert"}
          >
            {result.message}
          </p>
        ) : null}
        <button disabled={pending} className="q-button q-primary" type="submit">
          {pending ? "שומר…" : "שמירת פרטי כניסה"}
        </button>
      </form>
    </section>
  );
}
