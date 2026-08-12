"use client";

import { useState } from "react";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { faqItems } from "@/data/content";

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="section-y relative" aria-labelledby="faq-title">
      <div className="container-site max-w-3xl">
        <Reveal>
          <SectionHeading
            eyebrow="שאלות נפוצות"
            title="תשובות קצרות לשאלות שחוזרות"
          />
        </Reveal>

        <div className="mt-10 space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-button-${index}`;

            return (
              <Reveal key={item.question} delayMs={index * 50}>
                <div className="glass overflow-hidden rounded-[var(--radius-md)]">
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start text-base font-semibold text-white"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                    >
                      <span>{item.question}</span>
                      <span
                        className={`text-electric-bright transition ${isOpen ? "rotate-45" : ""}`}
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    hidden={!isOpen}
                    className="px-5 pb-5 text-sm leading-relaxed text-silver-muted"
                  >
                    {item.answer}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
