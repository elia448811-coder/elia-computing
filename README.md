# אליה שירותי מחשוב

אתר תדמית מקצועי עבור **אליה שירותי מחשוב** — Next.js, TypeScript, Tailwind CSS.

## הרצה מקומית

```bash
npm install
npm run dev
```

פתחו [http://localhost:3000](http://localhost:3000).

## הגדרת פרטי קשר

עדכנו את `src/data/site.ts` או העתיקו `.env.example` ל-`.env.local`:

- `NEXT_PUBLIC_PHONE`
- `NEXT_PUBLIC_EMAIL`
- `NEXT_PUBLIC_WHATSAPP` (מספר בינלאומי ללא `+`, למשל `9725XXXXXXXX`)
- `NEXT_PUBLIC_SITE_URL`

## הוספת פרויקטים

ערכו את המערך `projects` בתוך `src/data/content.ts`.

## לוגו

קבצי הלוגו נמצאים ב-`public/logos/`. ניתן להחליף בגרסאות המקוריות (כהה / בהירה / סמל).

## פריסה

```bash
npm run build
vercel
```
