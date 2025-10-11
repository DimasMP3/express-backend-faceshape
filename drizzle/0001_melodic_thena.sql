CREATE TABLE "videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"face_shape" "face_shape_enum" NOT NULL,
	"title" varchar(200),
	"url" text NOT NULL,
	"thumbnail_url" text,
	"mime" varchar(100),
	"duration_sec" integer,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "u_videos_url" ON "videos" USING btree ("url");--> statement-breakpoint
CREATE INDEX "idx_videos_face_shape" ON "videos" USING btree ("face_shape","sort_order");