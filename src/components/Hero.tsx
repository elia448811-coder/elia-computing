import Image from "next/image";

const capabilities = ["מחשוב ורשתות", "ענן ואבטחה", "אתרים ומערכות"];

export function Hero() {
  return (
    <section id="home" className="hero-shell relative overflow-hidden pt-[76px]" aria-labelledby="hero-title">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" aria-hidden="true" />
      <div className="hero-orb hero-orb-one" aria-hidden="true" />
      <div className="hero-orb hero-orb-two" aria-hidden="true" />

      <div className="container-site relative grid min-h-[calc(100svh-76px)] items-center gap-14 py-16 lg:grid-cols-[1.15fr_.85fr] lg:py-24">
        <div className="max-w-3xl">
          <div className="hero-kicker">
            <span className="hero-kicker-dot" />
            מעטפת טכנולוגית אחת. שקט אמיתי לעסק.
          </div>
          <h1 id="hero-title" className="mt-7 text-balance text-[clamp(2.8rem,7vw,5.7rem)] font-extrabold leading-[.95] tracking-[-0.045em] text-white">
            טכנולוגיה שעובדת
            <span className="hero-gradient block">בשבילכם.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-silver sm:text-xl">
            פתרונות מחשוב, תשתיות, אבטחת מידע, ענן ופיתוח דיגיטלי — מתוכננים נכון, מבוצעים בקפידה ומלווים באופן אישי גם אחרי ההשקה.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#contact" className="btn btn-primary">בואו נבנה את הפתרון שלכם</a>
            <a href="#services" className="btn btn-secondary">לכל השירותים</a>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3" aria-label="תחומי התמחות מרכזיים">
            {capabilities.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm font-medium text-silver">
                <span className="h-1.5 w-1.5 rounded-full bg-electric shadow-[0_0_12px_rgba(56,189,248,.9)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[480px]">
          <div className="hero-visual glass relative aspect-square overflow-hidden rounded-[2.25rem] p-6 sm:p-9">
            <div className="absolute inset-0 grid-bg opacity-40" aria-hidden="true" />
            <div className="relative flex h-full items-center justify-center">
              <div className="absolute h-[78%] w-[78%] rounded-full border border-electric/15" />
              <div className="absolute h-[58%] w-[58%] rounded-full border border-electric/25" />
              <Image src="/logos/logo-for-dark.jpg" alt="אליה שירותי מחשוב" width={640} height={640} priority sizes="(max-width: 768px) 75vw, 420px" className="relative z-10 w-[72%] rounded-full shadow-[0_0_70px_rgba(14,165,233,.32)]" />
              <span className="status-pill absolute bottom-1 right-1">זמינים לפרויקט הבא</span>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-3 rounded-2xl border border-white/10 bg-[#081321]/90 px-5 py-4 shadow-2xl backdrop-blur-xl sm:-left-8">
            <span className="block text-2xl font-extrabold text-white">6 חודשים</span>
            <span className="text-sm text-silver-muted">ליווי לאחר ההשקה</span>
          </div>
        </div>
      </div>
    </section>
  );
}
