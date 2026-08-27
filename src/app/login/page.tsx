import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { isAuthenticated } from "@/lib/auth";
import { loginAction } from "./actions";

export const metadata: Metadata = { title: "כניסה לחתימות מרובות", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAuthenticated()) redirect("/dashboard");
  const { error } = await searchParams;
  return (
    <main id="main" className="flex min-h-screen items-center justify-center px-4 py-28">
      <div className="glass w-full max-w-md rounded-[var(--radius-xl)] p-7 sm:p-10">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <Logo variant="for-dark" className="h-16 w-16 rounded-full" sizes="64px" />
          <span className="font-bold text-white">אליה שירותי מחשוב</span>
        </Link>
        <h1 className="text-center text-3xl font-bold text-white">חתימות מרובות</h1>
        <p className="mt-2 text-center text-silver-muted">ניהול מסמכים, שני קישורים וחתימות ידניות</p>
        {error ? <p className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-center text-sm text-red-200">{error === "locked" ? "הכניסה נחסמה זמנית לאחר מספר ניסיונות. נסו שוב בעוד 15 דקות." : "שם המשתמש או הסיסמה אינם נכונים"}</p> : null}
        <form action={loginAction} className="mt-7 space-y-5">
          <label className="block text-sm font-semibold text-silver">שם משתמש<input name="username" autoComplete="username" required className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" /></label>
          <label className="block text-sm font-semibold text-silver">סיסמה<input name="password" type="password" autoComplete="current-password" required className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white" /></label>
          <button className="btn btn-primary w-full" type="submit">כניסה למערכת</button>
        </form>
      </div>
    </main>
  );
}
