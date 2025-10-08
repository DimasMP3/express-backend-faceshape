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
    let tieBreaker: Record<string, number> | null = null;
    try {
      const rawMetrics = (req.body as any)?.metrics ?? null;
      const parsed = typeof rawMetrics === "string" ? JSON.parse(rawMetrics) : rawMetrics;
      if (parsed && typeof parsed === "object") {
        tieBreaker = {
          front: Number(parsed.front?.overallScore ?? 0),
          left: Number(parsed.left?.overallScore ?? 0),
          right: Number(parsed.right?.overallScore ?? 0),
        } as Record<string, number>;
      }
    } catch {
      // ignore metrics parse errors
    }

    const names = ["front", "left", "right"] as const;
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
        const ori = names[idx] as unknown as keyof typeof tieBreaker;
        const currentScore = typeof tieBreaker[ori] === "number" ? tieBreaker[ori] : 0;
        const currentBestOri = bestIndex >= 0 ? (names[bestIndex] as unknown as keyof typeof tieBreaker) : ori;
        const bestScore = typeof tieBreaker[currentBestOri] === "number" ? tieBreaker[currentBestOri] : 0;
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
