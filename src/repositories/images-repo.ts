import { db } from "@/db/client";
import { images, faceShapeEnum } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
type FaceShape = (typeof faceShapeEnum.enumValues)[number];

export async function listImagesByShape(shape: FaceShape) {
  return db.select().from(images)
    .where(and(eq(images.faceShape, shape), eq(images.isActive, true)))
    .orderBy(images.sortOrder, images.id);
}

export async function upsertBulkImageUrls(urls: Array<{
  faceShape: FaceShape; url: string; title?: string | null; mime?: string | null; sortOrder?: number;
}>) {
  const urlsOnly = urls.map((u) => u.url);
  if (urlsOnly.length) {
    await db.delete(images).where(inArray(images.url, urlsOnly));
  }
  return db.insert(images).values(urls).returning();
}
