import Image from "next/image";
import { siteConfig } from "@/data/site";

export function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden pt-[var(--header-h)] lg:min-h-[100svh]"
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
        className="pointer-events-none absolute inset-0 hidden h-full w-full opacity-40 sm:block"
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

      <div className="container-site relative grid items-center gap-8 py-10 sm:gap-12 sm:py-14 lg:min-h-[calc(100svh-var(--header-h))] lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="mb-3 text-2xl font-extrabold tracking-tight text-white sm:mb-4 sm:text-3xl lg:text-4xl">
            {siteConfig.name}
          </p>
          <p className="mb-3 text-sm font-semibold text-electric-bright/90 sm:mb-4">
            {siteConfig.slogan}
          </p>
          <h1
            id="hero-title"
            className="text-balance text-[1.85rem] font-bold leading-[1.15] text-white sm:text-5xl lg:text-[3.35rem]"
          >
            פתרונות מחשוב שמקדמים אותך קדימה
          </h1>
          <p className="mt-4 text-pretty text-base font-medium leading-relaxed text-silver sm:mt-5 sm:text-xl">
            מחשוב, רשתות, אבטחת מידע, ענן, תמיכה טכנית, פיתוח ובניית אתרים,
            הכל במקום אחד.
          </p>
          <p className="mt-3 hidden max-w-xl text-pretty text-base leading-relaxed text-silver-muted sm:mt-4 sm:block">
            באליה שירותי מחשוב אנחנו הופכים טכנולוגיה לפשוטה, מהירה ובטוחה יותר
            עבור אנשים ועסקים.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
            <a href="#contact" className="btn btn-primary btn-stack-mobile">
              לקבלת ייעוץ
            </a>
            <a href="#services" className="btn btn-secondary btn-stack-mobile">
              לכל השירותים
            </a>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-[220px] items-center justify-center sm:max-w-[440px] lg:max-w-none">
          <div
            className="absolute h-[70%] w-[70%] rounded-full opacity-70 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(56,189,248,0.4), transparent 70%)",
            }}
            aria-hidden="true"
          />

          <div className="relative float-soft">
            <div
              className="orbit absolute inset-[-8%] hidden rounded-full border border-electric/15 sm:block"
              aria-hidden="true"
            >
              <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-electric-bright shadow-[0_0_16px_rgba(125,211,252,0.9)]" />
            </div>

            <Image
              src="/logos/logo-for-dark.jpg"
              alt="לוגו אליה שירותי מחשוב"
              width={640}
              height={640}
              priority
              loading="eager"
              sizes="(max-width: 640px) 200px, 400px"
              className="relative z-10 h-auto w-full max-w-[200px] rounded-full shadow-[0_0_50px_rgba(14,165,233,0.28)] sm:max-w-[380px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
