import dotenv from "dotenv";
dotenv.config();

import { ENV } from "@/util/env";
import { upsertBulkImageUrls } from "@/repositories/images-repo";
import { faceShapeEnum } from "@/db/schema";

type FaceShape = (typeof faceShapeEnum.enumValues)[number];

function encodePathSegments(p: string) {
  return p
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function r2Url(shape: FaceShape, path: string) {
  return `${ENV.R2_URL}/${shape}/${encodePathSegments(path)}`;
}

async function seedShape(shape: FaceShape, files: string[]) {
  const rows = files.map((fname, i) => ({
    faceShape: shape,
    url: r2Url(shape, fname),
    title: (fname.split("/").pop() ?? fname).replace(/\.[a-z0-9]+$/i, "").trim(),
    mime: "image/png",
    sortOrder: i,
  }));
  const inserted = await upsertBulkImageUrls(rows);
  console.log(`- ${shape}: inserted ${inserted.length}`);
}

async function main() {
  // nama file image mu kudu bener
  const data: Record<FaceShape, string[]> = {
    heart: [
      "foto/TexturedQuiffHairstyle.png",
      "foto/ShortAfroWithShapeUpHairstyle.png",
      "foto/CombOverWithLowFadeHairstyle.png",
      "foto/TaperedSideburnsWithLengthHairstyle.png",
      "foto/LongerWavyHairstyle.png",
    ],
    oblong: [
      "foto/ForwardStyledFrenchCropHairstyle.png",
      "foto/TaperedSidesWithTexturedTopHairstyle.png",
      "foto/ShortAfroWithLowFadeHairstyle.png",
      "foto/WavyShagHairstyle.png",
      "foto/CurtainsHairstyle.png",
    ],
    oval: [
      "foto/AfroWithTaperHairstyle.png",
      "foto/BrushedUpHairwithFadeHairstyle.png",
      "foto/FrenchCropHairstyle.png",
      "foto/ManBunHairstyle.png",
      "foto/WavySidePartHairstyle.png",
    ],
    round: [
      "foto/BoxFadeHairstyle.png",
      "foto/BrushedBackHairWithTaperedSidesHairstyle.png",
      "foto/HardPartCombOverHairstyle.png",
      "foto/QuiffWithUndercutHairstyle.png",
      "foto/VerticalSpikyHairstyle.png",
    ],
    square: [
      "foto/CombOverHairstyle.png",
      "foto/HighAndTightMilitaryHairstyle.png",
      "foto/ManBunHairstyle.png",
      "foto/ShortAfroWithBoxFadeHairstyle.png",
      "foto/SlickBackWithTaperFadeHairstyle.png",
    ],
  };

  console.log(`Seeding all 'foto' images via R2 '${ENV.R2_URL}'`);
  for (const shape of Object.keys(data) as FaceShape[]) {
    await seedShape(shape, data[shape]);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});