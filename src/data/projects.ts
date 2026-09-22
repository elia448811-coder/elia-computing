export const projects = [
  {
    id: "hana", name: "חנה", english: "HANA", category: "מערכת לניהול עסקי",
    headline: "פחות ניירת. יותר שליטה.",
    description: "מערכת לניהול מסמכים וחשבוניות, שמרכזת את המידע העסקי ומסייעת להפוך עבודה יומיומית לתהליך מסודר ונוח.",
    tags: ["ניהול חשבוניות", "מסמכים", "אוטומציה"],
    href: "https://hannaasher.co.il", color: "#7dd3fc", symbol: "H", action: "למערכת של חנה",
  },
  {
    id: "tabi", name: "טבי", english: "TABI DRIVE", category: "מערכת ללימוד נהיגה",
    headline: "בדרך לנהיגה בטוחה יותר.",
    description: "סביבת לימוד שמלווה את הדרך לרישיון, עם תרגול תאוריה, מבחנים ומעקב התקדמות, בחוויה ברורה ונגישה.",
    tags: ["לימוד נהיגה", "תרגול תאוריה", "מעקב התקדמות"],
    href: "https://tabi-drive.vercel.app", color: "#6ee7b7", symbol: "T", action: "למערכת של טבי",
  },
  {
    id: "zohar", name: "זוהר מנעולן", english: "ZOHAR", category: "אתר לעסק",
    headline: "הדלת הדיגיטלית של העסק.",
    description: "אתר תדמית לשירותי מנעולנות, שמציג את שירותי העסק ומאפשר ללקוחות למצוא את המידע שהם צריכים וליצור קשר בקלות.",
    tags: ["אתר תדמית", "שירותים", "יצירת קשר"],
    href: "https://zohar-locksmith.vercel.app", color: "#fcd28b", symbol: "Z", action: "לאתר של זוהר",
  },
  {
    id: "couples", name: "משחק הזוגות", english: "DOUBLE GAME", category: "משחק אינטראקטיבי",
    headline: "זמן ביחד, עם טוויסט.",
    description: "משחק לזוגות עם שאלות ומשימות שמכניסות עניין לזמן המשותף. חוויה דיגיטלית שמזמינה להכיר, לצחוק ולשחק ביחד.",
    tags: ["שאלות ומשימות", "משחק זוגי", "אינטראקטיביות"],
    href: "https://double-game-black.vercel.app", color: "#f9a8d4", symbol: "♡", action: "למשחק הזוגות",
  },
] as const;
