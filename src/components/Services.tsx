import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { ServiceIcon } from "@/components/ServiceIcon";
import { services } from "@/data/services";

export function Services() {
  return (
    <section id="services" className="section-y relative" aria-labelledby="services-title">
      <div className="container-site">
        <Reveal>
          <SectionHeading
            eyebrow="שירותים"
            title="כל מה שהטכנולוגיה שלכם צריכה"
            description="מעטפת מחשוב מלאה — מהתקלה הקטנה ועד מערכות עסקיות שלמות."
          />
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((service, index) => (
            <Reveal key={service.id} delayMs={(index % 3) * 70}>
              <article className="glass group h-full rounded-[var(--radius-lg)] p-6 transition duration-300 hover:-translate-y-1 hover:border-electric/35 hover:shadow-[var(--glow)]">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-electric/10 text-electric-bright transition group-hover:bg-electric/20">
                  <ServiceIcon name={service.icon} />
                </div>
                <h3 className="text-xl font-bold text-white">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-silver-muted">
                  {service.description}
                </p>
                <ul className="mt-5 space-y-2">
                  {service.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-silver"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-electric"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delayMs={120}>
          <div className="mt-10 flex justify-center">
            <a href="#contact" className="btn btn-secondary">
              בואו נתאים לכם פתרון
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
