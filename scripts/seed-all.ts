import dotenv from "dotenv";
dotenv.config();

const BASE_URL = process.env.SEED_BASE_URL || "http://localhost:5000";

type Shape = "heart" | "oval" | "round" | "square" | "oblong";

const seeds: Record<Shape, string[]> = {
  oblong: [
    "Bro Flow.png",
    "Modern Caesar Cut.png",
    "Short and Messy Waves.png",
    "classic side part.png",
    "modern side-swept.png",
  ],
  round: [
    "High Volume Quiff.png",
    "Undercut with Angular Fringe.png",
    "classic pompadour.png",
    "faux hawk.png",
    "modern spiky.png",
  ],
  heart: [
    "medium-length layered.png",
    "modern shag.png",
    "modern textured fringe.png",
    "modern textured pompadour.png",
    "shoulder-length wavy hair.png",
  ],
  square: [
    "Classic Side Part.png",
    "Medium Length Messy Hair.png",
    "Textured Crew Cut.png",
    "buzz cut.png",
    "modern quiff with soft.png",
  ],
  oval: [
    "Comma hair..png",
    "Middle Part.png",
    "Slick Back Undercut.png",
    "Textured Crop.png",
    "modern quiff.png",
  ],
};

async function postBulk(shape: Shape, files: string[], mime = "image/png") {
  const res = await fetch(`${BASE_URL}/api/images/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ faceShape: shape, files, mime }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bulk insert failed for ${shape}: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json() as Promise<{ inserted: number }>;
}

async function main() {
  console.log(`Seeding images via ${BASE_URL}`);
  const shapes = Object.keys(seeds) as Shape[];
  let total = 0;
  for (const shape of shapes) {
    const files = seeds[shape];
    console.log(`\n- ${shape}: ${files.length} files`);
    const { inserted } = await postBulk(shape, files);
    total += inserted;
    console.log(`  inserted: ${inserted}`);
  }
  console.log(`\nDone. Total inserted: ${total}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

