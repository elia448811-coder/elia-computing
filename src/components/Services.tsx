"use client";

import { useState } from "react";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { ServiceIcon } from "@/components/ServiceIcon";
import { services, type Service } from "@/data/services";

const PREVIEW_COUNT = 4;

function ServiceCard({ service }: { service: Service }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = service.items.length > PREVIEW_COUNT;
  const visibleItems = expanded
    ? service.items
    : service.items.slice(0, PREVIEW_COUNT);

  return (
    <article className="glass group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] p-7 transition duration-300 hover:-translate-y-1 hover:border-electric/35 hover:shadow-[var(--glow)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-electric/40 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-electric/15 bg-electric/10 text-electric-bright transition group-hover:scale-105 group-hover:bg-electric/20">
        <ServiceIcon name={service.icon} />
      </div>
      <h3 className="text-xl font-extrabold text-white">{service.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-silver-muted">
        {service.description}
      </p>
      <ul className="mt-5 space-y-2">
        {visibleItems.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-silver">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-electric"
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <button
          type="button"
          className="mt-4 self-start text-sm font-semibold text-electric-bright hover:underline"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "הצג פחות" : `עוד ${service.items.length - PREVIEW_COUNT} פריטים`}
        </button>
      ) : null}
    </article>
  );
}

export function Services() {
  return (
    <section id="services" className="section-y relative" aria-labelledby="services-title">
      <div className="container-site">
        <Reveal>
          <SectionHeading
            eyebrow="שירותים"
            title="כל מה שהטכנולוגיה שלכם צריכה"
            description="ממחשבים ורשתות ועד אבטחה, ענן, פיתוח ובניית אתרים — לפי הצורך שלכם."
          />
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((service, index) => (
            <Reveal key={service.id} delayMs={(index % 3) * 70}>
              <ServiceCard service={service} />
            </Reveal>
          ))}
        </div>

        <Reveal delayMs={120}>
          <div className="mt-10 flex justify-center">
            <a href="#contact" className="btn btn-secondary">
              בואו נתאים לכם פתרון
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
