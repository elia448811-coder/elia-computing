"use client";
import { useFormStatus } from "react-dom";
import { sendDocumentEmailAction } from "@/app/dashboard/actions";

function SendButton({ reminder }: { reminder: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn btn-primary min-h-10 px-4 py-2 text-sm" disabled={pending}>{pending ? "שולח…" : reminder ? "שליחת תזכורת" : "שליחה במייל"}</button>;
}
export function DocumentEmailButton({ documentId, signerId = "", reminder = false }: { documentId: string; signerId?: string; reminder?: boolean }) {
  return <form action={sendDocumentEmailAction.bind(null, documentId, signerId)}><SendButton reminder={reminder} /></form>;
}
