import { upsertBulkImageUrls, listImagesByShape } from "@/repositories/images-repo";
import { ENV } from "@/util/env";
import { faceShapeEnum } from "@/db/schema";
type FaceShape = (typeof faceShapeEnum.enumValues)[number];

function encodePathSegments(p: string) {
  return p
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

export function composeR2Url(shape: FaceShape, filenameOrPath: string) {
  return `${ENV.R2_URL}/${shape}/${encodePathSegments(filenameOrPath)}`;
}

export async function getImages(shape: FaceShape) {
  return listImagesByShape(shape);
}

export async function saveBulkImages(shape: FaceShape, files: string[], mime = "image/png") {
  const rows = files.map((fname, i) => ({
    faceShape: shape,
    url: composeR2Url(shape, fname),
    title: (fname.split("/").pop() ?? fname).replace(/\.[a-z0-9]+$/i, "").trim(),
    mime,
    sortOrder: i,
  }));
  const inserted = await upsertBulkImageUrls(rows);
  return inserted.length;
}
