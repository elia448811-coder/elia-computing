export type WorkspaceSigner = { id: string; label: string; name: string; identityNumber: string; email: string; phone: string };
export type EditorDraft = {
  title: string; content: string; template: string; warrantyAgreement?: string;
  pageOrientation: "portrait" | "landscape"; pageHeader: string; pageFooter: string;
  showPageNumbers: boolean; fontFamily: string; lineHeight: string;
};
export type WorkspaceDraft = { version: 1; updatedAt: string; signers: WorkspaceSigner[]; editor: EditorDraft; step: number };
