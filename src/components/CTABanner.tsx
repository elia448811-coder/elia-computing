import { Reveal } from "@/components/Reveal";

export function CTABanner() {
  return (
    <section className="section-y relative pt-0" aria-labelledby="cta-title">
      <div className="container-site">
        <Reveal>
          <div className="glass relative overflow-hidden rounded-[var(--radius-xl)] px-6 py-14 text-center sm:px-10">
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(56,189,248,0.18), transparent 55%)",
              }}
            />
            <div className="relative">
              <h2
                id="cta-title"
                className="text-balance text-3xl font-bold text-white sm:text-4xl"
              >
                יש לכם רעיון? תקלה? פרויקט?
              </h2>
              <p className="mt-4 text-lg font-semibold text-electric-bright">
                בואו נהפוך אותו לפתרון.
              </p>
              <a href="#contact" className="btn btn-primary mt-8">
                דברו איתי עכשיו
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
