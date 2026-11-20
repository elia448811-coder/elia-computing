"use server";
import { headers } from "next/headers";
import {
  createSession,
  hashIdentifier,
  isAuthenticated,
  setLoginCredentials,
  validateNewPassword,
  verifyLoginTwoFactor,
} from "@/lib/auth";
export async function setCredentialsAction(
  _previous: { ok: boolean; message: string },
  formData: FormData,
) {
  if (!(await isAuthenticated()))
    return { ok: false, message: "פג תוקף ההתחברות. התחברו מחדש." };
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!/^[A-Za-z0-9_.@-]{3,160}$/.test(username))
    return {
      ok: false,
      message:
        "שם המשתמש צריך לכלול לפחות 3 תווים באנגלית, ספרות או הסימנים _ . @ -",
    };
  if (password.length > 256 || validateNewPassword(password, username))
    return {
      ok: false,
      message:
        "יש לבחור סיסמה בת 12 תווים לפחות עם אות גדולה, אות קטנה, ספרה וסימן מיוחד. הסיסמה לא תכיל את שם המשתמש.",
    };
  if (password !== String(formData.get("confirmation") ?? ""))
    return { ok: false, message: "הסיסמאות אינן תואמות." };
  try {
    const requestHeaders = await headers();
    const ip =
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const verification = await verifyLoginTwoFactor(
      String(formData.get("totpCode") ?? "")
        .trim()
        .toUpperCase(),
      hashIdentifier(ip),
    );
    if (!verification.ok)
      return {
        ok: false,
        message: verification.locked
          ? "בוצעו יותר מדי ניסיונות. נסו שוב בעוד 15 דקות."
          : "נדרש קוד תקין מהמאמת או קוד שחזור כדי לעדכן את פרטי הכניסה.",
      };
    await setLoginCredentials(username, password);
    await createSession();
    return {
      ok: true,
      message:
        "פרטי הכניסה נשמרו. אפשר להתחבר בשם המשתמש והסיסמה שבחרתם. חיבורים אחרים יידרשו להתחבר מחדש.",
    };
  } catch {
    return { ok: false, message: "לא הצלחנו לשמור את פרטי הכניסה. נסו שוב." };
  }
}
