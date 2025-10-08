import { Router } from "express";
import multer from "multer";
import { buffersFromBatchRequest, predictBatchFromBuffers } from "@/services/predict-service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    if (ok) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

export const predictBatchRouter = Router();

predictBatchRouter.post("/", upload.any(), async (req, res) => {
  try {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const buffers = await buffersFromBatchRequest(req.body, files);
    if (!buffers.length) {
      return res.status(400).json({ error: "Provide images via multipart (image_1..3) or JSON imagesBase64" });
    }
    const results = await predictBatchFromBuffers(buffers);
    // Choose best by highest top percentage (with optional metrics tie-breaker)
    let bestShape = "";
    let bestConfidence = 0;
    let bestIndex = -1;
    // Optional tie-breaker using client metrics if provided
    type OrientationKey = "front" | "left" | "right";
    let tieBreaker: Record<OrientationKey, number> | null = null;
    try {
      const bodyUnknown: unknown = req.body;
      let rawMetrics: unknown = null;
      if (bodyUnknown && typeof bodyUnknown === "object" && "metrics" in bodyUnknown) {
        rawMetrics = (bodyUnknown as { metrics?: unknown }).metrics ?? null;
      }
      const parsed: unknown = typeof rawMetrics === "string" ? JSON.parse(rawMetrics) : rawMetrics;

      const getScore = (v: unknown): number => {
        if (typeof v === "number") return v;
        const n = Number((v as unknown) ?? 0);
        return Number.isFinite(n) ? n : 0;
      };

      if (parsed && typeof parsed === "object") {
        const p = parsed as {
          front?: { overallScore?: unknown };
          left?: { overallScore?: unknown };
          right?: { overallScore?: unknown };
        };
        tieBreaker = {
          front: getScore(p.front?.overallScore),
          left: getScore(p.left?.overallScore),
          right: getScore(p.right?.overallScore),
        };
      }
    } catch {
      // ignore metrics parse errors
    }

    const names: readonly OrientationKey[] = ["front", "left", "right"] as const;
    for (let idx = 0; idx < results.length; idx += 1) {
      const r = results[idx];
      const first = Array.isArray(r) && r.length ? r[0] : undefined;
      if (!first || typeof first.percentage !== "number") continue;
      const conf = Math.max(0, Math.min(1, first.percentage / 100));
      if (conf > bestConfidence && first.label) {
        bestConfidence = conf;
        bestShape = String(first.label);
        bestIndex = idx;
      } else if (first.label && tieBreaker && conf === bestConfidence && bestShape) {
        // Tie: prefer higher client overallScore if available
        const ori: OrientationKey = names[idx];
        const currentScore = tieBreaker[ori] ?? 0;
        const currentBestOri: OrientationKey = bestIndex >= 0 ? names[bestIndex] : ori;
        const bestScore = tieBreaker[currentBestOri] ?? 0;
        if (currentScore > bestScore) {
          bestConfidence = conf;
          bestShape = String(first.label);
          bestIndex = idx;
        }
      }
    }
    if (!bestShape) {
      return res.status(502).json({ error: "Upstream returned empty predictions" });
    }
    return res.json({ shape: bestShape, confidence: bestConfidence });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("/predict/batch error", msg);
    if (msg.includes("timeout exceeded")) {
      res.setHeader("Retry-After", "10");
      return res.status(503).json({ error: "Upstream timeout", retryAfter: 10 });
    }
    return res.status(400).json({ error: msg });
  }
});
