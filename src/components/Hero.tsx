import Image from "next/image";
import { siteConfig } from "@/data/site";

export function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-[100svh] overflow-hidden pt-[76px]"
      aria-labelledby="hero-title"
    >
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 70% 40%, rgba(56,189,248,0.16), transparent 35%), radial-gradient(circle at 20% 70%, rgba(2,132,199,0.12), transparent 40%)",
        }}
      />

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="circuitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <path
          className="circuit-line"
          d="M-20 180 H120 V280 H260 V140 H420"
          fill="none"
          stroke="url(#circuitGrad)"
          strokeWidth="1.2"
        />
        <path
          className="circuit-line"
          d="M900 120 H720 V240 H560 V90 H380"
          fill="none"
          stroke="url(#circuitGrad)"
          strokeWidth="1.2"
          style={{ animationDelay: "1.5s" }}
        />
        <circle cx="120" cy="180" r="3" fill="#7dd3fc" opacity="0.8" />
        <circle cx="260" cy="280" r="2.5" fill="#38bdf8" opacity="0.7" />
        <circle cx="560" cy="240" r="3" fill="#7dd3fc" opacity="0.75" />
      </svg>

      <div className="container-site relative grid min-h-[calc(100svh-76px)] items-center gap-12 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold tracking-[0.2em] text-electric-bright/85">
            {siteConfig.slogan}
          </p>
          <h1
            id="hero-title"
            className="text-balance text-4xl font-bold leading-[1.12] text-white sm:text-5xl lg:text-[3.35rem]"
          >
            פתרונות מחשוב שמקדמים אותך קדימה
          </h1>
          <p className="mt-5 text-pretty text-lg font-medium leading-relaxed text-silver sm:text-xl">
            מחשוב, רשתות, אבטחת מידע, ענן, תמיכה טכנית, פיתוח ובניית אתרים -
            הכל במקום אחד.
          </p>
          <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-silver-muted">
            באליה שירותי מחשוב אנחנו הופכים טכנולוגיה לפשוטה, מהירה ובטוחה יותר
            עבור אנשים ועסקים.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#contact" className="btn btn-primary">
              לקבלת ייעוץ
            </a>
            <a href="#services" className="btn btn-secondary">
              לכל השירותים
            </a>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-[420px] items-center justify-center lg:max-w-none">
          <div
            className="absolute h-[78%] w-[78%] rounded-full opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(56,189,248,0.35), transparent 70%)",
            }}
            aria-hidden="true"
          />

          <div className="relative float-soft">
            <div className="orbit absolute inset-[-12%] rounded-full border border-electric/20" aria-hidden="true">
              <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-electric-bright shadow-[0_0_18px_rgba(125,211,252,0.9)]" />
            </div>
            <div
              className="orbit absolute inset-[-22%] rounded-full border border-dashed border-electric/15"
              style={{ animationDuration: "40s", animationDirection: "reverse" }}
              aria-hidden="true"
            >
              <span className="absolute bottom-4 left-8 h-2 w-2 rounded-full bg-electric/80" />
            </div>

            <div className="glass relative overflow-hidden rounded-full p-6 sm:p-8">
              <Image
                src="/logos/logo-mark.svg"
                alt="לוגו אליה שירותי מחשוב"
                width={320}
                height={320}
                priority
                className="relative z-10 h-auto w-full max-w-[280px] sm:max-w-[320px]"
              />
              <svg
                className="pointer-events-none absolute inset-0 opacity-50"
                viewBox="0 0 320 320"
                aria-hidden="true"
              >
                <path
                  className="circuit-line"
                  d="M40 80 H120 V160 H220"
                  fill="none"
                  stroke="#7dd3fc"
                  strokeWidth="1"
                  opacity="0.5"
                />
                <path
                  className="circuit-line"
                  d="M280 220 H200 V120"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1"
                  opacity="0.45"
                  style={{ animationDelay: "2s" }}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
