"use server";

import { changePassword, clearSession, createSession, isAuthenticated, validateNewPassword } from "@/lib/auth";
import { createDocument, createPdfDocument, type SignatureField } from "@/lib/documents";
import { documentTemplates, type DocumentTemplateKey } from "@/data/documentTemplates";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function createDocumentAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/login");
  let title = String(formData.get("title") ?? "").trim();
  const recipientName = String(formData.get("recipientName") ?? "").trim();
  const recipientEmail = String(formData.get("recipientEmail") ?? "").trim();
  let content = String(formData.get("content") ?? "").trim();
  const requestedTemplate = String(formData.get("template") ?? "blank");
  const template = requestedTemplate in documentTemplates ? requestedTemplate as DocumentTemplateKey : "blank";
  if (template !== "blank" && content === documentTemplates.blank.html) content = documentTemplates[template].html;
  if (template !== "blank" && title === documentTemplates.blank.title) title = documentTemplates[template].title;
  if (!title || !recipientName || !content) redirect("/dashboard?error=missing");
  const document = await createDocument({ title, recipientName, recipientEmail, content, template });
  revalidatePath("/dashboard");
  redirect(`/dashboard?created=${document.token}`);
}

export async function createPdfDocumentAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/login");
  const file = formData.get("pdfFile");
  const title = String(formData.get("pdfTitle") ?? "").trim();
  if (!(file instanceof File) || !title) redirect("/dashboard?pdfError=missing#multiple-signatures");
  let fields: SignatureField[] = [];
  try {
    fields = JSON.parse(String(formData.get("signatureFields") ?? "[]")) as SignatureField[];
  } catch {
    redirect("/dashboard?pdfError=fields#multiple-signatures");
  }
  const signers = [1, 2].map((number) => ({
    id: String(formData.get(`signer${number}Id`) ?? ""),
    label: String(formData.get(`signer${number}Label`) ?? ""),
    name: String(formData.get(`signer${number}Name`) ?? "").trim(),
    email: String(formData.get(`signer${number}Email`) ?? "").trim(),
  }));
  let documentId = "";
  try {
    const document = await createPdfDocument({
      title,
      fileName: file.name,
      pdfBytes: new Uint8Array(await file.arrayBuffer()),
      signers,
      fields,
    });
    documentId = document.id;
  } catch (error) {
    const reason = error instanceof Error && error.message === "invalid-pdf-size" ? "size" :
      error instanceof Error && error.message === "missing-signature-fields" ? "fields" : "invalid";
    redirect(`/dashboard?pdfError=${reason}#multiple-signatures`);
  }
  revalidatePath("/dashboard");
  redirect(`/dashboard?pdfCreated=${documentId}#documents`);
}

export async function changePasswordAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/login");
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (newPassword !== confirmation) redirect("/dashboard?passwordError=mismatch#security");
  if (validateNewPassword(newPassword, process.env.ADMIN_USERNAME ?? "")) redirect("/dashboard?passwordError=weak#security");
  if (!(await changePassword(currentPassword, newPassword))) redirect("/dashboard?passwordError=current#security");
  await createSession();
  redirect("/dashboard?passwordChanged=1#security");
}
