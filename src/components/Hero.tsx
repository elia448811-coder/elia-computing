import { Logo } from "@/components/Logo";

const capabilities = [
  { label: "מחשוב ורשתות", detail: "תשתית יציבה" },
  { label: "ענן ואבטחה", detail: "עבודה בטוחה" },
  { label: "אתרים ומערכות", detail: "צמיחה דיגיטלית" },
];

const serviceStatus = [
  { label: "מערכות ותשתיות", value: "מנוהל", tone: "bg-emerald-400" },
  { label: "אבטחה וגיבויים", value: "מוגן", tone: "bg-sky-400" },
  { label: "אתר ונוכחות דיגיטלית", value: "באוויר", tone: "bg-violet-400" },
];

export function Hero() {
  return (
    <section
      id="home"
      className="hero-shell relative overflow-hidden pt-[76px]"
      aria-labelledby="hero-title"
    >
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" aria-hidden="true" />
      <div className="hero-orb hero-orb-one" aria-hidden="true" />
      <div className="hero-orb hero-orb-two" aria-hidden="true" />

      <div className="container-site relative grid min-h-[calc(100svh-76px)] items-center gap-14 py-16 lg:grid-cols-[1.08fr_.92fr] lg:py-24">
        <div className="max-w-3xl">
          <div className="hero-kicker">
            <span className="hero-kicker-dot" />
            שותף טכנולוגי אחד לכל מה שהעסק צריך
          </div>
          <h1
            id="hero-title"
            className="mt-7 text-balance text-[clamp(3rem,7vw,6rem)] font-extrabold leading-[.93] tracking-[-0.055em] text-white"
          >
            פחות תקלות.
            <span className="hero-gradient block">יותר שקט לעבוד.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-silver sm:text-xl">
            מחשוב, רשתות, אבטחה, ענן ואתרים לעסקים שרוצים להתקדם — עם
            תכנון נכון, ביצוע מדויק וכתובת אחת שמכירה את כל התמונה.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#contact" className="btn btn-primary">
              בואו נדבר על העסק
            </a>
            <a href="#packages" className="btn btn-secondary">
              לצפייה בחבילות
            </a>
          </div>

          <ul className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3" aria-label="תחומי התמחות מרכזיים">
            {capabilities.map((item) => (
              <li key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 backdrop-blur-sm">
                <span className="block text-sm font-bold text-white">{item.label}</span>
                <span className="mt-1 block text-xs text-silver-muted">{item.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[500px]">
          <div className="hero-dashboard relative overflow-hidden rounded-[1.75rem] border border-white/12 p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                <Logo
                  variant="for-dark"
                  className="h-12 w-12 rounded-2xl border border-electric/20 object-cover"
                  priority
                  sizes="48px"
                />
                <div>
                  <p className="font-bold text-white">מרכז הבקרה של העסק</p>
                  <p className="text-xs text-silver-muted">אליה שירותי מחשוב</p>
                </div>
              </div>
              <span className="status-pill">הכול תקין</span>
            </div>

            <div className="mt-6 grid gap-3">
              {serviceStatus.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.tone} shadow-[0_0_16px_currentColor]`} />
                    <span className="text-sm font-medium text-silver">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold text-white">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-electric px-5 py-4 text-ink">
                <span className="block text-3xl font-black">6</span>
                <span className="text-sm font-bold">חודשי ליווי</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0c1829] px-5 py-4">
                <span className="block text-3xl font-black text-white">360°</span>
                <span className="text-sm text-silver-muted">מעטפת טכנולוגית</span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,.75)]" />
              <p className="text-sm text-silver">
                <strong className="font-bold text-white">מענה אישי וישיר</strong>
                <span className="text-silver-muted"> · בלי להעביר אתכם בין ספקים</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
