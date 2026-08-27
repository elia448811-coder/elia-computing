"use server";

import { createHash } from "node:crypto";
import { Resend } from "resend";
import { changePassword, clearSession, createSession, isAuthenticated, validateNewPassword } from "@/lib/auth";
import { createDocument, createPdfDocument, duplicateHtmlDocument, getDocumentById, setDocumentArchived, updateHtmlDocument, type SignatureField } from "@/lib/documents";
import { documentTemplates, type DocumentTemplateKey } from "@/data/documentTemplates";
import { siteConfig } from "@/data/site";
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
  const pageOrientation = String(formData.get("pageOrientation")) === "landscape" ? "landscape" as const : "portrait" as const;
  const pageHeader = String(formData.get("pageHeader") ?? "").slice(0, 160);
  const pageFooter = String(formData.get("pageFooter") ?? "").slice(0, 160);
  const showPageNumbers = String(formData.get("showPageNumbers")) !== "false";
  const fontFamily = String(formData.get("fontFamily") ?? "Heebo").slice(0, 80);
  const lineHeight = String(formData.get("lineHeight") ?? "1.75").slice(0, 10);
  const allowOpenFields = String(formData.get("allowOpenFields")) === "true";
  if (template !== "blank" && content === documentTemplates.blank.html) content = documentTemplates[template].html;
  if (template !== "blank" && title === documentTemplates.blank.title) title = documentTemplates[template].title;
  if (!title || !recipientName || !content) redirect("/dashboard?error=missing#create");
  if (!allowOpenFields && /\[[^\]]{2,100}\]|_{4,}/.test(content.replace(/<[^>]+>/g, " "))) redirect("/dashboard?error=open-fields#create");
  const document = await createDocument({ title, recipientName, recipientEmail, content, template, pageOrientation, pageHeader, pageFooter, showPageNumbers, fontFamily, lineHeight });
  revalidatePath("/dashboard");
  redirect(`/dashboard?created=${document.token}#documents`);
}

export async function createPdfDocumentAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/login");
  const file = formData.get("pdfFile");
  const title = String(formData.get("pdfTitle") ?? "").trim();
  if (!(file instanceof File) || !title) redirect("/dashboard?pdfError=missing#pdf");
  let fields: SignatureField[] = [];
  try {
    fields = JSON.parse(String(formData.get("signatureFields") ?? "[]")) as SignatureField[];
  } catch {
    redirect("/dashboard?pdfError=fields#pdf");
  }
  const signerCount = Math.min(4, Math.max(2, Number(formData.get("signerCount") ?? 2)));
  const signers = Array.from({ length: signerCount }, (_, index) => index + 1).map((number) => ({
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
    redirect(`/dashboard?pdfError=${reason}#pdf`);
  }
  revalidatePath("/dashboard");
  redirect(`/dashboard?pdfCreated=${documentId}#documents`);
}

export async function updateDocumentAction(id: string, formData: FormData) {
  if (!(await isAuthenticated())) redirect("/login");
  const title = String(formData.get("title") ?? "").trim();
  const recipientName = String(formData.get("recipientName") ?? "").trim();
  const recipientEmail = String(formData.get("recipientEmail") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const requestedTemplate = String(formData.get("template") ?? "blank");
  const template = requestedTemplate in documentTemplates ? requestedTemplate as DocumentTemplateKey : "blank";
  const pageOrientation = String(formData.get("pageOrientation")) === "landscape" ? "landscape" as const : "portrait" as const;
  const pageHeader = String(formData.get("pageHeader") ?? "").slice(0, 160);
  const pageFooter = String(formData.get("pageFooter") ?? "").slice(0, 160);
  const showPageNumbers = String(formData.get("showPageNumbers")) !== "false";
  const fontFamily = String(formData.get("fontFamily") ?? "Heebo").slice(0, 80);
  const lineHeight = String(formData.get("lineHeight") ?? "1.75").slice(0, 10);
  if (!title || !recipientName || !content) redirect(`/dashboard/documents/${id}/edit?error=missing`);
  try {
    await updateHtmlDocument(id, { title, recipientName, recipientEmail, content, template, pageOrientation, pageHeader, pageFooter, showPageNumbers, fontFamily, lineHeight });
  } catch {
    redirect(`/dashboard/documents/${id}/edit?error=locked`);
  }
  revalidatePath("/dashboard");
  redirect(`/dashboard/documents/${id}/edit?saved=1`);
}

export async function duplicateDocumentAction(id: string) {
  if (!(await isAuthenticated())) redirect("/login");
  const duplicate = await duplicateHtmlDocument(id);
  revalidatePath("/dashboard");
  redirect(`/dashboard?duplicated=${duplicate.id}#documents`);
}

export async function archiveDocumentAction(id: string, formData: FormData) {
  if (!(await isAuthenticated())) redirect("/login");
  await setDocumentArchived(id, String(formData.get("archived")) === "true");
  revalidatePath("/dashboard");
}

export async function sendDocumentEmailAction(id: string, signerId: string) {
  if (!(await isAuthenticated())) redirect("/login");
  const document = await getDocumentById(id);
  if (!document) redirect("/dashboard?mailError=missing#documents");
  const signer = signerId ? document.signers?.find((item) => item.id === signerId) : undefined;
  const email = signer?.email || document.recipientEmail;
  const name = signer?.name || document.recipientName || "לקוח/ה";
  const token = signer?.token || document.token;
  const from = process.env.CONTACT_FROM_EMAIL?.trim();
  const apiKey = process.env.RESEND_API_KEY;
  if (!email || !token || !from || !apiKey) redirect("/dashboard?mailError=config#documents");
  const url = `${siteConfig.url}/sign/${token}`;
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [email],
    subject: `מסמך לחתימה: ${document.title}`,
    text: [`שלום ${name},`, "", `ממתין לך מסמך לחתימה מאת ${siteConfig.name}:`, document.title, "", `פתיחת המסמך והחתימה: ${url}`, "", "הקישור אישי ואין להעבירו לאחר."].join("\n"),
  }, { idempotencyKey: `document/${id}/${signerId || "recipient"}/${createHash("sha256").update(`${email}|${url}`).digest("hex").slice(0, 20)}/${Math.floor(Date.now() / 300000)}` });
  if (error) redirect("/dashboard?mailError=send#documents");
  redirect("/dashboard?sent=1#documents");
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
