import { Router } from "express";
import { z } from "zod";
import { getImages, saveBulkImages } from "@/services/images-service";
import { faceShapeEnum } from "@/db/schema";
type FaceShape = (typeof faceShapeEnum.enumValues)[number];

export const imagesRouter = Router();

// GET /api/images?shape=oval
imagesRouter.get("/", async (req, res) => {
  const q = String(req.query.shape ?? "oval");
  const maybe = q.toLowerCase() as FaceShape;
  const shape: FaceShape = faceShapeEnum.enumValues.includes(maybe) ? maybe : "oval";
  const items = await getImages(shape);
  res.json({ shape, items });
});

// POST /api/images/bulk
imagesRouter.post("/bulk", async (req, res) => {
  const schema = z.object({
    faceShape: z.enum(["heart","oval","round","square","oblong"]),
    files: z.array(z.string().min(1)).min(1),
    mime: z.string().optional(),
  });
  const body = schema.parse(req.body);
  const inserted = await saveBulkImages(body.faceShape, body.files, body.mime ?? "image/png");
  res.status(201).json({ inserted });
});
