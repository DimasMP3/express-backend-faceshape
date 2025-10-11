import { Client } from "@gradio/client";
import type { Client as GradioClient } from "@gradio/client";
import type sharp from "sharp";
import { ENV } from "@/util/env";

const FACE_SHAPE_SPACE_ID = process.env.GRADIO_SPACE_ID;
const DEFAULT_ENDPOINT = "/predict";
const INPUT_NAME = "image_pil";
const BATCH_ENDPOINT = "/predict_batch";
const BATCH_INPUT_NAME = "files";
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
  const result = await client.predict(DEFAULT_ENDPOINT, { [INPUT_NAME]: normalizedBuffer });

  const payload = result.data as FaceShapePrediction | FaceShapePrediction[] | undefined;
  if (!payload) {
    return [];
  }

  const predictions = Array.isArray(payload) ? payload : [payload];

  return predictions.map((prediction) => {
    const confidences = prediction.confidences ?? [];
    const clamp01 = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);
    const probabilities: Record<string, number> = Object.fromEntries(labels.map((label) => [label, 0]));

    for (const item of confidences) {
      const key = item.label == null ? "" : String(item.label);
      const confidence = clamp01(typeof item.confidence === "number" ? item.confidence : 0);

      if (key in probabilities) {
        probabilities[key] = confidence;
      } else if (key) {
        probabilities[key] = confidence;
      }
    }

    const topConfidence = confidences.reduce<number>((max, c) => {
      const v = typeof c.confidence === "number" ? c.confidence : 0;
      return v > max ? v : max;
    }, 0);
    const label = prediction.label == null ? "" : String(prediction.label);

    return {
      label,
      percentage: clamp01(topConfidence) * 100,
      probabilities,
    };
  });
}

function payloadToPrediction(payload: FaceShapePrediction | undefined): PredictionResult | undefined {
  if (!payload) return undefined;
  const confidences = payload.confidences ?? [];
  const clamp01 = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);
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
  const label = payload.label == null ? "" : String(payload.label);
  return {
    label,
    percentage: clamp01(topConfidence) * 100,
    probabilities,
  };
}

export async function predictBatchBest(imageBuffers: Buffer[]): Promise<PredictionResult | undefined> {
  const client = await connectFaceShapeClient();
  // normalize to jpeg if needed
  const files: Buffer[] = [];
  for (const buf of imageBuffers) {
    files.push(await ensureJpegBuffer(buf));
  }
  const result = await client.predict(BATCH_ENDPOINT, { [BATCH_INPUT_NAME]: files });
  const payload = (result.data as FaceShapePrediction | FaceShapePrediction[] | undefined);
  // batch returns a single payload (best)
  if (Array.isArray(payload)) {
    return payloadToPrediction(payload[0]);
  }
  return payloadToPrediction(payload as FaceShapePrediction | undefined);
}

export default async function main(imageBuffer: Buffer): Promise<PredictionResult | undefined> {
  console.log("Model loaded successfully.");
  console.log("Image loaded.");

  const predictions = await predictClassification(imageBuffer);

  console.log("Final Prediction:", predictions);
  return predictions[0];
}
