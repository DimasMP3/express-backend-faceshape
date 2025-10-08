import { predictClassification, predictBatchBest } from "@/classificationmodel";
import { ENV } from "@/util/env";

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
  return predictWithRetry(buf);
}

async function withTimeout<T>(p: Promise<T>, ms: number, label = "operation"): Promise<T> {
  let t: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timeout exceeded (${ms}ms)`)), ms);
  });
  try {
    const result = await Promise.race([p, timeout]);
    return result as T;
  } finally {
    if (t) clearTimeout(t);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(base: number) {
  const delta = Math.floor(base * 0.2);
  return base + Math.floor(Math.random() * (delta + 1));
}

async function predictWithRetry(buf: Buffer) {
  const delays = ENV.MODEL_RETRY_DELAYS_MS;
  const timeoutMs = ENV.MODEL_TIMEOUT_MS;
  let lastError: unknown = null;
  for (let i = 0; i < delays.length; i += 1) {
    try {
      const p = predictClassification(buf);
      const data = await withTimeout(p, timeoutMs, "predictClassification");
      return data;
    } catch (e) {
      lastError = e;
      if (i < delays.length - 1) {
        await sleep(jitter(delays[i + 1]));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("prediction failed");
}

export async function buffersFromBatchRequest(body: unknown, files?: Array<Express.Multer.File>) {
  const out: Buffer[] = [];
  // Multipart: image_1..3
  if (files && files.length) {
    const map = new Map<string, Buffer>();
    for (const f of files) {
      if (f && f.buffer && f.fieldname) {
        map.set(f.fieldname, f.buffer);
      }
    }
    const keys = ["image_1", "image_2", "image_3"];
    for (const k of keys) {
      const b = map.get(k);
      if (b && b.length) out.push(b);
    }
  }

  // JSON: { imagesBase64: [..] }
  const imagesBase64 = (body as { imagesBase64?: unknown })?.imagesBase64;
  if (Array.isArray(imagesBase64)) {
    for (const s of imagesBase64) {
      if (typeof s === "string" && s.trim()) {
        out.push(Buffer.from(extractBase64Payload(s.trim()), "base64"));
      }
    }
  }
  return out;
}

export async function predictBatchFromBuffers(buffers: Buffer[]) {
  const native = await tryPredictBatchNative(buffers);
  if (native) return [ [ native ] ];
  const results = [] as Awaited<ReturnType<typeof predictWithRetry>>[];
  for (const b of buffers) {
    const r = await predictWithRetry(b);
    results.push(r);
  }
  return results;
}

async function tryPredictBatchNative(buffers: Buffer[]) {
  try {
    // prefer native batch if available
    const best = await withTimeout(predictBatchBest(buffers), ENV.MODEL_TIMEOUT_MS, "predictBatchBest");
    return best;
  } catch {
    return null;
  }
}
