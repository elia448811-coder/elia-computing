"use server";

import { signDocument } from "@/lib/documents";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function signDocumentAction(token: string, formData: FormData) {
  const signerName = String(formData.get("signerName") ?? "").trim();
  const signature = String(formData.get("signature") ?? "").trim();
  const approved = formData.get("approved") === "on";
  if (!signerName || !signature || !approved) redirect(`/sign/${token}?error=1`);
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? requestHeaders.get("x-real-ip") ?? "unknown";
  const ipHash = createHmac("sha256", process.env.AUTH_SECRET ?? "local-audit").update(ip).digest("hex");
  const saved = await signDocument(token, signerName, signature, {
    ipHash,
    userAgent: requestHeaders.get("user-agent") ?? undefined,
  });
  redirect(`/sign/${token}?${saved ? "success=1" : "error=locked"}`);
}
