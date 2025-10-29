import { Client } from "@gradio/client";
import type { Client as GradioClient } from "@gradio/client";
import type sharp from "sharp";
import { ENV } from "@/util/env";

const FACE_SHAPE_SPACE_ID = process.env.GRADIO_SPACE_ID;
const DEFAULT_ENDPOINT = "/predict";
const BATCH_ENDPOINT = "/predict_batch";
type SharpFactory = typeof sharp;

let sharpFactoryPromise: Promise<SharpFactory | null> | null = null;

async function loadSharp(): Promise<SharpFactory | null> {
  if (!sharpFactoryPromise) {
    sharpFactoryPromise = import("sharp")
      .then(({ default: sharpDefault }) => sharpDefault)
      .catch(() => null);
  }
  return sharpFactoryPromise;
}

export interface PredictionResult {
  label: string;
  percentage: number;
  probabilities: Record<string, number>;
}

export interface FaceShapeConfidence {
  label: string | number | null;
  confidence: number | null;
}

export interface FaceShapePrediction {
  label: string | number | null;
  confidences?: FaceShapeConfidence[] | null;
}

export const labels: string[] = ["Heart", "Oblong", "Oval", "Round", "Square"];

function isJpeg(buffer: Buffer): boolean {
  return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

async function ensureJpegBuffer(imageBuffer: Buffer): Promise<Buffer> {
  if (isJpeg(imageBuffer)) {
    return imageBuffer;
  }

  const sharpFactory = await loadSharp();
  if (!sharpFactory) {
    return imageBuffer;
  }

  try {
    return await sharpFactory(imageBuffer).jpeg({ quality: 90 }).toBuffer();
  } catch {
    return imageBuffer;
  }
}

export function connectFaceShapeClient(): Promise<GradioClient> {
  const target = (ENV.GRADIO_URL?.trim() || ENV.GRADIO_SPACE_ID?.trim() || FACE_SHAPE_SPACE_ID || "");
  const opts: { hf_token?: string } = {};
  if (ENV.HF_TOKEN) {
    opts.hf_token = ENV.HF_TOKEN;
  }
  return Client.connect(target, opts as Record<string, unknown>);
}

export async function predictClassification(imageBuffer: Buffer): Promise<PredictionResult[]> {
  const client = await connectFaceShapeClient();
  const normalizedBuffer = await ensureJpegBuffer(imageBuffer);
  // Prefer positional args to avoid brittle input names
  const result = await client.predict(DEFAULT_ENDPOINT, [normalizedBuffer]);
  return normalizeToPredictionArray(result.data);
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

function isLabelProbMap(obj: unknown): obj is Record<string, number> {
  if (!obj || typeof obj !== "object") return false;
  const rec = obj as Record<string, unknown>;
  const keys = Object.keys(rec);
  if (keys.length === 0) return false;
  // consider it a prob-map if most values are numbers in [0,1]
  let valid = 0;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "number") valid += 1;
  }
  return valid >= Math.max(1, Math.floor(keys.length * 0.6));
}

function probMapToPrediction(probMap: Record<string, number>): PredictionResult {
  const probabilities: Record<string, number> = Object.fromEntries(labels.map((l) => [l, 0]));
  for (const [k, v] of Object.entries(probMap)) {
    probabilities[k] = clamp01(v);
  }
  let bestLabel = "";
  let best = 0;
  for (const [k, v] of Object.entries(probabilities)) {
    if (v > best) {
      best = v;
      bestLabel = k;
    }
  }
  return { label: bestLabel, percentage: clamp01(best) * 100, probabilities };
}

function payloadToPrediction(payload: FaceShapePrediction | Record<string, number> | undefined): PredictionResult | undefined {
  if (!payload) return undefined;
  if (isLabelProbMap(payload)) {
    return probMapToPrediction(payload);
  }
  const confidences = (payload as FaceShapePrediction).confidences ?? [];
  const probabilities: Record<string, number> = Object.fromEntries(labels.map((l) => [l, 0]));
  for (const item of confidences) {
    const key = item.label == null ? "" : String(item.label);
    const confidence = clamp01(typeof item.confidence === "number" ? item.confidence : 0);
    if (key) probabilities[key] = confidence;
  }
  const topConfidence = confidences.reduce<number>((max, c) => {
    const v = typeof c.confidence === "number" ? c.confidence : 0;
    return v > max ? v : max;
  }, 0);
  const label = (payload as FaceShapePrediction).label == null ? "" : String((payload as FaceShapePrediction).label);
  return {
    label,
    percentage: clamp01(topConfidence) * 100,
    probabilities,
  };
}

function normalizeToPredictionArray(data: unknown): PredictionResult[] {
  if (!data) return [];
  const payload = data as FaceShapePrediction | FaceShapePrediction[] | Record<string, number>;
  const arr = Array.isArray(payload) ? payload : [payload];
  const out: PredictionResult[] = [];
  for (const item of arr) {
    const pred = payloadToPrediction(item as FaceShapePrediction | Record<string, number>);
    if (pred) out.push(pred);
  }
  return out;
}

export async function predictBatchBest(imageBuffers: Buffer[]): Promise<PredictionResult | undefined> {
  const client = await connectFaceShapeClient();
  // normalize to jpeg if needed
  const files: Buffer[] = [];
  for (const buf of imageBuffers) {
    files.push(await ensureJpegBuffer(buf));
  }
  // Positional args avoid brittle input names
  const result = await client.predict(BATCH_ENDPOINT, [files]);
  const payload = (result.data as FaceShapePrediction | FaceShapePrediction[] | Record<string, number> | undefined);
  // batch returns a single payload (best)
  if (Array.isArray(payload)) {
    return payloadToPrediction(payload[0] as FaceShapePrediction | Record<string, number>);
  }
  return payloadToPrediction(payload as FaceShapePrediction | Record<string, number> | undefined);
}

export default async function main(imageBuffer: Buffer): Promise<PredictionResult | undefined> {
  console.log("Model loaded successfully.");
  console.log("Image loaded.");

  const predictions = await predictClassification(imageBuffer);

  console.log("Final Prediction:", predictions);
  return predictions[0];
}
