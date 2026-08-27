"use server";

import { authenticate, createSession, hashIdentifier } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? requestHeaders.get("x-real-ip") ?? "local";
  const result = await authenticate(username, password, hashIdentifier(ip));
  if (!result.ok) redirect(`/login?error=${result.locked ? "locked" : "invalid"}`);
  await createSession();
  redirect("/dashboard");
}
