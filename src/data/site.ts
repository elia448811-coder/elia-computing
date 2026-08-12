export const siteConfig = {
  name: "אליה שירותי מחשוב",
  nameEn: "Elia Computing Services",
  slogan: "הופכים חלומות למציאות",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://elia-computing.vercel.app",
  locale: "he_IL",
  title:
    "אליה שירותי מחשוב | פתרונות מחשוב, רשתות, אבטחה, פיתוח ובניית אתרים",
  description:
    "אליה שירותי מחשוב - פתרונות מחשוב מתקדמים ללקוחות פרטיים ולעסקים: תמיכה טכנית, רשתות, אבטחת מידע, ענן, פיתוח תוכנה, בניית אתרים ודפי נחיתה.",
  contact: {
    // עדכון דרך משתני סביבה ב-Vercel / .env.local
    phone: process.env.NEXT_PUBLIC_PHONE ?? "",
    email: process.env.NEXT_PUBLIC_EMAIL ?? "elia448811@gmail.com",
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "", // מספר בינלאומי ללא +, למשל 9725XXXXXXXX
    address: process.env.NEXT_PUBLIC_ADDRESS ?? "",
  },
  social: {
    // אופציונלי — השאירו ריק אם אין
    facebook: "",
    instagram: "",
    linkedin: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
