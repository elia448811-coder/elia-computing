import type { Metadata } from "next";
import Link from "next/link";
import { ProjectCards } from "@/components/Projects";

const description = "הכירו את הפרויקטים שלנו: המערכת של חנה, טבי ללימוד נהיגה, האתר של זוהר מנעולן ומשחק הזוגות. כל הפרויקטים והקישורים במקום אחד.";
export const metadata: Metadata = {
  title: "הפרויקטים שלנו", description,
  alternates: { canonical: "/projects" },
  openGraph: { title: "הפרויקטים שלנו | אליה שירותי מחשוב", description, url: "/projects" },
};

export default function ProjectsPage() {
  return (
    <main id="main" className="site-main projects-page">
      <div className="container-site">
        <section className="projects-hero" aria-labelledby="projects-page-title">
          <Link href="/" className="projects-back">ראשי <span aria-hidden="true">/</span> הפרויקטים שלנו</Link>
          <div className="projects-hero-layout">
            <div><p className="project-category">נבנה עם מחשבה. נועד לאנשים.</p><h1 id="projects-page-title">רעיונות שהפכו<br /><span className="hero-gradient">למציאות דיגיטלית.</span></h1><p className="projects-intro">הפרויקטים שלנו, במקום אחד. ממערכות שעושות סדר בעסק ועד חוויות שמחברות בין אנשים. מוזמנים להכיר ולהיכנס.</p></div>
            <div className="projects-hero-note"><span dir="ltr">04<span className="text-electric"> /</span></span><p>פרויקטים שונים.<br />אותה תשומת לב לפרטים.</p></div>
          </div>
          <div className="projects-collection-label"><h2>הפרויקטים שלנו</h2><span>מערכות · אתרים · משחקים</span></div>
        </section>
        <ProjectCards />
        <section className="projects-cta" aria-labelledby="projects-cta-title"><div><p className="project-category">הפרויקט הבא מתחיל ברעיון שלכם</p><h2 id="projects-cta-title">מה נבנה יחד?</h2><p>אתר לעסק, מערכת בהתאמה אישית או רעיון שעוד מחכה לקרות.</p></div><Link href="/#contact" className="btn btn-primary">בואו נדבר על הפרויקט שלכם <span aria-hidden="true">←</span></Link></section>
      </div>
    </main>
  );
}
