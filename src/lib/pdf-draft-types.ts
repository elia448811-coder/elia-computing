import type { SignatureField } from "@/lib/documents";
import type { WorkspaceSigner } from "@/lib/workspace-types";
export type PdfDraftData = { title: string; fileName: string; signers: WorkspaceSigner[]; fields: SignatureField[]; step: number; updatedAt: string };
export type PdfDraftEnvelope = { data: PdfDraftData; revision: string; chunkCount: number };
