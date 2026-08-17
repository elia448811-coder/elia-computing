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

        <div className="mt-8 space-y-2.5 sm:mt-10 sm:space-y-3">
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
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-start text-[0.95rem] font-semibold text-white sm:gap-4 sm:px-5 sm:py-4 sm:text-base"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                    >
                      <span>{item.question}</span>
                      <span
                        className={`shrink-0 text-electric-bright transition ${isOpen ? "rotate-45" : ""}`}
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
                    className="px-4 pb-4 text-sm leading-relaxed text-silver-muted sm:px-5 sm:pb-5"
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
