import { listVideosByShape } from "@/repositories/videos-repo";
import { faceShapeEnum } from "@/db/schema";

type FaceShape = (typeof faceShapeEnum.enumValues)[number];

export async function getVideos(shape: FaceShape) {
  return listVideosByShape(shape);
}

