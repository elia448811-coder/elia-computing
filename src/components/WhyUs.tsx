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

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {whyUsContent.points.map((point, index) => (
            <Reveal key={point} delayMs={(index % 4) * 60}>
              <div className="glass h-full rounded-[var(--radius-md)] border-r-2 border-r-electric/50 p-5">
                <p className="font-semibold text-white">{point}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
