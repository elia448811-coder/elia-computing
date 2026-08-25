import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { processSteps } from "@/data/content";

export function Process() {
  return (
    <section id="process" className="section-y relative" aria-labelledby="process-title">
      <div className="container-site">
        <Reveal>
          <SectionHeading
            eyebrow="תהליך עבודה"
            title="מאיפה מתחילים ועד ליווי שוטף"
            description="תהליך ברור, שקוף ומקצועי, בלי הפתעות."
          />
        </Reveal>

        <ol className="relative mt-14 grid gap-5 lg:grid-cols-5">
          <div
            className="pointer-events-none absolute top-10 right-0 left-0 hidden h-px bg-gradient-to-l from-transparent via-electric/40 to-transparent lg:block"
            aria-hidden="true"
          />
          {processSteps.map((step, index) => (
            <Reveal key={step.step} delayMs={index * 80}>
              <li className="relative glass h-full rounded-[var(--radius-lg)] p-6 text-center transition hover:-translate-y-1 hover:border-electric/30 lg:text-start">
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-electric/35 bg-electric/10 text-sm font-black text-electric-bright shadow-[0_12px_30px_rgba(69,200,255,.1)] lg:mx-0">
                  {step.step}
                </div>
                <h3 className="text-lg font-extrabold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-silver-muted">
                  {step.text}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
