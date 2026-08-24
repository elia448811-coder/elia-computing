import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { whyUsContent } from "@/data/content";

export function WhyUs() {
  return (
    <section id="why-us" className="section-y relative" aria-labelledby="why-us-title">
      <div className="container-site">
        <Reveal>
          <SectionHeading
            title={whyUsContent.title}
            description={whyUsContent.text}
          />
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {whyUsContent.points.map((point, index) => (
            <Reveal key={point.title} delayMs={(index % 3) * 60}>
              <div
                className={`glass h-full rounded-[var(--radius-lg)] p-6 transition hover:border-electric/30 hover:bg-electric/[0.035] ${
                  index === whyUsContent.points.length - 1
                    ? "sm:col-span-2 lg:col-span-1"
                    : ""
                }`}
              >
                <span className="mb-5 flex h-8 w-8 items-center justify-center rounded-xl bg-electric/10 text-sm font-black text-electric-bright" aria-hidden="true">✓</span>
                <h3 className="text-base font-extrabold text-white sm:text-lg">
                  {point.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-silver-muted">
                  {point.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
