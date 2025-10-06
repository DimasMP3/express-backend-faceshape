import { Router, type Request } from "express";
import multer from "multer";
import { bufferFromRequest, predictFromBuffer, type PredictBody } from "@/services/predict-service";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
export const predictRouter = Router();

type MulterReq = Request & { file?: Express.Multer.File };

predictRouter.post("/", upload.single("image"), async (req, res) => {
  try {
    const mreq = req as MulterReq;
    const buf = await bufferFromRequest(req.body as PredictBody, mreq.file);
    const predictions = await predictFromBuffer(buf);
    res.json({ predictions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("/predict error", msg);
    res.status(400).json({ error: msg });
  }
});
