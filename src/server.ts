import express from "express";
import type { Request, Response } from "express";
import multer from "multer";
import cors from "cors";
import { predictClassification } from "./classifcationmodel";

interface PredictRequestBody {
  imageBase64?: string;
  imageUrl?: string;
  image?: string;
}

function extractBase64Payload(value: string): string {
  const commaIndex = value.indexOf(",");
  return commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
}

async function bufferFromRequest(body: PredictRequestBody, file?: Express.Multer.File): Promise<Buffer> {
  if (file && file.buffer && file.buffer.length > 0) {
    return file.buffer;
  }

  const base64Payload = body?.imageBase64 ?? body?.image;
  if (typeof base64Payload === "string" && base64Payload.trim().length > 0) {
    const normalized = extractBase64Payload(base64Payload.trim());
    return Buffer.from(normalized, "base64");
  }

  if (typeof body?.imageUrl === "string" && body.imageUrl.trim().length > 0) {
    const response = await fetch(body.imageUrl.trim());
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error("Provide multipart 'image' file, 'imageBase64', or 'imageUrl'.");
}

const app = express();
app.use(cors({ origin: true, credentials: true }));
const PORT = Number.parseInt(process.env.PORT ?? "5000", 10);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

app.use(express.json({ limit: "15mb" }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Narrowed request type that includes multer's `file` property
type MulterReq = Request & { file?: Express.Multer.File };

app.post("/predict", upload.single("image"), async (req: Request, res: Response) => {
  try {
    const mreq = req as MulterReq;
    const buffer = await bufferFromRequest(req.body as PredictRequestBody, mreq.file);
    const predictions = await predictClassification(buffer);
    res.json({ predictions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("/predict error", message);
    res.status(400).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Face-shape prediction service listening on http://localhost:${PORT}`);
});
