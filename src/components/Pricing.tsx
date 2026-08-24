import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";

const plans = [
  {
    name: "Basic",
    hebrew: "ביסיק",
    fit: "לעסק חדש שצריך להתחיל להיראות מקצועי ברשת",
    description:
      "דף נחיתה חד, מהיר ומדויק שמציג את העסק ומוביל את הלקוח ישירות ליצירת קשר.",
    features: [
      "דף נחיתה מעוצב בהתאמה אישית",
      "התאמה מלאה לנייד, טאבלט ומחשב",
      "טופס יצירת קשר וכפתור WhatsApp",
      "חיבור לדומיין ולאחסון",
      "הגדרות SEO בסיסיות",
      "ליווי ותמיכה לאחר העלייה לאוויר",
    ],
    cta: "אני רוצה Basic",
    featured: false,
  },
  {
    name: "Medium",
    hebrew: "מדיום",
    fit: "לעסק פעיל שרוצה אתר מלא שמייצר אמון ופניות",
    description:
      "אתר תדמית מקצועי עם כל העמודים החשובים, חוויית משתמש ברורה ותשתית שמוכנה לצמיחה.",
    features: [
      "אתר תדמית עד 6 עמודים",
      "אפיון, עיצוב ופיתוח בהתאמה לעסק",
      "מערכת נוחה לניהול ועדכון תוכן",
      "טפסי לידים, WhatsApp וחיבור לרשתות",
      "SEO, ביצועים ואבטחה ברמה מתקדמת",
      "6 חודשי שירות וליווי לאחר ההשקה",
    ],
    cta: "אני רוצה Medium",
    featured: true,
  },
  {
    name: "Pro+",
    hebrew: "פרו פלוס",
    fit: "לעסק שרוצה מערכת דיגיטלית מתקדמת ומותאמת",
    description:
      "פתרון מקצה לקצה לאתר או למערכת עם תהליכים חכמים, חיבורים ואפשרויות שמותאמות בדיוק לעסק.",
    features: [
      "אתר או מערכת בהתאמה אישית מלאה",
      "עמודים ותוכן לפי צורכי הפרויקט",
      "אזור לקוחות, טפסים ותהליכים מתקדמים",
      "אוטומציות וחיבור למערכות חיצוניות",
      "מעטפת ביצועים, אבטחה ו-SEO",
      "6 חודשי שירות, ליווי ושיפורים",
    ],
    cta: "אני רוצה Pro+",
    featured: false,
  },
] as const;

export function Pricing() {
  return (
    <section
      id="packages"
      className="section-y relative overflow-hidden"
      aria-labelledby="packages-title"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(56,189,248,0.09),transparent_48%)]"
        aria-hidden="true"
      />
      <div className="container-site relative">
        <Reveal>
          <SectionHeading
            eyebrow="חבילות לבניית אתרים"
            title="בוחרים את החבילה שמתאימה לשלב של העסק"
            description="שלושה מסלולים ברורים — מנוכחות דיגיטלית ראשונה ועד מערכת מתקדמת שמותאמת לעסק שלכם."
          />
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan, index) => (
            <Reveal key={plan.name} delayMs={index * 90}>
              <article
                className={`relative flex h-full flex-col rounded-[var(--radius-xl)] p-7 sm:p-8 ${
                  plan.featured
                    ? "border border-electric/55 bg-gradient-to-b from-electric/18 via-white/[0.055] to-white/[0.025] shadow-[var(--glow)] lg:-translate-y-3"
                    : "glass"
                }`}
              >
                {plan.featured ? (
                  <span className="absolute -top-3 right-7 rounded-full bg-electric px-4 py-1.5 text-xs font-extrabold text-ink shadow-lg shadow-electric/20">
                    הכי פופולרית
                  </span>
                ) : null}

                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-electric-bright">
                      {plan.name}
                    </p>
                    <h3 className="mt-1 text-3xl font-extrabold text-white">
                      {plan.hebrew}
                    </h3>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-silver-muted">
                    בהתאמה אישית
                  </span>
                </div>

                <p className="mt-5 text-sm font-bold leading-relaxed text-electric-bright">
                  {plan.fit}
                </p>
                <p className="mt-3 min-h-20 leading-relaxed text-silver-muted">
                  {plan.description}
                </p>

                <div className="my-7 h-px bg-gradient-to-l from-transparent via-white/15 to-transparent" />

                <p className="text-sm font-bold text-white">מה כלול בחבילה?</p>
                <ul className="mt-4 flex-1 space-y-3.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed text-silver">
                      <span
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-electric/15 text-xs font-black text-electric-bright"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#contact"
                  className={`btn mt-8 ${plan.featured ? "btn-primary" : "btn-secondary"}`}
                >
                  {plan.cta}
                </a>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delayMs={160}>
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 text-center text-sm leading-relaxed text-silver-muted">
            כל פרויקט מתחיל בשיחת היכרות ואפיון קצרה. לאחר שנבין את הצורך,
            תקבלו הצעת מחיר מסודרת ושקופה — בלי הפתעות ובלי סעיפים נסתרים.
          </div>
        </Reveal>
      </div>
    </section>
  );
}
