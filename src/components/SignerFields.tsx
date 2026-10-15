"use client";
import type { Customer } from "@/lib/customers";
import { MAX_SIGNERS } from "@/lib/document-status";
import type { WorkspaceSigner } from "@/lib/workspace-types";

export function blankSigner(index = 0): WorkspaceSigner {
  return { id: `signer-${crypto.randomUUID()}`, label: index === 0 ? "הלקוח" : `חותם ${index + 1}`, name: "", identityNumber: "", email: "", phone: "" };
}
export function SignerFields({ signers, customers, onChange }: { signers: WorkspaceSigner[]; customers: Customer[]; onChange: (signers: WorkspaceSigner[]) => void }) {
  function update(index: number, values: Partial<WorkspaceSigner>) { onChange(signers.map((signer, i) => i === index ? { ...signer, ...values } : signer)); }
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-bold text-white">לקוחות וחותמים</h3><p className="mt-1 text-sm text-silver-muted">עד שישה חותמים. לכל אחד ייווצר קישור אישי.</p></div><button className="btn btn-secondary text-sm" type="button" disabled={signers.length >= MAX_SIGNERS} onClick={() => onChange([...signers, blankSigner(signers.length)])}>+ הוספת חותם</button></div>
    <div className="grid gap-4 lg:grid-cols-2">{signers.map((signer, index) => <fieldset key={signer.id} className="rounded-2xl border border-white/15 bg-white/[0.025] p-4">
      <legend className="px-2 font-bold text-electric-bright">{signer.label}</legend>
      {signers.length > 1 ? <button className="float-left text-sm text-silver" type="button" aria-label={`הסרת ${signer.label}`} onClick={() => onChange(signers.filter((_, i) => i !== index))}>הסרה</button> : null}
      <label className="block text-sm text-silver">לקוח שמור<select className="workspace-input" value="" onChange={(event) => { const customer = customers.find((item) => item.id === event.target.value); if (customer) update(index, { name: customer.fullName, identityNumber: customer.identityNumber, email: customer.email, phone: customer.phone }); }}><option value="">בחירת לקוח…</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName} · {customer.identityNumber}</option>)}</select></label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-silver">שם מלא<input className="workspace-input" required value={signer.name} onChange={(event) => update(index, { name: event.target.value })} maxLength={160} /></label>
        <label className="text-sm text-silver">תעודת זהות<input className="workspace-input" required inputMode="numeric" pattern="[0-9]{9}" maxLength={9} value={signer.identityNumber} onChange={(event) => update(index, { identityNumber: event.target.value.replace(/\D/g, "") })} /></label>
        <label className="text-sm text-silver">אימייל<input className="workspace-input" type="email" value={signer.email} onChange={(event) => update(index, { email: event.target.value })} maxLength={320} /></label>
        <label className="text-sm text-silver">טלפון<input className="workspace-input" type="tel" value={signer.phone} onChange={(event) => update(index, { phone: event.target.value })} maxLength={32} /></label>
      </div>
    </fieldset>)}</div>
  </section>;
}
