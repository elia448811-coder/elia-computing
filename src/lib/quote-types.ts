export type QuoteItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};
export type QuoteInput = {
  title: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  items: QuoteItem[];
  discount: number;
  taxRate: number;
  validUntil: string;
  notes: string;
  paymentTerms: string;
};
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "paid";
export type Quote = QuoteInput & {
  id: string;
  number: string;
  status: QuoteStatus;
  revision: number;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  respondedAt?: string;
  acceptedBy?: string;
  paidAt?: string;
};
export type ManagedQuote = Quote & { sharePath: string };
export const quoteStatusLabels: Record<QuoteStatus | "expired", string> = {
  draft: "טיוטה",
  sent: "ממתינה לתשובה",
  accepted: "אושרה",
  declined: "נדחתה",
  paid: "שולמה",
  expired: "פג תוקף",
};
export function money(cents: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
export function quoteTotals(
  input: Pick<QuoteInput, "items" | "discount" | "taxRate">,
) {
  const subtotal = input.items.reduce(
    (total, item) => total + Math.round(item.quantity * item.unitPrice),
    0,
  );
  const discountAmount = Math.round((subtotal * input.discount) / 100);
  const net = subtotal - discountAmount;
  const tax = Math.round((net * input.taxRate) / 100);
  return { subtotal, discountAmount, net, tax, total: net + tax };
}
export function israelDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((name) => parts.find((part) => part.type === name)?.value)
    .join("-");
}
export function isQuoteExpired(quote: Pick<Quote, "validUntil" | "status">) {
  return quote.status === "sent" && quote.validUntil < israelDate();
}
export function quoteDisplayStatus(quote: Quote) {
  return isQuoteExpired(quote) ? ("expired" as const) : quote.status;
}
export function validateQuoteInput(value: unknown): QuoteInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("invalid-input");
  const input = value as Record<string, unknown>;
  function text(key: string, max: number, required = false) {
    const value = input[key];
    if (
      typeof value !== "string" ||
      value.length > max ||
      (required && !value.trim())
    )
      throw new Error("invalid-input");
    return value.trim();
  }
  const title = text("title", 160, true),
    clientName = text("clientName", 160, true);
  const clientEmail = text("clientEmail", 320),
    clientPhone = text("clientPhone", 32);
  if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail))
    throw new Error("invalid-email");
  const validUntil = text("validUntil", 10, true);
  const parsedDate = new Date(`${validUntil}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(validUntil) ||
    !Number.isFinite(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== validUntil
  )
    throw new Error("invalid-date");
  const items = input.items;
  if (!Array.isArray(items) || items.length < 1 || items.length > 50)
    throw new Error("invalid-items");
  const cleaned: QuoteItem[] = items.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("invalid-items");
    const line = item as Record<string, unknown>;
    if (
      typeof line.description !== "string" ||
      !line.description.trim() ||
      line.description.length > 500 ||
      typeof line.quantity !== "number" ||
      !Number.isFinite(line.quantity) ||
      line.quantity <= 0 ||
      line.quantity > 10000 ||
      Math.abs(line.quantity * 1000 - Math.round(line.quantity * 1000)) >
        0.000001 ||
      typeof line.unitPrice !== "number" ||
      !Number.isSafeInteger(line.unitPrice) ||
      line.unitPrice < 0 ||
      line.unitPrice > 100000000
    )
      throw new Error("invalid-items");
    return {
      description: line.description.trim(),
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    };
  });
  function rate(key: string) {
    const rate = input[key];
    if (
      typeof rate !== "number" ||
      !Number.isFinite(rate) ||
      rate < 0 ||
      rate > 100 ||
      Math.abs(rate * 100 - Math.round(rate * 100)) > 0.000001
    )
      throw new Error("invalid-rate");
    return rate;
  }
  const result = {
    title,
    clientName,
    clientEmail,
    clientPhone,
    items: cleaned,
    discount: rate("discount"),
    taxRate: rate("taxRate"),
    validUntil,
    notes: text("notes", 5000),
    paymentTerms: text("paymentTerms", 2000),
  };
  if (quoteTotals(result).total > 10000000000)
    throw new Error("total-too-large");
  return result;
}
