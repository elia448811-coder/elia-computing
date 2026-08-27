import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardWorkspace } from "@/components/DashboardWorkspace";
import { siteConfig } from "@/data/site";
import { getSecurityActivity, getTwoFactorStatus, isAuthenticated } from "@/lib/auth";
import { listDocuments } from "@/lib/documents";

export const metadata: Metadata = { title: "מרכז ניהול חוזים", robots: { index: false } };
type DashboardQuery = { created?: string; duplicated?: string; pdfCreated?: string; pdfError?: string; error?: string; sent?: string; mailError?: string };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<DashboardQuery> }) {
  if (!(await isAuthenticated())) redirect("/login");
  const [query, documents, twoFactor, securityActivity] = await Promise.all([searchParams, listDocuments(), getTwoFactorStatus(), getSecurityActivity()]);
  const activeDocuments = documents.filter((document) => !document.archivedAt);
  const completed = activeDocuments.filter((document) => document.sourceType === "pdf" ? document.signers?.every((signer) => signer.signedAt) : document.signedAt).length;
  const libraryDocuments = documents.map((document) => ({ ...document, signature: undefined, signerIpHash: undefined, signerUserAgent: undefined, signers: document.signers?.map((signer) => ({ ...signer, signature: undefined, signerIpHash: undefined, signerUserAgent: undefined })) }));
  const signers = activeDocuments.reduce((sum, document) => sum + (document.signers?.length ?? (document.recipientName ? 1 : 0)), 0);
  return <main id="main" className="min-h-screen px-4 pb-20 pt-24 sm:pt-28"><DashboardWorkspace documents={libraryDocuments} siteUrl={siteConfig.url} twoFactorEnabled={twoFactor.enabled} recoveryCodesRemaining={twoFactor.recoveryCodesRemaining} securityActivity={securityActivity} stats={{ active: activeDocuments.length, waiting: activeDocuments.length - completed, completed, signers }} query={query} /></main>;
}
