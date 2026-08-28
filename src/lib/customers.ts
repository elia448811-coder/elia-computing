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
