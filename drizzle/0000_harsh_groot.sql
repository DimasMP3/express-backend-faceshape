CREATE TYPE "public"."face_shape_enum" AS ENUM('heart', 'oval', 'round', 'square', 'oblong');--> statement-breakpoint
CREATE TABLE "images" (
	"id" serial PRIMARY KEY NOT NULL,
	"face_shape" "face_shape_enum" NOT NULL,
	"title" varchar(200),
	"url" text NOT NULL,
	"mime" varchar(100),
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "u_images_url" ON "images" USING btree ("url");--> statement-breakpoint
CREATE INDEX "idx_images_face_shape" ON "images" USING btree ("face_shape","sort_order");