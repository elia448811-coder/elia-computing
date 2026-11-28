import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { PasswordLoginForm } from "@/components/PasswordLoginForm";
import { isAuthenticated } from "@/lib/auth";
export const metadata: Metadata = {
  title: "כניסה לניהול העסק",
  robots: { index: false },
  alternates: { canonical: "/login" },
};
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reauth?: string }>;
}) {
  const { error, reauth } = await searchParams;
  const reauthenticate = reauth === "1";
  if (!reauthenticate && await isAuthenticated()) redirect("/dashboard");
  return (
    <main id="main" className="q-login-page quotes-app">
      <div className="q-login-shell">
        <section className="q-login-story">
          <Link href="/" className="q-login-brand">
            <span className="q-login-monogram" aria-hidden="true">E</span><span>אליה שירותי מחשוב</span>
          </Link>
          <div>
            <h1>
              העסק שלך.
              <br />
              בסביבה מסודרת.
            </h1>
            <p>הצעות מחיר, מסמכים ולקוחות. מקום אחד לניהול העבודה היומיומית.</p>
          </div>
          <ul className="q-login-features">
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 3h10l4 4v14H5V3Zm10 0v5h4M8 12h8M8 16h5" /></svg><div><strong>הצעות מחיר</strong><span>יצירה, שליחה ומעקב אחר התשובות</span></div></li>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 20h16M6 15l9-11 4 3-9 11-5 1 1-4ZM13 6l4 3" /></svg><div><strong>מסמכים וחתימות</strong><span>קישורים אישיים ומעקב אחר כל מסמך</span></div></li>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="9" cy="8" r="4" /><path d="M2 21v-2a6 6 0 0 1 12 0v2m2-17a4 4 0 0 1 0 8m2 3a5 5 0 0 1 4 5v1" /></svg><div><strong>כל הלקוחות</strong><span>פרטי קשר והיסטוריית עבודה מרוכזת</span></div></li>
          </ul>
          <p className="q-login-story-footer">האזור האישי של אליה שירותי מחשוב</p>
        </section>
        <section className="q-login-panel">
          <span className="q-login-lock" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v3" /></svg></span>
          <h2>טוב שחזרת</h2>
          <p>{reauthenticate ? "כדי לשנות את הגדרות האבטחה, אמתו שוב את זהותכם." : "התחברו כדי להמשיך לנהל את העסק."}</p>
          <PasswordLoginForm error={error} reauthenticate={reauthenticate} />
          <div className="q-login-divider">
            <span>או ממשיכים עם Google</span>
          </div>
          <GoogleLoginButton reauthenticate={reauthenticate} />
          <Link href="/" className="q-text-link">
            חזרה לאתר
          </Link>
        </section>
      </div>
    </main>
  );
}
