import "server-only";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export const ALLOWED_GOOGLE_EMAIL = "elia448811@gmail.com";

function firebaseAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? "elia-computing-2026";
  return getApps().find((app) => app.name === "elia-firebase-auth") ??
    initializeApp({ projectId }, "elia-firebase-auth");
}

export async function verifyAllowedGoogleUser(idToken: string) {
  if (!idToken || idToken.length > 12000) return false;
  const decoded = await getAuth(firebaseAdminApp()).verifyIdToken(idToken);
  return decoded.email_verified === true &&
    decoded.email?.toLowerCase() === ALLOWED_GOOGLE_EMAIL &&
    decoded.firebase?.sign_in_provider === "google.com";
}
