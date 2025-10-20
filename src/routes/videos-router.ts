import { Router } from "express";
import { faceShapeEnum } from "@/db/schema";
import { getVideos } from "@/services/videos-service";

type FaceShape = (typeof faceShapeEnum.enumValues)[number];

export const videosRouter = Router();

videosRouter.get("/", async (req, res) => {
  const q = String(req.query.shape ?? "oval");
  const maybe = q.toLowerCase() as FaceShape;
  const shape: FaceShape = faceShapeEnum.enumValues.includes(maybe) ? maybe : "oval";
  const items = await getVideos(shape);
  res.json({ shape, items });
});

