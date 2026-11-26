type SealedDraft = { format: "elia-draft-v1"; device: string; iv: string; ciphertext: ArrayBuffer };
export class DraftUnlockError extends Error {}
const DEVICE = "elia-draft-device-v1";
const FORMAT = "elia-draft-v1";
const encoder = new TextEncoder();

function base64(bytes: ArrayBuffer) {
  const input = new Uint8Array(bytes);
  let result = "";
  for (let i = 0; i < input.length; i += 8192) result += String.fromCharCode(...input.subarray(i, i + 8192));
  return btoa(result);
}
function decode(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

export function createDraftCipher() {
  const keys = new Map<string, Promise<CryptoKey>>();
  function loadKey(device: string) {
    let key = keys.get(device);
    if (!key) {
      key = (async () => {
        const response = await fetch("/api/dashboard/draft-key", { method: "POST", credentials: "same-origin", cache: "no-store", body: device });
        if (!response.ok) throw new Error("draft-key-unavailable");
        return crypto.subtle.importKey("raw", decode((await response.json()).key), "AES-GCM", false, ["encrypt", "decrypt"]);
      })().catch((error) => { keys.delete(device); throw error; });
      keys.set(device, key);
    }
    return key;
  }
  async function seal(slot: string, bytes: ArrayBuffer): Promise<SealedDraft> {
    let device = localStorage.getItem(DEVICE);
    if (!device) { device = crypto.randomUUID(); localStorage.setItem(DEVICE, device); }
    const key = await loadKey(device);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: encoder.encode(slot) }, key, bytes);
    return { format: FORMAT, device, iv: base64(iv.buffer), ciphertext };
  }
  async function open(slot: string, stored: SealedDraft) {
    try {
      return await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(stored.iv), additionalData: encoder.encode(slot) }, await loadKey(stored.device), stored.ciphertext);
    } catch { throw new DraftUnlockError("draft-key-unavailable"); }
  }
  async function encryptedText(slot: string, raw: string) {
    const sealed = await seal(slot, encoder.encode(raw).buffer);
    return JSON.stringify({ ...sealed, ciphertext: base64(sealed.ciphertext) });
  }
  async function readText(slot: string) {
    const raw = localStorage.getItem(slot);
    if (raw === null) return null;
    const value = JSON.parse(raw);
    if (value?.format === FORMAT) return new TextDecoder().decode(await open(slot, { ...value, ciphertext: decode(value.ciphertext).buffer }));
    // Keep an existing recovery copy intact until the encrypted replacement is ready.
    try {
      const replacement = await encryptedText(slot, raw);
      if (localStorage.getItem(slot) === raw) localStorage.setItem(slot, replacement);
    } catch { /* Old plaintext can still be recovered until migration succeeds. */ }
    return raw;
  }
  async function migrateText(slot: string) {
    const raw = localStorage.getItem(slot);
    if (raw !== null && JSON.parse(raw)?.format !== FORMAT) await readText(slot);
  }
  const writes = new Map<string, symbol>();
  async function writeText(slot: string, raw: string) {
    const write = Symbol();
    writes.set(slot, write);
    const before = localStorage.getItem(slot);
    const encrypted = await encryptedText(slot, raw);
    if (writes.get(slot) !== write) return;
    if (localStorage.getItem(slot) !== before) throw new Error("draft-changed-during-save");
    localStorage.setItem(slot, encrypted);
  }
  return { seal, open, readText, writeText, migrateText, forget: () => { keys.clear(); writes.clear(); } };
}
export type DraftCipher = ReturnType<typeof createDraftCipher>;
export type { SealedDraft };
