import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { projects } from "@/data/content";

export function Projects() {
  return (
    <section id="projects" className="section-y relative" aria-labelledby="projects-title">
      <div className="container-site">
        <Reveal>
          <SectionHeading
            eyebrow="עבודות / פרויקטים"
            title="פרויקטים נבחרים"
            description="כאן יוצגו פרויקטים אמיתיים. הרשימה מוכנה להוספה בקלות דרך קובץ התוכן."
          />
        </Reveal>

        {projects.length === 0 ? (
          <Reveal delayMs={80}>
            <div className="glass mt-10 rounded-[var(--radius-lg)] px-6 py-14 text-center">
              <p className="text-lg font-semibold text-white">
                הפרויקטים בדרך
              </p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-silver-muted">
                ברגע שיהיו פרויקטים מוכנים להצגה, אפשר להוסיף אותם ב-
                <code className="mx-1 rounded bg-white/5 px-1.5 py-0.5 text-electric-bright">
                  src/data/content.ts
                </code>
                בשדה <span className="text-silver">projects</span>.
              </p>
              <a href="#contact" className="btn btn-secondary mt-8">
                רוצים להיות הפרויקט הבא?
              </a>
            </div>
          </Reveal>
        ) : (
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {projects.map((project, index) => (
              <Reveal key={project.id} delayMs={(index % 2) * 80}>
                <article className="glass overflow-hidden rounded-[var(--radius-lg)] transition hover:-translate-y-1 hover:border-electric/35 hover:shadow-[var(--glow)]">
                  <div className="relative aspect-[16/10] bg-navy-soft">
                    <Image
                      src={project.image}
                      alt={project.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white">{project.title}</h3>
                    <p className="mt-2 text-sm text-silver-muted">
                      {project.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {project.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="rounded-full border border-white/10 px-3 py-1 text-xs text-silver"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                    <dl className="mt-5 space-y-3 text-sm">
                      <div>
                        <dt className="font-semibold text-electric-bright">האתגר</dt>
                        <dd className="mt-1 text-silver-muted">{project.challenge}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-electric-bright">הפתרון</dt>
                        <dd className="mt-1 text-silver-muted">{project.solution}</dd>
                      </div>
                    </dl>
                    {project.href ? (
                      <a href={project.href} className="btn btn-secondary mt-6">
                        לפרויקט
                      </a>
                    ) : null}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
