"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/login/actions";
function Submit() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="q-button q-primary" type="submit">
      {pending ? "מאמת פרטים…" : "כניסה לאזור האישי"}
    </button>
  );
}
export function PasswordLoginForm({ error, reauthenticate }: { error?: string; reauthenticate: boolean }) {
  const [visible, setVisible] = useState(false);
  const messages: Record<string, string> = {
    invalid: "שם המשתמש או הסיסמה אינם נכונים.",
    locked: "בוצעו יותר מדי ניסיונות. נסו שוב בעוד 15 דקות.",
    totp: "נדרש קוד תקין מהמאמת או קוד שחזור.",
    unavailable: "הכניסה אינה זמינה כרגע. נסו שוב בהמשך.",
  };
  return (
    <form action={loginAction} className="q-login-form">
      {reauthenticate && <input type="hidden" name="reauth" value="1" />}
      <label className="q-label">
        שם משתמש
        <input
          name="username"
          autoComplete="username"
          required
          maxLength={160}
          className="q-input"
          dir="auto"
        />
      </label>
      <label className="q-label">
        סיסמה
        <span className="q-password-field">
          <input
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            required
            maxLength={256}
            className="q-input"
            dir="ltr"
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            aria-label={visible ? "הסתרת סיסמה" : "הצגת סיסמה"}
          >
            {visible ? "הסתרה" : "הצגה"}
          </button>
        </span>
      </label>
      <details open={error === "totp" || undefined}>
        <summary>יש לכם אימות דו־שלבי?</summary>
        <label className="q-label">
          קוד מהמאמת או קוד שחזור
          <input
            name="totpCode"
            autoComplete="one-time-code"
            maxLength={14}
            className="q-input"
            dir="ltr"
          />
        </label>
      </details>
      {error ? (
        <p role="alert" className="q-alert q-error">
          {messages[error] || messages.invalid}
        </p>
      ) : null}
      <Submit />
    </form>
  );
}
