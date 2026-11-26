import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { serviceTypeOptions } from "@/data/content";
import { sameOrigin } from "@/lib/request-origin";
import { siteConfig } from "@/data/site";
import { getDatabase } from "@/lib/firebase-admin";
import { readLimitedText } from "@/lib/request-body";

export const runtime = "nodejs";

const MAX = {
  fullName: 80,
  phone: 20,
  email: 254,
  message: 2000,
} as const;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const COOKIE_NAME = "elia_cf_rl";
const HONEYPOT_FIELD = "_hp_cf";

type ContactBody = {
  fullName?: string;
  phone?: string;
  email?: string;
  serviceType?: string;
  message?: string;
  [HONEYPOT_FIELD]?: string;
};



function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  return /^[\d\s+\-()]{8,20}$/.test(value);
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function getRateSecret() {
  return (
    process.env.CONTACT_RATE_SECRET ||
    process.env.RESEND_API_KEY ||
    "elia-contact-rate-fallback"
  );
}

function signTimestamp(timestamp: number) {
  return createHmac("sha256", getRateSecret())
    .update(String(timestamp))
    .digest("hex")
    .slice(0, 32);
}

function readRateCookie(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));

  if (!match) return null;

  let raw: string;
  try { raw = decodeURIComponent(match.slice(COOKIE_NAME.length + 1)); } catch { return null; }
  const [timestampRaw, signature] = raw.split(".");
  const timestamp = Number(timestampRaw);
  if (!timestamp || !signature || Number.isNaN(timestamp)) return null;

  const expected = signTimestamp(timestamp);
  try {
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      return null;
    }
  } catch {
    return null;
  }

  return timestamp;
}

// A single bounded minute bucket is shared by all serverless instances.
async function reserveContactEmail(ip: string) {
  const db = getDatabase(), ref = db.doc("system/contactRate");
  const key = createHmac("sha256", getRateSecret()).update(ip).digest("hex");
  return db.runTransaction(async (tx) => {
    const now = Date.now();
    const stored = (await tx.get(ref)).data();
    const active = Number(stored?.expiresAt ?? 0) > now;
    const counts: Record<string, number> = active ? stored!.counts : {};
    const total = active ? Number(stored!.total) : 0;
    if ((counts[key] ?? 0) >= RATE_LIMIT_MAX || total >= 100) return false;
    tx.set(ref, { counts: { ...counts, [key]: (counts[key] ?? 0) + 1 }, total: total + 1, expiresAt: active ? stored!.expiresAt : now + RATE_LIMIT_WINDOW_MS });
    return true;
  });
}

function isCookieRateLimited(request: Request) {
  const stampedAt = readRateCookie(request);
  if (!stampedAt) return false;
  return Date.now() - stampedAt < RATE_LIMIT_WINDOW_MS;
}

function withRateCookie(response: NextResponse) {
  const timestamp = Date.now();
  const value = `${timestamp}.${signTimestamp(timestamp)}`;
  response.cookies.set({
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
  });
  return response;
}

function isAllowedOrigin(request: Request) { return sameOrigin(request); }

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא מורשית" }, { status: 403 });
  }

  if (isCookieRateLimited(request)) {
    return NextResponse.json(
      { error: "נשלחו יותר מדי פניות. נסו שוב בעוד דקה." },
      { status: 429 },
    );
  }

  let body: ContactBody;

  try {
    const raw = await readLimitedText(request, 12000);
    if (raw === null) return NextResponse.json({ error: "בקשה גדולה מדי" }, { status: 413 });
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.values(parsed).some((value) => typeof value !== "string")) return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
    body = parsed as ContactBody;
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  // Obscure honeypot, not a common autofill target
  if ((body[HONEYPOT_FIELD] ?? "").trim() !== "") {
    return NextResponse.json({ ok: true, delivered: false });
  }

  const fullName = body.fullName?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const serviceType = body.serviceType?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (fullName.length < 2 || fullName.length > MAX.fullName) {
    return NextResponse.json({ error: "נא להזין שם מלא תקין" }, { status: 400 });
  }
  if (!isValidPhone(phone) || phone.length > MAX.phone) {
    return NextResponse.json({ error: "נא להזין מספר טלפון תקין" }, { status: 400 });
  }
  if (!isValidEmail(email) || email.length > MAX.email) {
    return NextResponse.json({ error: "נא להזין אימייל תקין" }, { status: 400 });
  }
  if (
    !serviceType ||
    !(serviceTypeOptions as readonly string[]).includes(serviceType)
  ) {
    return NextResponse.json({ error: "נא לבחור סוג שירות" }, { status: 400 });
  }
  if (message.length < 8 || message.length > MAX.message) {
    return NextResponse.json(
      { error: "נא לכתוב הודעה באורך תקין" },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail =
    process.env.CONTACT_TO_EMAIL?.trim() || siteConfig.contact.email;
  const fromEmail = process.env.CONTACT_FROM_EMAIL?.trim();

  if (!apiKey || !toEmail || !fromEmail) {
    return NextResponse.json(
      { error: "שירות המייל אינו מוגדר כרגע" },
      { status: 500 },
    );
  }

  const resend = new Resend(apiKey);
  const fingerprint = createHash("sha256")
    .update(`${email}|${phone}|${serviceType}|${message.slice(0, 200)}`)
    .digest("hex")
    .slice(0, 24);
  const idempotencyKey = `contact-form/${fingerprint}/${Math.floor(Date.now() / 60_000)}`;

  try {
  if (!(await reserveContactEmail(getClientIp(request)))) {
    return NextResponse.json({ error: "נשלחו יותר מדי פניות. נסו שוב בעוד דקה." }, { status: 429, headers: { "Retry-After": "60" } });
  }
  const { error } = await resend.emails.send(
    {
      from: fromEmail,
      to: [toEmail],
      replyTo: email,
      subject: `פנייה מהאתר - ${serviceType}`,
      text: [
        "התקבלה פנייה חדשה מהאתר:",
        "",
        `שם: ${fullName}`,
        `טלפון: ${phone}`,
        `אימייל: ${email}`,
        `סוג שירות: ${serviceType}`,
        "",
        "הודעה:",
        message,
      ].join("\n"),
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
          <h2 style="margin:0 0 12px">פנייה חדשה מהאתר</h2>
          <p><strong>שם:</strong> ${escapeHtml(fullName)}</p>
          <p><strong>טלפון:</strong> ${escapeHtml(phone)}</p>
          <p><strong>אימייל:</strong> ${escapeHtml(email)}</p>
          <p><strong>סוג שירות:</strong> ${escapeHtml(serviceType)}</p>
          <p><strong>הודעה:</strong></p>
          <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
        </div>
      `,
    },
    { idempotencyKey },
  );

  if (error) {
    console.error("Resend contact error:", error.name);
    return NextResponse.json(
      { error: "שליחת הפנייה נכשלה. נסו שוב בעוד רגע." },
      { status: 502 },
    );
  }

  return withRateCookie(NextResponse.json({ ok: true, delivered: true }));
  } catch { return NextResponse.json({ error: "שליחת הפנייה נכשלה. נסו שוב בעוד רגע." }, { status: 502 }); }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
