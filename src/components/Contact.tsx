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
  _hp_cf: string;
};

const initialState: FormState = {
  fullName: "",
  phone: "",
  email: "",
  serviceType: "",
  message: "",
  _hp_cf: "",
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

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (status !== "idle") setStatus("idle");
  }

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
        delivered?: boolean;
      };

      if (!response.ok) {
        setStatus("error");
        setServerError(payload.error || "שליחת הפנייה נכשלה");
        return;
      }

      if (payload.delivered === false) {
        setStatus("error");
        setServerError("שליחת הפנייה נכשלה. נסו שוב.");
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
      <div className="container-site grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-10">
        <Reveal>
          <SectionHeading
            align="start"
            eyebrow="צור קשר"
            title="בואו נדבר על מה שצריך לפתור"
            description="השאירו פרטים והפנייה תגיע ישירות אלינו."
          />

          <div className="mt-6 space-y-3 text-sm text-silver-muted sm:mt-8">
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
                className="btn btn-secondary btn-stack-mobile mt-4"
              >
                שליחה בוואטסאפ
              </a>
            ) : null}
          </div>
        </Reveal>

        <Reveal delayMs={100}>
          <form
            className="glass relative rounded-[var(--radius-xl)] p-5 sm:p-8"
            onSubmit={onSubmit}
            noValidate
            aria-busy={submitting}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor="_hp_cf">השאר ריק</label>
                <input
                  id="_hp_cf"
                  name="_hp_cf"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form._hp_cf}
                  onChange={(e) => updateField("_hp_cf", e.target.value)}
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
                  onChange={(e) => updateField("fullName", e.target.value)}
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={errors.fullName ? "fullName-error" : undefined}
                  required
                />
                {errors.fullName ? (
                  <p id="fullName-error" className="mt-1 text-xs text-red-300">{errors.fullName}</p>
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
                  onChange={(e) => updateField("phone", e.target.value)}
                  inputMode="tel"
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                  required
                />
                {errors.phone ? (
                  <p id="phone-error" className="mt-1 text-xs text-red-300">{errors.phone}</p>
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
                  onChange={(e) => updateField("email", e.target.value)}
                  inputMode="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  required
                />
                {errors.email ? (
                  <p id="email-error" className="mt-1 text-xs text-red-300">{errors.email}</p>
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
                  onChange={(e) => updateField("serviceType", e.target.value)}
                  aria-invalid={Boolean(errors.serviceType)}
                  aria-describedby={errors.serviceType ? "serviceType-error" : undefined}
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
                  <p id="serviceType-error" className="mt-1 text-xs text-red-300">{errors.serviceType}</p>
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
                  onChange={(e) => updateField("message", e.target.value)}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? "message-error" : undefined}
                  required
                />
                {errors.message ? (
                  <p id="message-error" className="mt-1 text-xs text-red-300">{errors.message}</p>
                ) : null}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
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
