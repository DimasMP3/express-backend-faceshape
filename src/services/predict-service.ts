import { predictClassification } from "@/classificationmodel";

export type PredictBody = { imageBase64?: string; imageUrl?: string; image?: string; };

export function extractBase64Payload(v: string) {
  const i = v.indexOf(","); return i >= 0 ? v.slice(i + 1) : v;
}

export async function bufferFromRequest(body: PredictBody, file?: Express.Multer.File) {
  if (file?.buffer?.length) return file.buffer;
  const b64 = body?.imageBase64 ?? body?.image;
  if (typeof b64 === "string" && b64.trim()) return Buffer.from(extractBase64Payload(b64.trim()), "base64");
  if (typeof body?.imageUrl === "string" && body.imageUrl.trim()) {
    const resp = await fetch(body.imageUrl.trim()); if (!resp.ok) throw new Error("fetch image failed");
    return Buffer.from(await resp.arrayBuffer());
  }
  throw new Error("Provide multipart 'image', 'imageBase64', or 'imageUrl'.");
}

export async function predictFromBuffer(buf: Buffer) {
  return predictClassification(buf);
}
