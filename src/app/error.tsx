"use client";
import Link from "next/link";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main"
      className="quotes-app flex min-h-[75vh] items-center justify-center px-6 py-32"
    >
      <section className="q-card max-w-xl text-center">
        <p className="quote-eyebrow">ננסה שוב בעוד רגע</p>
        <h1 className="my-5 text-3xl font-bold">לא הצלחנו לטעון את העמוד.</h1>
        <p>אפשר לנסות לטעון שוב. אם הבעיה חוזרת, פנו אלינו ונעזור.</p>
        <div className="q-actions mt-7 justify-center">
          <button onClick={reset} className="q-button q-primary">
            ניסיון נוסף
          </button>
          <Link href="/" className="q-button q-secondary">
            חזרה לאתר
          </Link>
        </div>
      </section>
    </main>
  );
}
