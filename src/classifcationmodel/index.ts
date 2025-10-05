import { Client } from "@gradio/client";
import type { Client as GradioClient } from "@gradio/client";
import type sharp from "sharp";

const FACE_SHAPE_SPACE_ID = "DimasMP3/hf-classification-faceshape";
const DEFAULT_ENDPOINT = "/predict";
const INPUT_NAME = "image_pil";
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
    return await sharpFactory(imageBuffer).jpeg().toBuffer();
  } catch {
    return imageBuffer;
  }
}

export function connectFaceShapeClient(): Promise<GradioClient> {
  return Client.connect(FACE_SHAPE_SPACE_ID);
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
    const probabilities: Record<string, number> = Object.fromEntries(
      labels.map((label) => [label, 0])
    );

    for (const item of confidences) {
      const key = item.label == null ? "" : String(item.label);
      const confidence = typeof item.confidence === "number" ? item.confidence : 0;

      if (key in probabilities) {
        probabilities[key] = confidence;
      } else if (key) {
        probabilities[key] = confidence;
      }
    }

    const topConfidence = confidences[0]?.confidence ?? null;
    const label = prediction.label == null ? "" : String(prediction.label);

    return {
      label,
      percentage: typeof topConfidence === "number" ? topConfidence * 100 : 0,
      probabilities,
    };
  });
}

export default async function main(imageBuffer: Buffer): Promise<PredictionResult | undefined> {
  console.log("Model loaded successfully.");
  console.log("Image loaded.");

  const predictions = await predictClassification(imageBuffer);

  console.log("Final Prediction:", predictions);
  return predictions[0];
}
