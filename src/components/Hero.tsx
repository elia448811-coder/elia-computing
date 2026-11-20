import Image from "next/image";
import { projects } from "@/data/projects";

const areas = [
  { title: "מחשוב שמטפל במה שצריך.", detail: "תמיכה, התקנות ושדרוגים." },
  { title: "תשתיות לבסיס מסודר.", detail: "רשתות, ענן ואבטחה." },
  { title: "פיתוח לצעד הבא.", detail: "אתרים, מערכות ואוטומציות." },
];

export function Hero() {
  return (
    <section id="home" className="warm-hero" aria-labelledby="hero-title">
      <div className="container-site">
        <div className="warm-hero-layout">
          <div className="warm-hero-copy">
            <h1 id="hero-title" className="warm-hero-title">
              הטכנולוגיה<br />של העסק.<br /><span>בגובה העיניים.</span>
            </h1>
            <p className="warm-hero-description">
              מחשבים, רשתות, אתרים ומערכות. אני כאן כדי להבין מה אתם צריכים,
              ולעזור לכם למצוא את הפתרון המתאים.
            </p>
            <a href="#contact" className="btn btn-primary warm-hero-cta">
              ספרו לי על העסק
            </a>
          </div>
          <div className="warm-hero-visual">
            <figure className="stone-card">
              <span className="stone-card-label">פרויקט לדוגמה</span>
              <Image
                className="stone-card-image"
                src={projects[0].image}
                alt="צילום מסך של מערכת חנה לניהול עסקי"
                width={1440}
                height={900}
                sizes="(max-width: 640px) 212px, 298px"
                priority
                unoptimized
              />
              <figcaption className="stone-card-footer">חנה: מערכת לניהול עסקי שפיתחתי</figcaption>
            </figure>
          </div>
        </div>
        <ul className="warm-areas" aria-label="תחומי השירות">
          {areas.map((area) => (
            <li key={area.title}>
              <a href="#services">
                <h2>{area.title}</h2>
                <p>{area.detail}</p>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
