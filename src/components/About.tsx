import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";

const pillars = [
  { number: "01", title: "מבינים לפני שמבצעים", text: "מתחילים מהצורך העסקי ומהמטרה — ורק אז בוחרים את הטכנולוגיה הנכונה." },
  { number: "02", title: "כתובת אחת לכל הדרך", text: "תכנון, עיצוב, פיתוח, תשתיות, אבטחה והעלאה לאוויר תחת אחריות אחת." },
  { number: "03", title: "נשארים גם אחרי ההשקה", text: "כל פרויקט כולל שישה חודשי ליווי, התאמות ושיפור לפי השימוש האמיתי." },
];

export function About() {
  return (
    <section id="about" className="section-y relative" aria-labelledby="about-title">
      <div className="container-site">
        <Reveal>
          <SectionHeading eyebrow="הגישה שלנו" title="רעיון טוב צריך שותף טכנולוגי שיודע להפוך אותו למציאות" description="במקום לנהל כמה ספקים ולחבר לבד את כל החלקים, מקבלים מעטפת אחת ברורה — מהשיחה הראשונה ועד מערכת יציבה שעובדת בעולם האמיתי." />
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {pillars.map((pillar, index) => (
            <Reveal key={pillar.number} delayMs={index * 70}>
              <article className="glass group h-full rounded-[var(--radius-lg)] p-7 transition duration-300 hover:-translate-y-1 hover:border-electric/30">
                <span className="text-sm font-bold tracking-[0.18em] text-electric">{pillar.number}</span>
                <h3 className="mt-8 text-2xl font-bold text-white">{pillar.title}</h3>
                <p className="mt-3 leading-7 text-silver-muted">{pillar.text}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delayMs={100}>
          <div className="mt-6 overflow-hidden rounded-[var(--radius-xl)] border border-electric/15 bg-[linear-gradient(110deg,rgba(56,189,248,.12),rgba(255,255,255,.025))] p-7 sm:p-10">
            <div className="flex flex-col items-start justify-between gap-7 md:flex-row md:items-center">
              <div className="max-w-2xl">
                <p className="text-sm font-bold text-electric-bright">רעיון אחד. כתובת אחת. מעטפת מלאה.</p>
                <h3 className="mt-3 text-2xl font-bold leading-tight text-white sm:text-3xl">אתם מביאים את החזון. אנחנו דואגים לכל מה שצריך כדי שהוא יעבוד.</h3>
              </div>
              <a href="#contact" className="btn btn-primary shrink-0">בואו נדבר על הפרויקט</a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
