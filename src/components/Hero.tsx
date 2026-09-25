import Image from "next/image";
import Link from "next/link";
import { projects } from "@/data/projects";

const capabilities = [
  { label: "מחשוב ורשתות", detail: "תשתית יציבה" },
  { label: "ענן ואבטחה", detail: "עבודה בטוחה" },
  { label: "אתרים ומערכות", detail: "צמיחה דיגיטלית" },
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

      <div className="container-site relative grid min-h-[680px] items-center gap-10 py-12 lg:grid-cols-[1.08fr_.92fr] lg:py-16">
        <div className="max-w-3xl">
          <div className="hero-kicker">
            <span className="hero-kicker-dot" />
            שותף טכנולוגי אחד לכל מה שהעסק צריך
          </div>
          <h1
            id="hero-title"
            className="mt-6 text-balance text-[clamp(2.75rem,6vw,5.4rem)] font-extrabold leading-[.93] tracking-[-0.055em] text-white"
          >
            פחות תקלות.
            <span className="hero-gradient block">יותר שקט לעבוד.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-silver sm:text-xl">
            מחשוב, רשתות, אבטחה, ענן ואתרים לעסקים שרוצים להתקדם, עם
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

          <ul className="hero-capabilities mt-10 grid max-w-2xl grid-cols-2 gap-3 lg:grid-cols-3" aria-label="תחומי התמחות מרכזיים">
            {capabilities.map((item) => (
              <li key={item.label} className="hero-capability rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 backdrop-blur-sm last:col-span-2 lg:last:col-span-1">
                <span className="block text-sm font-bold text-white">{item.label}</span>
                <span className="mt-1 block text-xs text-silver-muted">{item.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="hero-showcase relative mx-auto w-full max-w-[520px]">
          <div className="hero-showcase-glow" aria-hidden="true" />
          <div className="hero-showcase-frame">
            <div className="hero-showcase-topline">
              <span>מתוך הפרויקטים שלנו</span>
              <span className="hero-showcase-dots" aria-hidden="true"><i /><i /><i /></span>
            </div>
            <div className="hero-showcase-image">
              <Image src={projects[1].image} alt="צילום מסך של טבי, סביבת לימוד הנהיגה שפיתחנו" width={1440} height={900} sizes="(max-width: 1023px) 90vw, 520px" loading="eager" priority unoptimized />
            </div>
            <div className="hero-showcase-footer">
              <div><strong>טבי · בדרך לנהיגה בטוחה</strong><span>אפיון, עיצוב ופיתוח מערכת לימוד</span></div>
              <Link href="/projects" aria-label="לצפייה בפרויקטים שלנו">↗</Link>
            </div>
          </div>
          <div className="hero-showcase-note"><strong>04</strong><span>פרויקטים<br />שאפשר לראות</span></div>
        </div>
      </div>
    </section>
  );
}
