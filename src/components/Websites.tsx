import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { websitesContent } from "@/data/content";

export function Websites() {
  return (
    <section id="websites" className="section-y relative" aria-labelledby="websites-title">
      <div className="container-site">
        <div className="glass relative overflow-hidden rounded-[var(--radius-xl)] px-5 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                "linear-gradient(135deg, rgba(56,189,248,0.12), transparent 40%), linear-gradient(315deg, rgba(2,132,199,0.16), transparent 35%)",
            }}
          />
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" aria-hidden="true" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-10">
            <Reveal>
              <SectionHeading
                align="start"
                eyebrow="בניית אתרים"
                title={websitesContent.title}
                description={websitesContent.text}
              />
              <a href="#contact" className="btn btn-primary btn-stack-mobile mt-7 sm:mt-8">
                {websitesContent.cta}
              </a>
            </Reveal>

            <Reveal delayMs={120}>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {websitesContent.features.map((feature) => (
                  <div
                    key={feature}
                    className="rounded-2xl border border-white/10 bg-[#050a14]/45 px-3 py-3.5 text-xs font-semibold leading-snug text-silver backdrop-blur-sm transition hover:border-electric/40 hover:text-white hover:shadow-[var(--glow)] sm:px-4 sm:py-4 sm:text-sm"
                  >
                    {feature}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
