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
      "foto/CombOverWithLowFadeHairstyle.png",
      "foto/CutQuiffWithFullerSidesHairstyle.png",
      "foto/TexturedQuiffHairstyle.png",
      "foto/TexturedFringeHairstyle.png",
      "foto/TaperedSideburnsWithLengthHairstyle.png",
      "foto/ShortAfroWithShapeUpHairstyle.png",
      "foto/ModernShagHairstyle.png",
      "foto/LongerWavyHairstyle.png",
      "foto/TaperedSideburnsWithLengthHairstyle.png",
      "foto/DeepSidePartHairstyle.png",
    ],
    oblong: [
      "foto/BuzzCutHairstyle.png",
      "foto/ClassicSidePartHairstyle.png",
      "foto/CurtainsHairstyle.png",
      "foto/ForwardStyledFrenchCropHairstyle.png",
      "foto/MediumLengthHairstyle.png",
      "foto/MessyFringeHairstyle.png",
      "foto/ShortAfroWithLowFadeHairstyle.png",
      "foto/SideSweptFringeHairstyle.png",
      "foto/TaperedSidesWithTexturedTopHairstyle.png",
      "foto/WavyShagHairstyle.png",
    ],
    oval: [
      "foto/SidePartHairstyle.png",
      "foto/SlickBackHairstyle.png",
      "foto/BrushedUpHairwithFadeHairstyle.png",
      "foto/ManBunHairstyle.png",
      "foto/AfroWithTaperHairstyle.png",
      "foto/FrenchCropHairstyle.png",
      "foto/WavySidePartHairstyle.png",
      "foto/ClassicQuiffHairstyle.png",
      "foto/TexturedCropHairstyle.png",
      "foto/CommaHairHairstyle.png",
    ],
    round: [
      "foto/VerticalSpikyHairstyle.png",
      "foto/SpikyHairstyle.png",
      "foto/UndercutHairstyle.png",
      "foto/QuiffWithUndercutHairstyle.png",
      "foto/PompadourHairstyle.png",
      "foto/HardPartCombOverHairstyle.png",
      "foto/FauxHawkHairstyle.png",
      "foto/BrushedBackHairWithTaperedSidesHairstyle.png",
      "foto/BoxFadeHairstyle.png",
      "foto/AngularFringeHairstyle.png",
    ],
    square: [
      "foto/BuzzCutHairstyle.png",
      "foto/ClassicCrewCutHairstyle.png",
      "foto/ClassicSidePartHairstyle.png",
      "foto/CombOverHairstyle.png",
      "foto/HighAndTightMilitaryHairstyle.png",
      "foto/HighFadeHairstyle.png",
      "foto/ManBunHairstyle.png",
      "foto/MessyWavesHairstyle.png",
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