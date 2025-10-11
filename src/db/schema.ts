import {
  pgTable, serial, text, varchar, timestamp,
  pgEnum, integer, boolean, uniqueIndex, index
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const faceShapeEnum = pgEnum("face_shape_enum", ["heart","oval","round","square","oblong"]);

export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  faceShape: faceShapeEnum("face_shape").notNull(),
  title: varchar("title", { length: 200 }),
  url: text("url").notNull(),
  mime: varchar("mime", { length: 100 }),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
}, (t) => ({
  uImagesUrl: uniqueIndex("u_images_url").on(t.url),
  idxImagesFaceShape: index("idx_images_face_shape").on(t.faceShape, t.sortOrder),
}));

// Videos table to store public video URLs grouped by face shape
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  faceShape: faceShapeEnum("face_shape").notNull(),
  title: varchar("title", { length: 200 }),
  url: text("url").notNull(),
  mime: varchar("mime", { length: 100 }),
  durationSec: integer("duration_sec"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
}, (t) => ({
  uVideosUrl: uniqueIndex("u_videos_url").on(t.url),
  idxVideosFaceShape: index("idx_videos_face_shape").on(t.faceShape, t.sortOrder),
}));
