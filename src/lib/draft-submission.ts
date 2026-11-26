const prefix = "elia-draft-submission:";
export function rememberSubmission(slot: string, stamp: string | null) {
  if (!stamp) return "";
  try {
    const nonce = crypto.randomUUID();
    sessionStorage.setItem(prefix + slot, JSON.stringify({ nonce, stamp }));
    return nonce;
  } catch { return ""; }
}
export function submittedStamp(slot: string, nonce?: string): string | null {
  if (!nonce) return null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(prefix + slot) ?? "null");
    return saved?.nonce === nonce && typeof saved.stamp === "string" ? saved.stamp : null;
  } catch { return null; }
}
export function textStamp(slot: string): string | null {
  try {
    const saved = JSON.parse(localStorage.getItem(slot) ?? "null");
    return saved?.format === "elia-draft-v1" ? saved.iv : null;
  } catch { return null; }
}
export function clearSubmittedText(slot: string, nonce?: string) {
  const stamp = submittedStamp(slot, nonce);
  if (stamp && stamp === textStamp(slot)) localStorage.removeItem(slot);
}
