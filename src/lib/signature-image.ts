import "server-only";
import sharp from "sharp";

const MAX_DATA_URL_LENGTH = 450000;
const MAX_PIXELS = 4_000_000;

export async function normalizeSignatureImage(value: string): Promise<string | undefined> {
  if (value.length > MAX_DATA_URL_LENGTH || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return undefined;
  const encoded = value.slice("data:image/png;base64,".length);
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.toString("base64") !== encoded) return undefined;
  try {
    const image = sharp(bytes, { limitInputPixels: MAX_PIXELS, failOn: "warning" });
    const metadata = await image.metadata();
    if (metadata.format !== "png" || !metadata.width || !metadata.height ||
        metadata.width > 4096 || metadata.height > 4096 || (metadata.pages ?? 1) !== 1) return undefined;
    // Decode every pixel before committing a signature, and keep only a canonical PNG.
    const normalized = await image.png().toBuffer();
    const dataUrl = `data:image/png;base64,${normalized.toString("base64")}`;
    return dataUrl.length <= MAX_DATA_URL_LENGTH ? dataUrl : undefined;
  } catch {
    return undefined;
  }
}
