import { Router, type Request } from "express";
import multer from "multer";
import { bufferFromRequest, predictFromBuffer, type PredictBody } from "@/services/predict-service";

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
export const predictRouter = Router();

type MulterReq = Request & { file?: Express.Multer.File };

predictRouter.post("/", upload.single("image"), async (req, res) => {
  try {
    const mreq = req as MulterReq;
    const buf = await bufferFromRequest(req.body as PredictBody, mreq.file);
    const predictions = await predictFromBuffer(buf);
    if (!predictions?.length || !predictions[0]?.label) {
      return res.status(502).json({ error: "Upstream returned empty prediction" });
    }
    res.json({ predictions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("/predict error", msg);
    if (msg.includes("timeout exceeded")) {
      res.setHeader("Retry-After", "10");
      return res.status(503).json({ error: "Upstream timeout", retryAfter: 10 });
    }
    res.status(400).json({ error: msg });
  }
});
