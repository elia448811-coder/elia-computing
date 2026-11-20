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
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAuthenticated()) redirect("/dashboard");
  const { error } = await searchParams;
  return (
    <main id="main" className="q-login-page quotes-app">
      <div className="q-login-shell">
        <section className="q-login-story">
          <Link href="/" className="q-login-brand">
            E.<span>אליה שירותי מחשוב</span>
          </Link>
          <div>
            <p className="quote-eyebrow">סדר בעסק. שקט בראש.</p>
            <h1>
              מהצעה טובה
              <br />
              לעבודה הבאה.
            </h1>
            <p>כל הצעות המחיר, הלקוחות והמסמכים שלך — בסביבת עבודה אחת.</p>
          </div>
          <div className="q-login-example" aria-hidden="true">
            <div>
              <span>הצעת מחיר חדשה</span>
              <span className="q-badge q-status-accepted">מוכנה לשליחה</span>
            </div>
            <strong>
              נראה מקצועי.
              <br />
              מרגיש פשוט.
            </strong>
            <div className="q-login-lines">
              <i />
              <i />
              <i />
            </div>
            <span>יוצרים · שולחים · מתקדמים</span>
          </div>
          <p className="q-login-story-footer">כלים חכמים לעסק שלך.</p>
        </section>
        <section className="q-login-panel">
          <p className="quote-eyebrow">האזור האישי</p>
          <h2>טוב שחזרת.</h2>
          <p>התחברו כדי להמשיך לנהל את העסק.</p>
          <PasswordLoginForm error={error} />
          <div className="q-login-divider">
            <span>או ממשיכים עם Google</span>
          </div>
          <GoogleLoginButton />
          <Link href="/" className="q-text-link">
            חזרה לאתר
          </Link>
        </section>
      </div>
    </main>
  );
}
