import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";

const plans = [
  {
    name: "Basic",
    hebrew: "ביסיק",
    scope: "עמוד נחיתה אחד",
    fit: "לעסק שצריך לעלות מהר לאוויר ולהתחיל לקבל פניות",
    description:
      "מסלול ממוקד לשירות או מוצר מרכזי אחד: עמוד חד וברור שמציג את ההצעה ומוביל לפעולה.",
    features: [
      "עמוד נחיתה אחד עם מסר ומטרה ברורים",
      "עיצוב אישי לפי השפה של העסק",
      "התאמה מלאה לנייד, טאבלט ומחשב",
      "טופס פנייה וכפתור WhatsApp ישיר",
      "חיבור לדומיין, אחסון ו-SEO בסיסי",
      "תקופת הרצה ותיקונים לאחר העלייה",
    ],
    cta: "אני רוצה Basic",
    featured: false,
  },
  {
    name: "Medium",
    hebrew: "מדיום",
    scope: "אתר מלא עד 6 עמודים",
    fit: "לעסק פעיל שצריך להציג כמה שירותים ולבנות אמון",
    description:
      "לא רק עמוד נחיתה: אתר תדמית שלם שמסביר מי אתם, מפריד בין השירותים ומייצר כמה מסלולי פנייה.",
    features: [
      "עד 6 עמודים נפרדים לשירותים ולתוכן",
      "אפיון מבנה האתר ומסע הלקוח",
      "מערכת עצמאית לניהול ועדכון תוכן",
      "כמה נקודות פנייה: טפסים, WhatsApp ורשתות",
      "SEO, מהירות ואבטחה ברמה מתקדמת",
      "6 חודשי ליווי ושירות לאחר ההשקה",
    ],
    cta: "אני רוצה Medium",
    featured: true,
  },
  {
    name: "Pro+",
    hebrew: "פרו פלוס",
    scope: "מערכת לפי אפיון",
    fit: "לעסק שצריך שהאתר יבצע תהליכים ולא רק יציג מידע",
    description:
      "פתרון שנבנה סביב צורת העבודה שלכם: אזורים אישיים, תהליכים חכמים וחיבורים למערכות העסק.",
    features: [
      "אתר או מערכת ללא מגבלת תבנית קבועה",
      "אזור לקוחות, הרשאות ותוכן אישי",
      "טפסים חכמים ותהליכים מרובי שלבים",
      "אוטומציות וחיבור ל-CRM ולמערכות חיצוניות",
      "מעטפת מתקדמת של ביצועים, אבטחה ו-SEO",
      "6 חודשי ליווי, התאמות ושיפורים",
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
            description="ביסיק: עמוד נחיתה ממוקד • מדיום: אתר עסקי מלא • פרו פלוס: מערכת שמפעילה תהליכים ומתחברת לכלי העסק."
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
                  <span className="rounded-full border border-electric/20 bg-electric/[0.07] px-3 py-1 text-xs font-bold text-electric-bright">
                    {plan.scope}
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
            תקבלו הצעת מחיר מסודרת ושקופה, בלי הפתעות ובלי סעיפים נסתרים.
          </div>
        </Reveal>
      </div>
    </section>
  );
}
