import { db } from "@/db/client";
import { videos, faceShapeEnum } from "@/db/schema";
import { and, eq } from "drizzle-orm";

type FaceShape = (typeof faceShapeEnum.enumValues)[number];

export async function listVideosByShape(shape: FaceShape) {
  return db
    .select()
    .from(videos)
    .where(and(eq(videos.faceShape, shape), eq(videos.isActive, true)))
    .orderBy(videos.sortOrder, videos.id);
}

