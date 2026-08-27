import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { Logo } from "@/components/Logo";
import { isAuthenticated } from "@/lib/auth";

export const metadata: Metadata = { title: "כניסה לחתימות מרובות", robots: { index: false } };

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/dashboard");
  return (
    <main id="main" className="flex min-h-screen items-center justify-center px-4 py-28">
      <div className="glass w-full max-w-md rounded-[var(--radius-xl)] p-7 sm:p-10">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <Logo variant="for-dark" className="h-16 w-16 rounded-full" sizes="64px" />
          <span className="font-bold text-white">אליה שירותי מחשוב</span>
        </Link>
        <h1 className="text-center text-3xl font-bold text-white">חתימות מרובות</h1>
        <p className="mt-2 text-center text-silver-muted">ניהול מסמכים ועד ארבעה חותמים עם קישורים אישיים</p>
        <div className="mt-7"><GoogleLoginButton /></div>
      </div>
    </main>
  );
}
