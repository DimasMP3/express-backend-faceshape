import dotenv from "dotenv";
dotenv.config();

import { db } from "@/db/client";
import { videos, faceShapeEnum } from "@/db/schema";
import { ENV } from "@/util/env";
import { inArray } from "drizzle-orm";

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

function extToMime(fname: string): string {
  const lower = fname.toLowerCase();
  if (lower.endsWith(".mkv")) return "video/x-matroska";
  if (lower.endsWith(".mp4")) return "video/mp4";
  return "video/mp4";
}

async function seedShape(shape: FaceShape, files: string[]) {
  const filesWithPath = files.map((f) => `video/${f}`);

  const rows = filesWithPath.map((fname, i) => ({
    faceShape: shape,
    url: r2Url(shape, fname),
    title: (fname.split("/").pop() ?? fname).replace(/\.[a-z0-9]+$/i, "").trim(),
    mime: extToMime(fname),
    durationSec: null as number | null,
    sortOrder: i,
  }));

  const urls = rows.map((r) => r.url);
  if (urls.length) {
    await db.delete(videos).where(inArray(videos.url, urls));
  }
  if (rows.length) {
    await db.insert(videos).values(rows);
  }
  console.log(`- ${shape}: seeded ${rows.length}`);
}

async function main() {
  // Kumpulan video berdasarkan screenshot & script sebelumnya
  const data: Record<FaceShape, string[]> = {
    heart: [],
    oblong: [],
    oval: [
      "SidePartVideo.mp4",
      "SlickBackVideo.mp4",
      "BrushedUpHairwithFadeVideo.mp4",
      "ManBunVideo.mp4",
      "AfroWithTaperVideo.mp4",
      "FrenchCropVideo.mp4",
      "WavySidePartVideo.mp4",
      "ClassicQuiffVideo.mp4",
      "TexturedCropVideo.mp4",
      "CommaHairVideo.mp4",
    ],
    round: [
      "VerticalSpikyVideo.mkv",
      "SpikyVideo.mkv",
      "UndercutVideo.mkv",
      "QuiffWithUndercutVideo.mkv",
      "PompadourVideo.mkv",
      "HardPartCombOverVideo.mkv",
      "FauxHawkVideo.mkv",
      "BrushedBackHairWithTaperedSidesVideo.mkv",
      "BoxFadeVideo.mkv",
      "AngularFringeVideo.mkv",
    ],
    square: [
      "BuzzCutVideo.mp4",
      "ClassicCrewCutVideo.mp4",
      "ClassicSidePartVideo.mp4",
      "CombOverVideo.mp4",
      "HighAndTightMilitaryVideo.mp4",
      "HighFadeVideo.mp4",
      "ManBunVideo.mp4",
      "MessyWavesVideo.mp4",
      "ShortAfroWithBoxFadeVideo.mp4",
    ],
  };

  console.log(`Seeding all videos via R2 '${ENV.R2_URL}'`);
  for (const shape of Object.keys(data) as FaceShape[]) {
    await seedShape(shape, data[shape]);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

