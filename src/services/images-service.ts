import { upsertBulkImageUrls, listImagesByShape } from "@/repositories/images-repo";
import { ENV } from "@/util/env";
import { faceShapeEnum } from "@/db/schema";
type FaceShape = (typeof faceShapeEnum.enumValues)[number];

export function composeR2Url(shape: FaceShape, filename: string) {
  return `${ENV.R2_URL}/${shape}/${encodeURIComponent(filename)}`;
}

export async function getImages(shape: FaceShape) {
  return listImagesByShape(shape);
}

export async function saveBulkImages(shape: FaceShape, files: string[], mime = "image/png") {
  const rows = files.map((fname, i) => ({
    faceShape: shape,
    url: composeR2Url(shape, fname),
    title: fname.replace(/\.[a-z0-9]+$/i, "").trim(),
    mime,
    sortOrder: i,
  }));
  const inserted = await upsertBulkImageUrls(rows);
  return inserted.length;
}
