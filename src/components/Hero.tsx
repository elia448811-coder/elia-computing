const areas = [
  { label: "מחשוב", title: "לטפל במה שצריך.", detail: "תמיכה, התקנות ושדרוגים." },
  { label: "תשתיות", title: "לתכנן בסיס מסודר.", detail: "רשתות, ענן ואבטחה." },
  { label: "פיתוח", title: "לבנות את הצעד הבא.", detail: "אתרים, מערכות ואוטומציות." },
];

export function Hero() {
  return (
    <section id="home" className="warm-hero" aria-labelledby="hero-title">
      <div className="container-site">
        <div className="warm-hero-layout">
          <div className="warm-hero-copy">
            <p className="warm-eyebrow">אליה. שירותי מחשוב.</p>
            <h1 id="hero-title" className="warm-hero-title">
              הטכנולוגיה<br />של העסק.<br /><span>בגובה העיניים.</span>
            </h1>
            <p className="warm-hero-description">
              מחשבים, רשתות, אתרים ומערכות. אני כאן כדי להבין מה אתם צריכים,
              ולעזור לכם למצוא את הפתרון המתאים.
            </p>
            <a href="#contact" className="btn btn-primary warm-hero-cta">
              ספרו לי על העסק <span aria-hidden="true">↙</span>
            </a>
          </div>
          <div className="warm-hero-visual">
            <div className="stone-card">
              <span className="stone-card-label" lang="en">ELIA</span>
              <p className="stone-card-title">מחשוב.<br />עם קשר<br />אישי.</p>
              <span className="stone-card-footer">שירותי מחשוב ופיתוח</span>
            </div>
            <p className="warm-hero-note">מהתקלה במחשב<br />ועד הרעיון למערכת הבאה.</p>
          </div>
        </div>
        <ul className="warm-areas" aria-label="תחומי השירות">
          {areas.map((area, index) => (
            <li key={area.label}>
              <a href="#services">
                <span className="warm-area-label"><span aria-hidden="true">0{index + 1}</span> {area.label}</span>
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
