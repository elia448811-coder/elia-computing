import Link from "next/link";
export default function NotFound() {
  return (
    <main
      id="main"
      className="quotes-app flex min-h-[75vh] items-center justify-center px-6 py-32"
    >
      <section className="q-card max-w-xl text-center">
        <p className="quote-eyebrow">404 · העמוד לא נמצא</p>
        <h1 className="my-5 text-3xl font-bold">נראה שהקישור השתנה.</h1>
        <p>
          העמוד שחיפשתם אינו זמין. אם זה קישור להצעת מחיר או לחתימה, כדאי לבדוק
          שקיבלתם את הקישור המלא.
        </p>
        <div className="q-actions mt-7 justify-center">
          <Link href="/" className="q-button q-primary">
            חזרה לאתר
          </Link>
          <Link href="/login" className="q-button q-secondary">
            כניסה לניהול העסק
          </Link>
        </div>
      </section>
    </main>
  );
}
