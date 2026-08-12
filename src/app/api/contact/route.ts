import { NextResponse } from "next/server";
import { Resend } from "resend";
import { serviceTypeOptions } from "@/data/content";
import { siteConfig } from "@/data/site";

export const runtime = "nodejs";

type ContactBody = {
  fullName?: string;
  phone?: string;
  email?: string;
  serviceType?: string;
  message?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  return /^[\d\s+\-()]{8,20}$/.test(value);
}

export async function POST(request: Request) {
  let body: ContactBody;

  try {
    body = (await request.json()) as ContactBody;
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const fullName = body.fullName?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const serviceType = body.serviceType?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (fullName.length < 2) {
    return NextResponse.json({ error: "נא להזין שם מלא" }, { status: 400 });
  }
  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: "נא להזין מספר טלפון תקין" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "נא להזין אימייל תקין" }, { status: 400 });
  }
  if (
    !serviceType ||
    !(serviceTypeOptions as readonly string[]).includes(serviceType)
  ) {
    return NextResponse.json({ error: "נא לבחור סוג שירות" }, { status: 400 });
  }
  if (message.length < 8) {
    return NextResponse.json({ error: "נא לכתוב הודעה קצרה" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "שירות המייל אינו מוגדר כרגע" },
      { status: 500 },
    );
  }

  const toEmail =
    process.env.CONTACT_TO_EMAIL?.trim() ||
    siteConfig.contact.email ||
    "elia448811@gmail.com";

  const fromEmail =
    process.env.CONTACT_FROM_EMAIL?.trim() ||
    "אליה שירותי מחשוב <noreply@hanaasher-finance.com>";

  const resend = new Resend(apiKey);
  const idempotencyKey = `contact-form/${Date.now()}-${email.slice(0, 32)}`;

  const { data, error } = await resend.emails.send(
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
    console.error("Resend contact error:", error);
    return NextResponse.json(
      { error: "שליחת הפנייה נכשלה. נסו שוב בעוד רגע." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
