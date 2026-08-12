"use client";

import { FormEvent, useMemo, useState } from "react";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { serviceTypeOptions } from "@/data/content";
import { siteConfig } from "@/data/site";

type FormState = {
  fullName: string;
  phone: string;
  email: string;
  serviceType: string;
  message: string;
  website: string;
};

const initialState: FormState = {
  fullName: "",
  phone: "",
  email: "",
  serviceType: "",
  message: "",
  website: "",
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  return /^[\d\s+\-()]{8,20}$/.test(value);
}

export function Contact() {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const whatsappHref = useMemo(() => {
    if (!siteConfig.contact.whatsapp) return "";
    const text = encodeURIComponent(
      `שלום, אני ${form.fullName || "מתעניין/ת"} ואשמח לשוחח לגבי ${form.serviceType || "שירותי מחשוב"}.`,
    );
    return `https://wa.me/${siteConfig.contact.whatsapp}?text=${text}`;
  }, [form.fullName, form.serviceType]);

  function validate(values: FormState) {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!values.fullName.trim() || values.fullName.trim().length < 2) {
      next.fullName = "נא להזין שם מלא";
    }
    if (!isValidPhone(values.phone.trim())) {
      next.phone = "נא להזין מספר טלפון תקין";
    }
    if (!isValidEmail(values.email.trim())) {
      next.email = "נא להזין אימייל תקין";
    }
    if (!values.serviceType) {
      next.serviceType = "נא לבחור סוג שירות";
    }
    if (!values.message.trim() || values.message.trim().length < 8) {
      next.message = "נא לכתוב הודעה קצרה";
    }
    return next;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setServerError("");

    if (Object.keys(nextErrors).length > 0) {
      setStatus("error");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setStatus("error");
        setServerError(payload.error || "שליחת הפנייה נכשלה");
        return;
      }

      setStatus("success");
      setForm(initialState);
    } catch {
      setStatus("error");
      setServerError("שגיאת רשת. נסו שוב.");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-white/12 bg-white/[0.03] px-4 py-3 text-white outline-none transition placeholder:text-silver-muted/70 focus:border-electric/60 focus:bg-white/[0.05]";

  return (
    <section id="contact" className="section-y relative" aria-labelledby="contact-title">
      <div className="container-site grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <Reveal>
          <SectionHeading
            align="start"
            eyebrow="צור קשר"
            title="בואו נדבר על מה שצריך לפתור"
            description="השאירו פרטים והפנייה תגיע ישירות אלינו."
          />

          <div className="mt-8 space-y-3 text-sm text-silver-muted">
            {siteConfig.contact.phone ? (
              <p>
                טלפון:{" "}
                <a className="text-electric-bright hover:underline" href={`tel:${siteConfig.contact.phone}`}>
                  {siteConfig.contact.phone}
                </a>
              </p>
            ) : null}
            {siteConfig.contact.email ? (
              <p>
                אימייל:{" "}
                <a className="text-electric-bright hover:underline" href={`mailto:${siteConfig.contact.email}`}>
                  {siteConfig.contact.email}
                </a>
              </p>
            ) : null}
            {siteConfig.contact.address ? <p>כתובת: {siteConfig.contact.address}</p> : null}
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary mt-4"
              >
                שליחה בוואטסאפ
              </a>
            ) : null}
          </div>
        </Reveal>

        <Reveal delayMs={100}>
          <form
            className="glass relative rounded-[var(--radius-xl)] p-6 sm:p-8"
            onSubmit={onSubmit}
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor="website">אתר</label>
                <input
                  id="website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-1">
                <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-silver">
                  שם מלא
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  autoComplete="name"
                  maxLength={80}
                  className={fieldClass}
                  value={form.fullName}
                  onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
                  required
                />
                {errors.fullName ? (
                  <p className="mt-1 text-xs text-red-300">{errors.fullName}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-medium text-silver">
                  טלפון
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={20}
                  className={fieldClass}
                  value={form.phone}
                  onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                  required
                />
                {errors.phone ? (
                  <p className="mt-1 text-xs text-red-300">{errors.phone}</p>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-silver">
                  אימייל
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  className={fieldClass}
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  required
                />
                {errors.email ? (
                  <p className="mt-1 text-xs text-red-300">{errors.email}</p>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="serviceType" className="mb-2 block text-sm font-medium text-silver">
                  סוג השירות
                </label>
                <select
                  id="serviceType"
                  name="serviceType"
                  className={fieldClass}
                  value={form.serviceType}
                  onChange={(e) => setForm((s) => ({ ...s, serviceType: e.target.value }))}
                  required
                >
                  <option value="" disabled>
                    בחרו סוג שירות
                  </option>
                  {serviceTypeOptions.map((option) => (
                    <option key={option} value={option} className="bg-navy text-white">
                      {option}
                    </option>
                  ))}
                </select>
                {errors.serviceType ? (
                  <p className="mt-1 text-xs text-red-300">{errors.serviceType}</p>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="message" className="mb-2 block text-sm font-medium text-silver">
                  הודעה
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  maxLength={2000}
                  className={`${fieldClass} resize-y`}
                  value={form.message}
                  onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
                  required
                />
                {errors.message ? (
                  <p className="mt-1 text-xs text-red-300">{errors.message}</p>
                ) : null}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary mt-6 w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? "שולח..." : "שליחת פנייה"}
            </button>

            <div className="mt-4 min-h-[1.5rem]" aria-live="polite">
              {status === "success" ? (
                <p className="text-sm text-electric-bright">
                  תודה! הפנייה נשלחה בהצלחה ונחזור אליכם בהקדם.
                </p>
              ) : null}
              {status === "error" ? (
                <p className="text-sm text-red-300">
                  {serverError || "נא לתקן את השדות המסומנים."}
                </p>
              ) : null}
            </div>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
