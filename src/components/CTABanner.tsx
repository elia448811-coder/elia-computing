import { Reveal } from "@/components/Reveal";

export function CTABanner() {
  return (
    <section className="section-y relative pt-0" aria-labelledby="cta-title">
      <div className="container-site">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.25rem] border border-electric/30 bg-[linear-gradient(135deg,#0d2844,#071421_55%,#0b1c2f)] px-6 py-16 text-center shadow-[var(--glow-strong)] sm:px-10">
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
                className="text-balance text-3xl font-extrabold tracking-[-0.02em] text-white sm:text-5xl"
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
