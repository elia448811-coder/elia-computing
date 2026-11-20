"use client";
import { useState } from "react";
import { QuoteDocument } from "@/components/QuoteDocument";
import {
  quoteDisplayStatus,
  quoteStatusLabels,
  type Quote,
} from "@/lib/quote-types";
export function QuoteCustomerView({
  initialQuote,
  token,
}: {
  initialQuote: Quote;
  token: string;
}) {
  const [quote, setQuote] = useState(initialQuote),
    [name, setName] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const status = quoteDisplayStatus(quote);
  async function respond(action: "accept" | "decline") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/quote/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          name,
          confirmed,
          revision: quote.revision,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setQuote(result.quote);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      setError(
        reason === "expired"
          ? "תוקף ההצעה הסתיים. יש לפנות לאליה לקבלת הצעה מעודכנת."
          : ["conflict", "already-answered"].includes(reason)
            ? "ההצעה עודכנה או שכבר נמסרה תשובה. רעננו את העמוד."
            : "לא הצלחנו לשמור את התשובה. נסו שוב.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="quotes-app quote-customer-view">
      <div className="quote-public-toolbar no-print">
        <div>
          <p className="quote-eyebrow">אליה שירותי מחשוב</p>
          <h1>ההצעה שלכם, במקום אחד.</h1>
        </div>
        <button className="q-button q-secondary" onClick={() => window.print()}>
          הדפסה / שמירה כ־PDF
        </button>
      </div>
      <div className="quote-public-layout">
        <div className="quote-print-root">
          <QuoteDocument
            quote={quote}
            number={quote.number}
            createdAt={quote.createdAt}
          />
        </div>
        <aside className="q-card quote-response no-print">
          <span className={`q-badge q-status-${status}`}>
            {quoteStatusLabels[status]}
          </span>
          <h2>
            {status === "sent"
              ? "מתקדמים יחד?"
              : status === "accepted" || status === "paid"
                ? "תודה על האמון."
                : status === "expired"
                  ? "נכין הצעה מעודכנת."
                  : "התשובה התקבלה."}
          </h2>
          {status === "sent" ? (
            <>
              <p>
                עברו על השירותים, המחירים והתנאים. התשובה שלכם תישמר ותועבר
                לאליה.
              </p>
              <label className="q-label">
                שם מלא
                <input
                  className="q-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  maxLength={160}
                />
              </label>
              <label className="q-checkbox">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                קראתי את ההצעה ואת התנאים ואני מאשר/ת לשמור את תשובתי בשם
                שהזנתי.
              </label>
              <button
                className="q-button q-primary"
                disabled={busy || !name.trim() || !confirmed}
                onClick={() => respond("accept")}
              >
                {busy ? "שומר תשובה…" : "אישור הצעת המחיר"}
              </button>
              <button
                className="q-button q-secondary"
                disabled={busy || !name.trim() || !confirmed}
                onClick={() => respond("decline")}
              >
                דחיית ההצעה
              </button>
            </>
          ) : (
            <p>
              {status === "accepted" || status === "paid"
                ? `האישור של ${quote.acceptedBy} נשמר. אליה ייצור קשר להמשך התהליך.`
                : status === "expired"
                  ? "תוקף ההצעה הסתיים. פנו לאליה כדי לעדכן את הפרטים ולהמשיך."
                  : "תודה שעדכנתם אותנו. אפשר לפנות לאליה עם שאלות או בקשות לשינוי."}
            </p>
          )}
          {error ? (
            <p role="alert" className="q-alert q-error">
              {error}
            </p>
          ) : null}
          <a className="q-text-link" href="mailto:elia448811@gmail.com">
            יש שאלה? דברו איתנו
          </a>
        </aside>
      </div>
    </div>
  );
}
