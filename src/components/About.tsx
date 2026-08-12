import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { aboutContent } from "@/data/content";
import { siteConfig } from "@/data/site";

export function About() {
  return (
    <section id="about" className="section-y relative" aria-labelledby="about-title">
      <div className="container-site">
        <Reveal>
          <SectionHeading
            eyebrow="אודות"
            title={aboutContent.title}
            description={aboutContent.lead}
          />
        </Reveal>
        <Reveal delayMs={100}>
          <div className="glass mx-auto mt-10 max-w-3xl rounded-[var(--radius-lg)] p-6 sm:p-8">
            <p className="text-center text-base leading-relaxed text-silver sm:text-lg">
              {aboutContent.body}
            </p>
            <p className="mt-5 text-center text-sm font-semibold tracking-wide text-electric-bright">
              {siteConfig.name} · {siteConfig.slogan}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
