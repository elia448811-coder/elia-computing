import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { serviceTypeOptions } from "@/data/content";
import { siteConfig } from "@/data/site";

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

const rateBucket = new Map<string, { count: number; resetAt: number }>();

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

  const raw = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
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

function isMemoryRateLimited(ip: string) {
  const now = Date.now();
  const current = rateBucket.get(ip);

  if (!current || now > current.resetAt) {
    rateBucket.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return true;
  }

  current.count += 1;
  rateBucket.set(ip, current);
  return false;
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

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const allowed = new URL(siteConfig.url).origin;
    const requestOrigin = new URL(origin).origin;
    if (requestOrigin === allowed) return true;
    if (requestOrigin === "http://localhost:3000") return true;
    if (
      requestOrigin.endsWith(".vercel.app") &&
      requestOrigin.includes("elia-computing")
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

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

  const ip = getClientIp(request);
  if (isMemoryRateLimited(ip)) {
    return NextResponse.json(
      { error: "נשלחו יותר מדי פניות. נסו שוב בעוד דקה." },
      { status: 429 },
    );
  }

  let body: ContactBody;

  try {
    body = (await request.json()) as ContactBody;
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
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
