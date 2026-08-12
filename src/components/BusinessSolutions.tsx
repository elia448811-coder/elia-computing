import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { businessContent } from "@/data/content";

export function BusinessSolutions() {
  return (
    <section id="business" className="section-y relative overflow-hidden" aria-labelledby="business-title">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(14,165,233,0.14), transparent 45%), radial-gradient(ellipse at 90% 30%, rgba(56,189,248,0.08), transparent 40%)",
        }}
      />
      <div className="container-site relative">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <SectionHeading
              align="start"
              eyebrow="פתרונות לעסקים"
              title={businessContent.title}
              description={businessContent.text}
            />
            <a href="#contact" className="btn btn-primary mt-8">
              {businessContent.cta}
            </a>
          </Reveal>

          <Reveal delayMs={100}>
            <div className="glass rounded-[var(--radius-xl)] p-6 sm:p-8">
              <ul className="grid gap-3 sm:grid-cols-2">
                {businessContent.benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm font-medium text-silver transition hover:border-electric/30 hover:text-white"
                  >
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
