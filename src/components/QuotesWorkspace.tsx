"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Customer } from "@/lib/customers";
import {
  israelDate,
  money,
  quoteDisplayStatus,
  quoteStatusLabels,
  quoteTotals,
  quoteLineAmount,
  type ManagedQuote,
  type QuoteInput,
} from "@/lib/quote-types";
import { QuoteDocument } from "@/components/QuoteDocument";

const serviceTemplates = [
  { name: "הצעה חופשית", title: "הצעת מחיר", lines: [""] },
  {
    name: "בניית אתר",
    title: "אפיון, עיצוב ופיתוח אתר",
    lines: [
      "אפיון ועיצוב מותאם לעסק",
      "פיתוח אתר רספונסיבי",
      "בדיקות, הדרכה ועלייה לאוויר",
    ],
  },
  {
    name: "שירותי מחשוב",
    title: "שירותי מחשוב ותמיכה",
    lines: [
      "אבחון וטיפול בתקלות",
      "התקנה והגדרת תוכנות",
      "גיבוי והעברת נתונים",
    ],
  },
  {
    name: "תחזוקה חודשית",
    title: "שירות ותחזוקה חודשיים",
    lines: ["תחזוקה שוטפת ועדכוני מערכת", "תמיכה מרחוק", "בדיקות גיבוי ואבטחה"],
  },
];
const messages: Record<string, string> = {
  "invalid-input": "יש להשלים את כל השדות הנדרשים ולבדוק את הערכים.",
  "invalid-email": "כתובת האימייל אינה תקינה.",
  "invalid-items": "יש להזין תיאור, כמות חיובית ומחיר תקין לכל שורה.",
  "invalid-date": "יש לבחור תאריך תוקף תקין.",
  "invalid-rate": "אחוז ההנחה והמע״מ צריך להיות בין 0 ל־100.",
  conflict: "ההצעה עודכנה בחלון אחר. רעננו את הרשימה לפני המשך עריכה.",
  locked: "אפשר לערוך טיוטות בלבד. לשינוי הצעה שכבר נשלחה, שכפלו אותה.",
  expired: "לא ניתן לשלוח הצעה שתוקפה הסתיים. עדכנו את התאריך.",
  unauthorized: "פג תוקף ההתחברות. התחברו שוב כדי להמשיך.",
  "invalid-transition": "מצב ההצעה השתנה. רעננו את הרשימה.",
  "total-too-large": "הסכום הכולל חורג מהסכום המרבי הנתמך.",
};
function emptyQuote(): QuoteInput {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return {
    title: "הצעת מחיר",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    items: [{ description: "", quantity: 1, unitPrice: 0 }],
    discount: 0,
    taxRate: 0,
    validUntil: israelDate(date),
    notes: "",
    paymentTerms: "",
  };
}
function inputFromQuote(quote: QuoteInput): QuoteInput {
  return {
    title: quote.title,
    clientName: quote.clientName,
    clientEmail: quote.clientEmail,
    clientPhone: quote.clientPhone,
    items: quote.items.map((item) => ({ ...item })),
    discount: quote.discount,
    taxRate: quote.taxRate,
    validUntil: quote.validUntil,
    notes: quote.notes,
    paymentTerms: quote.paymentTerms,
  };
}
const shortDate = (date: string) =>
  new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    dateStyle: "short",
  }).format(new Date(date));
async function api(body?: unknown, method = "POST") {
  const response = await fetch(
    "/api/dashboard/quotes",
    body
      ? {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { cache: "no-store" },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

export function QuotesWorkspace({ customers }: { customers: Customer[] }) {
  const heading = useRef<HTMLDivElement>(null);
  const [quotes, setQuotes] = useState<ManagedQuote[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all");
  const [mode, setMode] = useState<"list" | "edit" | "view">("list"),
    [selected, setSelected] = useState<ManagedQuote>();
  const [draft, setDraft] = useState<QuoteInput>(emptyQuote),
    [dirty, setDirty] = useState(false),
    [confirmSend, setConfirmSend] = useState<ManagedQuote>();
  const creationId = useRef<string>(undefined);
  const [showPreview, setShowPreview] = useState(false);
  useEffect(() => {
    if (mode !== "list")
      heading.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [mode]);
  const report = (reason: unknown) =>
    setError(
      messages[reason instanceof Error ? reason.message : ""] ||
        "הפעולה לא הושלמה. הנתונים שהזנתם נשארו כאן. נסו שוב.",
    );
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setQuotes((await api()).quotes);
    } catch (reason) {
      report(reason);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const initialLoad = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(initialLoad);
  }, [refresh]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const totals = quoteTotals(draft);
  const stats = useMemo(() => {
    const waiting = quotes.filter(
        (quote) => quoteDisplayStatus(quote) === "sent",
      ),
      accepted = quotes.filter((quote) => quote.status === "accepted"),
      paid = quotes.filter((quote) => quote.status === "paid");
    return {
      waiting: waiting.length,
      pipeline: waiting.reduce(
        (sum, quote) => sum + quoteTotals(quote).total,
        0,
      ),
      accepted: accepted.reduce(
        (sum, quote) => sum + quoteTotals(quote).total,
        0,
      ),
      paid: paid.reduce((sum, quote) => sum + quoteTotals(quote).total, 0),
    };
  }, [quotes]);
  const filtered = quotes.filter(
    (quote) =>
      (filter === "all" || quoteDisplayStatus(quote) === filter) &&
      `${quote.number} ${quote.title} ${quote.clientName} ${quote.clientEmail}`
        .toLocaleLowerCase("he")
        .includes(search.toLocaleLowerCase("he")),
  );
  function update<K extends keyof QuoteInput>(key: K, value: QuoteInput[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }
  function newQuote(quote?: ManagedQuote, duplicate = false) {
    if (dirty && !window.confirm("יש שינויים שלא נשמרו. לצאת בלי לשמור?"))
      return;
    creationId.current = duplicate || !quote ? crypto.randomUUID() : undefined;
    setSelected(duplicate ? undefined : quote);
    setDraft(quote ? inputFromQuote(quote) : emptyQuote());
    setDirty(duplicate);
    setError("");
    setNotice("");
    setMode("edit");
    setShowPreview(false);
  }
  function closeEditor() {
    if (dirty && !window.confirm("יש שינויים שלא נשמרו. לצאת בלי לשמור?"))
      return;
    setMode("list");
    setDirty(false);
    setError("");
  }
  function replace(quote: ManagedQuote) {
    setQuotes((current) =>
      [quote, ...current.filter((item) => item.id !== quote.id)].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    );
    setSelected(quote);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { quote } = await api({
        input: draft,
        creationId: selected ? undefined : creationId.current,
        id: selected?.id,
        revision: selected?.revision,
      });
      replace(quote);
      setDirty(false);
      setMode("view");
      setNotice("הטיוטה נשמרה. אפשר לבדוק אותה ולפתוח קישור ללקוח.");
    } catch (reason) {
      report(reason);
    } finally {
      setBusy(false);
    }
  }
  async function transition(quote: ManagedQuote, action: "send" | "paid") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api(
        { id: quote.id, revision: quote.revision, action },
        "PATCH",
      );
      replace(result.quote);
      setConfirmSend(undefined);
      setMode("view");
      setNotice(
        action === "send"
          ? "הקישור ללקוח פעיל. העתיקו אותו או שתפו בוואטסאפ. לא נשלחה הודעה אוטומטית."
          : "ההצעה סומנה כשולמה. הסימון הוא למעקב פנימי ואינו מפיק קבלה.",
      );
    } catch (reason) {
      report(reason);
    } finally {
      setBusy(false);
    }
  }
  async function copyLink(quote: ManagedQuote) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${quote.sharePath}`,
      );
      setNotice("הקישור הועתק. אפשר לשלוח אותו ללקוח.");
    } catch {
      setError(
        "לא ניתן להעתיק אוטומטית. פתחו את ההצעה ללקוח והעתיקו את הכתובת.",
      );
    }
  }
  function exportCsv() {
    const escape = (value: unknown) =>
      `"${String(value)
        .replace(/^[=+\-@\t\r]/, "'$&")
        .replaceAll('"', '""')}"`;
    const rows = [
      [
        "מספר הצעה",
        "כותרת",
        "לקוח",
        "אימייל",
        "סטטוס",
        "סכום בשקלים",
        "נוצרה",
        "בתוקף עד",
      ],
      ...filtered.map((quote) => [
        quote.number,
        quote.title,
        quote.clientName,
        quote.clientEmail,
        quoteStatusLabels[quoteDisplayStatus(quote)],
        (quoteTotals(quote).total / 100).toFixed(2),
        quote.createdAt,
        quote.validUntil,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((row) => row.map(escape).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `quotes-${israelDate()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const selectedStatus = selected ? quoteDisplayStatus(selected) : "draft";
  return (
    <section className="quotes-app" aria-label="ניהול הצעות מחיר">
      <div className="q-heading no-print" ref={heading}>
        <div>
          <p className="quote-eyebrow">מהרעיון לאישור</p>
          <h2>הצעות מחיר</h2>
          <p>הצעה מקצועית. החלטה פשוטה. עסק שמתקדם.</p>
        </div>
        <div className="q-actions">
          {mode === "list" ? (
            <>
              <button
                className="q-button q-secondary"
                onClick={refresh}
                disabled={loading || busy}
              >
                רענון
              </button>
              <button className="q-button q-primary" onClick={() => newQuote()}>
                + הצעת מחיר חדשה
              </button>
            </>
          ) : (
            <button
              className="q-button q-secondary"
              onClick={closeEditor}
              disabled={busy}
            >
              חזרה להצעות
            </button>
          )}
        </div>
      </div>
      <div aria-live="polite" className="no-print">
        {error ? (
          <p role="alert" className="q-alert q-error">
            {error}
            {error === messages.unauthorized ? (
              <>
                {" "}
                <a href="/login" className="q-text-link">
                  כניסה מחדש
                </a>
              </>
            ) : null}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="q-alert q-success">
            {notice}
          </p>
        ) : null}
      </div>
      {mode === "list" ? (
        <>
          <div className="q-metrics">
            <button onClick={() => setFilter("sent")} className="q-metric">
              <span>ממתינות לתשובה</span>
              <strong>{loading ? "—" : stats.waiting}</strong>
              <small>הצעות פעילות אצל הלקוחות</small>
            </button>
            <button onClick={() => setFilter("sent")} className="q-metric">
              <span>הזדמנויות פתוחות</span>
              <strong>{loading ? "—" : money(stats.pipeline)}</strong>
              <small>שווי ההצעות שממתינות לאישור</small>
            </button>
            <button onClick={() => setFilter("accepted")} className="q-metric">
              <span>אושרו, ממתינות לתשלום</span>
              <strong>{loading ? "—" : money(stats.accepted)}</strong>
              <small>השלב הבא בדרך לעבודה</small>
            </button>
            <button
              onClick={() => setFilter("paid")}
              className="q-metric q-metric-accent"
            >
              <span>תשלומים שסומנו</span>
              <strong>{loading ? "—" : money(stats.paid)}</strong>
              <small>לפי המעקב הידני שלך</small>
            </button>
          </div>
          <div className="q-card q-library">
            <div className="q-library-header">
              <div>
                <h3>כל ההצעות שלך</h3>
                <p>נשמרות בחשבון וזמינות גם מהמכשיר הבא.</p>
              </div>
              <button
                className="q-text-link"
                disabled={!filtered.length}
                onClick={exportCsv}
              >
                ייצוא ל־Excel ‏(CSV)
              </button>
            </div>
            <div className="q-filters">
              <label className="q-search">
                <span className="sr-only">חיפוש הצעות</span>
                <input
                  className="q-input"
                  placeholder="חיפוש לפי לקוח, כותרת או מספר הצעה…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  type="search"
                />
              </label>
              <label>
                <span className="sr-only">סינון לפי סטטוס</span>
                <select
                  className="q-input"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  <option value="all">כל הסטטוסים</option>
                  {Object.entries(quoteStatusLabels).map(([key, label]) => (
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {loading ? (
              <div className="q-empty" role="status">
                <div className="q-loader" />
                <h3>טוען את ההצעות שלך…</h3>
              </div>
            ) : !filtered.length ? (
              <div className="q-empty">
                <div className="q-empty-icon" aria-hidden="true">
                  ▤
                </div>
                <h3>
                  {quotes.length
                    ? "לא נמצאו הצעות שמתאימות לחיפוש"
                    : error
                      ? "לא הצלחנו לטעון את ההצעות"
                      : "העבודה הבאה מתחילה כאן."}
                </h3>
                <p>
                  {quotes.length
                    ? "נסו לשנות את מילות החיפוש או את הסינון."
                    : error
                      ? "אפשר לנסות לרענן. ההצעות הקיימות לא נמחקו."
                      : "צרו הצעה ראשונה עם השירותים שלכם ושלחו ללקוח קישור מסודר לאישור."}
                </p>
                {!quotes.length && !error ? (
                  <button
                    className="q-button q-primary"
                    onClick={() => newQuote()}
                  >
                    יצירת ההצעה הראשונה
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="q-table-scroll">
                <table className="q-table">
                  <thead>
                    <tr>
                      <th>הצעה</th>
                      <th>לקוח</th>
                      <th>סטטוס</th>
                      <th>סכום</th>
                      <th>תוקף</th>
                      <th>
                        <span className="sr-only">פעולות</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((quote) => {
                      const status = quoteDisplayStatus(quote);
                      return (
                        <tr key={quote.id}>
                          <td>
                            <button
                              className="q-table-title"
                              onClick={() => {
                                setSelected(quote);
                                setMode("view");
                                setError("");
                                setNotice("");
                              }}
                            >
                              <span dir="ltr">{quote.number}</span>
                              <strong>{quote.title}</strong>
                            </button>
                          </td>
                          <td>{quote.clientName}</td>
                          <td>
                            <span className={`q-badge q-status-${status}`}>
                              {quoteStatusLabels[status]}
                            </span>
                          </td>
                          <td className="q-amount">
                            {money(quoteTotals(quote).total)}
                          </td>
                          <td>{shortDate(`${quote.validUntil}T12:00:00Z`)}</td>
                          <td>
                            <button
                              className="q-text-link"
                              onClick={() => {
                                setSelected(quote);
                                setMode("view");
                              }}
                            >
                              פתיחה
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="q-list-footnote">
              {filtered.length} הצעות בתצוגה · עד 500 ההצעות האחרונות
            </p>
          </div>
        </>
      ) : mode === "edit" ? (
        <form onSubmit={save} className="q-editor-layout">
          <div className="q-editor-fields no-print">
            <section className="q-card">
              <div className="q-section-heading">
                <span className="q-step">01</span>
                <div>
                  <h3>הפרויקט והלקוח</h3>
                  <p>מתחילים עם הפרטים החשובים.</p>
                </div>
              </div>
              <div className="q-form-grid">
                <label className="q-label q-full">
                  תבנית התחלה
                  <select
                    className="q-input"
                    defaultValue=""
                    onChange={(event) => {
                      const template =
                        serviceTemplates[Number(event.target.value)];
                      event.currentTarget.value = "";
                      if (
                        draft.items.some(
                          (item) => item.description || item.unitPrice,
                        ) &&
                        !window.confirm(
                          "החלפת התבנית תחליף את הכותרת והשורות. להמשיך?",
                        )
                      )
                        return;
                      setDraft((current) => ({
                        ...current,
                        title: template.title,
                        items: template.lines.map((description) => ({
                          description,
                          quantity: 1,
                          unitPrice: 0,
                        })),
                      }));
                      setDirty(true);
                    }}
                  >
                    <option value="" disabled>
                      בחירת תבנית — המחירים נקבעים על ידך
                    </option>
                    {serviceTemplates.map((template, index) => (
                      <option key={template.name} value={index}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="q-label q-full">
                  כותרת ההצעה
                  <input
                    className="q-input"
                    required
                    maxLength={160}
                    value={draft.title}
                    onChange={(event) => update("title", event.target.value)}
                  />
                </label>
                {customers.length ? (
                  <label className="q-label q-full">
                    מילוי מלקוח קיים
                    <select
                      className="q-input"
                      value=""
                      onChange={(event) => {
                        const customer = customers.find(
                          (customer) => customer.id === event.target.value,
                        );
                        if (customer) {
                          setDraft((current) => ({
                            ...current,
                            clientName: customer.fullName,
                            clientEmail: customer.email,
                            clientPhone: customer.phone,
                          }));
                          setDirty(true);
                        }
                      }}
                    >
                      <option value="">בחירת לקוח מהספרייה</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="q-label q-full">
                  שם הלקוח / העסק
                  <input
                    className="q-input"
                    required
                    maxLength={160}
                    autoComplete="organization"
                    value={draft.clientName}
                    onChange={(event) =>
                      update("clientName", event.target.value)
                    }
                    placeholder="למי מכינים את ההצעה?"
                  />
                </label>
                <label className="q-label">
                  אימייל
                  <input
                    className="q-input"
                    type="email"
                    dir="ltr"
                    maxLength={320}
                    value={draft.clientEmail}
                    onChange={(event) =>
                      update("clientEmail", event.target.value)
                    }
                    placeholder="name@company.co.il"
                  />
                </label>
                <label className="q-label">
                  טלפון
                  <input
                    className="q-input"
                    type="tel"
                    dir="ltr"
                    maxLength={32}
                    value={draft.clientPhone}
                    onChange={(event) =>
                      update("clientPhone", event.target.value)
                    }
                    placeholder="050-0000000"
                  />
                </label>
                <label className="q-label q-full">
                  תוקף ההצעה
                  <input
                    className="q-input"
                    type="date"
                    required
                    value={draft.validUntil}
                    onChange={(event) =>
                      update("validUntil", event.target.value)
                    }
                  />
                </label>
              </div>
            </section>
            <section className="q-card">
              <div className="q-section-heading">
                <span className="q-step">02</span>
                <div>
                  <h3>שירותים ומחירים</h3>
                  <p>הסכומים מתעדכנים בזמן העריכה.</p>
                </div>
              </div>
              <div className="q-line-editor">
                {draft.items.map((item, index) => (
                  <div className="q-edit-line" key={index}>
                    <label className="q-label q-line-description">
                      שירות / מוצר
                      <input
                        className="q-input"
                        required
                        maxLength={500}
                        value={item.description}
                        onChange={(event) =>
                          update(
                            "items",
                            draft.items.map((line, i) =>
                              i === index
                                ? { ...line, description: event.target.value }
                                : line,
                            ),
                          )
                        }
                        placeholder="תיאור השירות או התוצר"
                      />
                    </label>
                    <label className="q-label">
                      כמות
                      <input
                        className="q-input"
                        type="number"
                        required
                        min="0.001"
                        max="10000"
                        step="0.001"
                        value={item.quantity || ""}
                        onChange={(event) =>
                          update(
                            "items",
                            draft.items.map((line, i) =>
                              i === index
                                ? {
                                    ...line,
                                    quantity: Number(event.target.value),
                                  }
                                : line,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="q-label">
                      מחיר (₪)
                      <input
                        className="q-input"
                        type="number"
                        required
                        min="0"
                        max="1000000"
                        step="0.01"
                        value={item.unitPrice / 100}
                        onChange={(event) =>
                          update(
                            "items",
                            draft.items.map((line, i) =>
                              i === index
                                ? {
                                    ...line,
                                    unitPrice: Math.round(
                                      Number(event.target.value) * 100,
                                    ),
                                  }
                                : line,
                            ),
                          )
                        }
                      />
                    </label>
                    <div className="q-line-total">
                      <span>סה״כ</span>
                      <b>{money(quoteLineAmount(item))}</b>
                    </div>
                    <button
                      type="button"
                      className="q-remove"
                      aria-label={`מחיקת שורה ${index + 1}`}
                      disabled={draft.items.length === 1}
                      onClick={() =>
                        update(
                          "items",
                          draft.items.filter((_, i) => i !== index),
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="q-text-link q-add-line"
                disabled={draft.items.length >= 50}
                onClick={() =>
                  update("items", [
                    ...draft.items,
                    { description: "", quantity: 1, unitPrice: 0 },
                  ])
                }
              >
                + הוספת שורה
              </button>
              <div className="q-form-grid q-rates">
                <label className="q-label">
                  הנחה (%)
                  <input
                    className="q-input"
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="0.01"
                    value={draft.discount}
                    onChange={(event) =>
                      update("discount", Number(event.target.value))
                    }
                  />
                </label>
                <label className="q-label">
                  מע״מ (%)
                  <input
                    className="q-input"
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="0.01"
                    value={draft.taxRate}
                    onChange={(event) =>
                      update("taxRate", Number(event.target.value))
                    }
                  />
                </label>
              </div>
              <p className="q-help">
                בחרו את שיעור המע״מ שמתאים לעסק ולהצעה שלכם. ברירת המחדל היא 0%.
              </p>
            </section>
            <section className="q-card">
              <div className="q-section-heading">
                <span className="q-step">03</span>
                <div>
                  <h3>התנאים הקטנים, בבהירות.</h3>
                  <p>מה צריך לדעת לפני שמתחילים?</p>
                </div>
              </div>
              <label className="q-label">
                תנאי תשלום
                <textarea
                  className="q-input"
                  rows={3}
                  maxLength={2000}
                  value={draft.paymentTerms}
                  onChange={(event) =>
                    update("paymentTerms", event.target.value)
                  }
                  placeholder="למשל: מקדמה בתחילת העבודה והיתרה עם המסירה"
                />
              </label>
              <label className="q-label">
                הערות שמופיעות ללקוח
                <textarea
                  className="q-input"
                  rows={3}
                  maxLength={5000}
                  value={draft.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  placeholder="זמני אספקה, מה כלול בהצעה ותנאים נוספים"
                />
              </label>
            </section>
            <div className="q-save-bar">
              <div>
                <span>סה״כ בהצעה</span>
                <strong>{money(totals.total)}</strong>
                <small>
                  {dirty ? "יש שינויים שלא נשמרו" : "הטיוטה מוכנה לעריכה"}
                </small>
              </div>
              <button
                className="q-button q-primary"
                disabled={busy}
                type="submit"
              >
                {busy ? "שומר…" : "שמירת טיוטה"}
              </button>
              <button
                className="q-button q-secondary q-mobile-preview"
                type="button"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? "הסתרת תצוגה" : "תצוגה מקדימה"}
              </button>
            </div>
          </div>
          <aside
            className={`q-live-preview ${showPreview ? "q-preview-open" : ""}`}
          >
            <div className="q-preview-label no-print">
              <span>תצוגה מקדימה</span>
              <span>כך הלקוח יראה את ההצעה</span>
            </div>
            <QuoteDocument
              quote={draft}
              number={selected?.number}
              createdAt={selected?.createdAt}
            />
          </aside>
        </form>
      ) : selected ? (
        <div className="q-detail-layout">
          <div className="quote-print-root">
            <QuoteDocument
              quote={selected}
              number={selected.number}
              createdAt={selected.createdAt}
            />
          </div>
          <aside className="q-card q-detail-actions no-print">
            <span className={`q-badge q-status-${selectedStatus}`}>
              {quoteStatusLabels[selectedStatus]}
            </span>
            <h3>הצעה עם דרך קדימה.</h3>
            <p>
              {selected.status === "draft"
                ? "בדקו את הפרטים לפני פתיחת הקישור ללקוח. לאחר הפתיחה, ההצעה תינעל לעריכה."
                : "ההצעה נשמרת כפי שנשלחה. לשינוי פרטים אפשר ליצור עותק חדש."}
            </p>
            {selected.status === "draft" ? (
              <>
                <button
                  className="q-button q-primary"
                  disabled={busy}
                  onClick={() => setConfirmSend(selected)}
                >
                  פתיחת קישור ללקוח
                </button>
                <button
                  className="q-button q-secondary"
                  disabled={busy}
                  onClick={() => newQuote(selected)}
                >
                  עריכת טיוטה
                </button>
              </>
            ) : (
              <>
                <button
                  className="q-button q-primary"
                  onClick={() => copyLink(selected)}
                >
                  העתקת קישור ללקוח
                </button>
                <a
                  className="q-button q-secondary"
                  href={selected.sharePath}
                  target="_blank"
                  rel="noreferrer"
                >
                  פתיחת תצוגת הלקוח
                </a>
                <button
                  className="q-button q-secondary"
                  onClick={() => {
                    const phone = selected.clientPhone
                      .replace(/\D/g, "")
                      .replace(/^0/, "972");
                    const text = `שלום ${selected.clientName}, מצורפת הצעת מחיר: ${selected.title}\n${window.location.origin}${selected.sharePath}`;
                    window.open(
                      `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                >
                  שיתוף בוואטסאפ
                </button>
              </>
            )}
            {selected.status === "accepted" ? (
              <button
                className="q-button q-primary"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "לסמן שהתשלום עבור ההצעה התקבל? הפעולה אינה מפיקה קבלה.",
                    )
                  )
                    void transition(selected, "paid");
                }}
              >
                סימון כתשלום שהתקבל
              </button>
            ) : null}
            <button
              className="q-button q-secondary"
              onClick={() => window.print()}
            >
              הדפסה / שמירה כ־PDF
            </button>
            <button
              className="q-text-link"
              onClick={() => newQuote(selected, true)}
            >
              שכפול להצעה חדשה
            </button>
            <div className="q-detail-meta">
              <span>נוצרה {shortDate(selected.createdAt)}</span>
              {selected.sentAt ? (
                <span>הקישור הופעל {shortDate(selected.sentAt)}</span>
              ) : null}
              {selected.respondedAt ? (
                <span>
                  {selected.status === "declined" ? "נדחתה" : "אושרה"} בידי{" "}
                  {selected.acceptedBy} · {shortDate(selected.respondedAt)}
                </span>
              ) : null}
              {selected.paidAt ? (
                <span>סומנה כשולמה {shortDate(selected.paidAt)}</span>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
      {confirmSend ? (
        <div
          className="q-modal-backdrop no-print"
          onClick={(event) => {
            if (event.target === event.currentTarget && !busy)
              setConfirmSend(undefined);
          }}
        >
          <div
            className="q-modal q-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="send-title"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !busy) setConfirmSend(undefined);
              if (event.key === "Tab") {
                const elements = [
                  ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                    "button:not(:disabled)",
                  ),
                ];
                const first = elements[0],
                  last = elements.at(-1);
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <p className="quote-eyebrow">מוכנים ללקוח</p>
            <h3 id="send-title">לפתוח את ההצעה לשיתוף?</h3>
            <p>
              ההצעה {confirmSend.number} עבור {confirmSend.clientName} תינעל
              לעריכה, והלקוח יוכל לאשר או לדחות אותה דרך הקישור.
            </p>
            <p>
              לא תישלח הודעה אוטומטית. לאחר מכן תוכלו להעתיק את הקישור או לשתף
              בוואטסאפ.
            </p>
            <strong className="q-modal-total">
              {money(quoteTotals(confirmSend).total)}
            </strong>
            <div className="q-actions">
              <button
                autoFocus
                disabled={busy}
                className="q-button q-primary"
                onClick={() => transition(confirmSend, "send")}
              >
                {busy ? "פותח קישור…" : "פתיחת קישור ללקוח"}
              </button>
              <button
                disabled={busy}
                className="q-button q-secondary"
                onClick={() => setConfirmSend(undefined)}
              >
                חזרה לבדיקה
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
