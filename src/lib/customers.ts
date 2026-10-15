import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/firebase-admin";

export type Customer = {
  id: string;
  fullName: string;
  identityNumber: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  previousIdentityNumbers?: string[];
};

export type CustomerInput = Pick<Customer, "fullName" | "identityNumber" | "email" | "phone">;

function clean(input: CustomerInput): CustomerInput {
  return {
    fullName: input.fullName.trim().slice(0, 160),
    identityNumber: input.identityNumber.replace(/\D/g, "").slice(0, 9),
    email: input.email.trim().toLocaleLowerCase("en").slice(0, 320),
    phone: input.phone.replace(/[^0-9+ -]/g, "").trim().slice(0, 32),
  };
}

function customerKey(customer: CustomerInput) {
  const stableKey = customer.identityNumber || customer.email || customer.fullName.toLocaleLowerCase("he");
  return createHash("sha256").update(stableKey).digest("hex");
}

export async function listCustomers() {
  const snapshot = await getDatabase().collection("customers").orderBy("updatedAt", "desc").get();
  return snapshot.docs.map((item) => item.data() as Customer);
}

export async function saveCustomers(inputs: CustomerInput[]) {
  const customers = inputs.map(clean).filter((customer) => customer.fullName && /^\d{9}$/.test(customer.identityNumber));
  if (!customers.length) return;
  const database = getDatabase();
  const now = new Date().toISOString();
  await Promise.all(customers.map(async (customer) => {
    const ref = database.doc(`customers/${customerKey(customer)}`);
    const existing = await ref.get();
    const current = existing.data() as Customer | undefined;
    await ref.set({
      id: current?.id ?? randomUUID(),
      createdAt: current?.createdAt ?? now,
      ...customer,
      updatedAt: now,
    } satisfies Customer, { merge: true });
  }));
}

export async function updateCustomer(id: string, input: CustomerInput & { notes: string }) {
  if (!id || id.length > 100) throw new Error("invalid-customer");
  const customer = clean(input);
  if (!customer.fullName || !/^\d{9}$/.test(customer.identityNumber) || customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new Error("invalid-customer");
  const db = getDatabase();
  const found = await db.collection("customers").where("id", "==", id).limit(1).get();
  if (!found.docs[0]) throw new Error("customer-not-found");
  const source = found.docs[0].ref;
  const destination = db.doc(`customers/${customerKey(customer)}`);
  return db.runTransaction(async (tx) => {
    const [snapshot, target] = await Promise.all([tx.get(source), tx.get(destination)]);
    const current = snapshot.data() as Customer | undefined;
    if (!current) throw new Error("customer-not-found");
    if (target.exists && target.data()?.id !== id) throw new Error("identity-exists");
    const updated: Customer = { ...current, ...customer, notes: input.notes.trim().slice(0, 5000), updatedAt: new Date().toISOString(), previousIdentityNumbers: [...new Set([...(current.previousIdentityNumbers ?? []), current.identityNumber])].filter((identity) => identity !== customer.identityNumber) };
    tx.set(destination, updated);
    if (source.path !== destination.path) tx.delete(source);
    return updated;
  });
}
