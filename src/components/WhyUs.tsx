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
                className={`glass h-full rounded-[var(--radius-md)] border-r-2 border-r-electric/50 p-5 ${
                  index === whyUsContent.points.length - 1
                    ? "sm:col-span-2 lg:col-span-1"
                    : ""
                }`}
              >
                <h3 className="text-base font-bold text-white sm:text-lg">
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
