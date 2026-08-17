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

        <ol className="relative mt-8 grid gap-3 sm:mt-14 sm:gap-5 lg:grid-cols-5">
          <div
            className="pointer-events-none absolute top-10 right-0 left-0 hidden h-px bg-gradient-to-l from-transparent via-electric/40 to-transparent lg:block"
            aria-hidden="true"
          />
          {processSteps.map((step, index) => (
            <Reveal key={step.step} delayMs={index * 80}>
              <li className="relative glass flex h-full gap-4 rounded-[var(--radius-lg)] p-4 text-start sm:block sm:p-5 lg:text-start">
                <div className="mb-0 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-electric/35 bg-electric/10 text-sm font-bold text-electric-bright sm:mx-auto sm:mb-4 sm:h-12 sm:w-12 lg:mx-0">
                  {step.step}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white sm:text-lg">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-silver-muted sm:mt-2">
                    {step.text}
                  </p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
