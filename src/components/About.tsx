import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { aboutContent } from "@/data/content";

function emphasize(text: string, phrases: readonly string[]) {
  let parts: Array<string | { bold: string }> = [text];

  for (const phrase of phrases) {
    parts = parts.flatMap((part) => {
      if (typeof part !== "string") return [part];
      if (!part.includes(phrase)) return [part];
      const chunks = part.split(phrase);
      const next: Array<string | { bold: string }> = [];
      chunks.forEach((chunk, index) => {
        if (chunk) next.push(chunk);
        if (index < chunks.length - 1) next.push({ bold: phrase });
      });
      return next;
    });
  }

  return parts;
}

export function About() {
  return (
    <section id="about" className="section-y relative" aria-labelledby="about-title">
      <div className="container-site max-w-4xl">
        <Reveal>
          <SectionHeading eyebrow="אודות" title={aboutContent.title} />
        </Reveal>

        <Reveal delayMs={80}>
          <div className="glass mt-8 space-y-4 rounded-[var(--radius-xl)] p-5 sm:mt-10 sm:space-y-5 sm:p-8 lg:p-10">
            <p className="text-base font-semibold text-white sm:text-xl">
              {aboutContent.opening}
            </p>

            {aboutContent.paragraphs.map((paragraph) => {
              const parts = emphasize(paragraph, aboutContent.emphasisPhrases);
              return (
                <p
                  key={paragraph}
                  className="text-[0.95rem] leading-relaxed text-silver sm:text-lg"
                >
                  {parts.map((part, index) =>
                    typeof part === "string" ? (
                      <span key={`${paragraph}-${index}`}>{part}</span>
                    ) : (
                      <strong
                        key={`${paragraph}-${index}`}
                        className="font-bold text-white"
                      >
                        {part.bold}
                      </strong>
                    ),
                  )}
                </p>
              );
            })}

            <p className="text-[0.95rem] leading-relaxed text-silver sm:text-lg">
              {emphasize(aboutContent.highlight, aboutContent.emphasisPhrases).map(
                (part, index) =>
                  typeof part === "string" ? (
                    <span key={`highlight-${index}`}>{part}</span>
                  ) : (
                    <strong
                      key={`highlight-${index}`}
                      className="font-bold text-electric-bright"
                    >
                      {part.bold}
                    </strong>
                  ),
              )}
            </p>

            <p className="text-[0.95rem] leading-relaxed text-silver sm:text-lg">
              {aboutContent.aftercare}
            </p>

            <div className="border-t border-white/10 pt-5 text-center sm:pt-6">
              <p className="text-base font-bold text-electric-bright sm:text-xl">
                {aboutContent.tagline}
              </p>
              <p className="mt-3 text-[0.95rem] text-silver sm:mt-4 sm:text-lg">
                {aboutContent.closingLead}
              </p>
              <p className="mt-2 text-[0.95rem] font-bold text-white sm:text-lg">
                {aboutContent.closingStrong}
              </p>
              <a href="#contact" className="btn btn-primary btn-stack-mobile mt-6 sm:mt-8">
                בואו נדבר על הרעיון שלכם
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
