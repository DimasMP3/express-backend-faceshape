import dotenv from "dotenv";
dotenv.config();
import { db } from "@/db/client";
import { images } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

async function main() {
  const total = await db.select({ c: sql<number>`count(*)` }).from(images);
  console.log("total rows:", total[0]?.c);
  const shapes = ["heart","oval","round","square","oblong"] as const;
  for (const s of shapes) {
    const all = await db.select().from(images).where(eq(images.faceShape, s));
    const active = await db
      .select()
      .from(images)
      .where(and(eq(images.faceShape, s), eq(images.isActive, true)));
    console.log(s, { all: all.length, active: active.length });
  }
}

main().catch(e => { console.error(e); process.exitCode = 1; });
