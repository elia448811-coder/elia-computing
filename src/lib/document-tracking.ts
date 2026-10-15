import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/firebase-admin";
import { getDocumentById, getSignerByToken } from "@/lib/documents";

export async function recordDocumentView(token: string) {
  const context = await getSignerByToken(token);
  if (!context) return false;
  const db = getDatabase();
  const found = await db.collection("signatureDocuments").where("id", "==", context.document.id).limit(1).get();
  if (!found.docs[0]) return false;
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(found.docs[0].ref);
    const document = snapshot.data();
    if (!document || document.archivedAt) return false;
    const now = new Date().toISOString();
    if (context.signer) {
      const target = document.signers.find((item: { id: string }) => item.id === context.signer!.id);
      if (!target || (target.lastViewedAt && Date.now() - Date.parse(target.lastViewedAt) < 1800000)) return true;
      tx.update(snapshot.ref, { signers: document.signers.map((item: { id: string; firstViewedAt?: string }) => item.id === target.id ? { ...item, firstViewedAt: item.firstViewedAt ?? now, lastViewedAt: now } : item) });
    } else {
      if (document.lastViewedAt && Date.now() - Date.parse(document.lastViewedAt) < 1800000) return true;
      tx.update(snapshot.ref, { firstViewedAt: document.firstViewedAt ?? now, lastViewedAt: now });
    }
    return true;
  });
}

// A persisted delivery ID survives provider timeouts and prevents duplicate reminders.
export async function reserveDocumentEmail(id: string, signerId: string) {
  const document = await getDocumentById(id);
  if (!document || document.archivedAt) throw new Error("unavailable");
  const signer = signerId ? document.signers?.find((item) => item.id === signerId) : undefined;
  if (signerId && !signer || document.signers?.length && !signerId) throw new Error("unavailable");
  if (signer?.signedAt || document.signedAt) throw new Error("completed");
  const email = signer?.email || document.recipientEmail;
  const token = signer?.token || document.token;
  if (!email || !token) throw new Error("recipient");
  const ref = getDatabase().doc(`documentDeliveries/${createHash("sha256").update(`${id}/${signerId}`).digest("hex")}`);
  const delivery = await getDatabase().runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data();
    if (current?.sentAt && Date.now() - Date.parse(current.sentAt) < 300000) throw new Error("cooldown");
    // Reuse an unresolved send for 23h (within the provider's idempotency window).
    if (current?.status === "pending" && Date.now() - Date.parse(current.createdAt) < 23 * 3600000) return current as { deliveryId: string; reminder: boolean };
    const next = { deliveryId: randomUUID(), createdAt: new Date().toISOString(), status: "pending", reminder: Boolean(signer?.lastSentAt || document.lastSentAt) };
    tx.set(ref, next);
    return next;
  });
  return { document, signer, email, token, delivery, ref };
}

export async function completeDocumentEmail(reservation: Awaited<ReturnType<typeof reserveDocumentEmail>>, providerId: string) {
  const db = getDatabase();
  const found = await db.collection("signatureDocuments").where("id", "==", reservation.document.id).limit(1).get();
  if (!found.docs[0]) throw new Error("unavailable");
  await db.runTransaction(async (tx) => {
    const [snapshot, deliverySnapshot] = await Promise.all([tx.get(found.docs[0].ref), tx.get(reservation.ref)]);
    if (deliverySnapshot.data()?.deliveryId !== reservation.delivery.deliveryId) throw new Error("delivery-replaced");
    if (deliverySnapshot.data()?.status === "sent") return;
    const document = snapshot.data();
    if (!document) throw new Error("unavailable");
    const sentAt = new Date().toISOString();
    if (reservation.signer) {
      tx.update(snapshot.ref, { signers: document.signers.map((item: { id: string; sendCount?: number }) => item.id === reservation.signer!.id ? { ...item, lastSentAt: sentAt, sendCount: (item.sendCount ?? 0) + 1 } : item) });
    } else tx.update(snapshot.ref, { lastSentAt: sentAt, sendCount: (document.sendCount ?? 0) + 1 });
    tx.set(reservation.ref, { status: "sent", sentAt, providerId }, { merge: true });
  });
}
