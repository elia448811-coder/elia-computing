import {
  money,
  quoteTotals,
  type QuoteInput,
  type Quote,
} from "@/lib/quote-types";
import { siteConfig } from "@/data/site";
export function QuoteDocument({
  quote,
  number = "טיוטה",
  createdAt,
}: {
  quote: QuoteInput | Quote;
  number?: string;
  createdAt?: string;
}) {
  const totals = quoteTotals(quote);
  const date = (value: string) =>
    new Intl.DateTimeFormat("he-IL", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jerusalem",
    }).format(new Date(value));
  return (
    <article className="quote-paper" dir="rtl">
      <div className="quote-paper-brand">
        <div>
          <strong>
            אליה<span> שירותי מחשוב</span>
          </strong>
          <p>פתרונות טכנולוגיים. יחס אישי.</p>
        </div>
        <span className="quote-monogram" aria-hidden="true">
          E.
        </span>
      </div>
      <div className="quote-paper-heading">
        <div>
          <p className="quote-eyebrow">הצעת מחיר</p>
          <h2>{quote.title || "הפרויקט הבא שלכם"}</h2>
        </div>
        <div className="quote-paper-number">
          <b dir="ltr">{number}</b>
          {createdAt ? (
            <span>{date(createdAt)}</span>
          ) : (
            <span>תצוגה מקדימה</span>
          )}
        </div>
      </div>
      <div className="quote-recipient">
        <div>
          <span>לכבוד</span>
          <strong>{quote.clientName || "שם הלקוח"}</strong>
          {quote.clientEmail ? <p dir="ltr">{quote.clientEmail}</p> : null}
          {quote.clientPhone ? <p dir="ltr">{quote.clientPhone}</p> : null}
        </div>
        <div>
          <span>בתוקף עד</span>
          <strong>
            {quote.validUntil
              ? date(`${quote.validUntil}T12:00:00Z`)
              : "לבחירתך"}
          </strong>
        </div>
      </div>
      <div className="quote-table-wrap">
        <table className="quote-lines">
          <thead>
            <tr>
              <th>תיאור השירות / המוצר</th>
              <th>כמות</th>
              <th>מחיר יחידה</th>
              <th>סה״כ</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, index) => (
              <tr key={index}>
                <td>{item.description || "תיאור השירות"}</td>
                <td>{item.quantity}</td>
                <td>{money(item.unitPrice)}</td>
                <td>{money(Math.round(item.quantity * item.unitPrice))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="quote-totals">
        <div>
          <span>סכום ביניים</span>
          <b>{money(totals.subtotal)}</b>
        </div>
        {quote.discount > 0 ? (
          <div>
            <span>הנחה ({quote.discount}%)</span>
            <b>−{money(totals.discountAmount)}</b>
          </div>
        ) : null}
        <div>
          <span>מע״מ ({quote.taxRate}%)</span>
          <b>{money(totals.tax)}</b>
        </div>
        <div className="quote-total-final">
          <span>סה״כ לתשלום</span>
          <b>{money(totals.total)}</b>
        </div>
      </div>
      {quote.paymentTerms ? (
        <section className="quote-paper-note">
          <h3>תנאי תשלום</h3>
          <p>{quote.paymentTerms}</p>
        </section>
      ) : null}
      {quote.notes ? (
        <section className="quote-paper-note">
          <h3>חשוב לדעת</h3>
          <p>{quote.notes}</p>
        </section>
      ) : null}
      {"respondedAt" in quote && quote.respondedAt ? (
        <section className="quote-paper-note">
          <h3>{quote.status === "declined" ? "ההצעה נדחתה" : "אישור ההצעה"}</h3>
          <p>
            {quote.acceptedBy} · {date(quote.respondedAt)}
          </p>
        </section>
      ) : null}
      <footer className="quote-paper-footer">
        <strong>תודה על ההזדמנות לעבוד יחד.</strong>
        <span>{siteConfig.contact.email}</span>
        <small>הצעת מחיר · מסמך זה אינו חשבונית או קבלה</small>
      </footer>
    </article>
  );
}
