import postgres from "postgres";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { ENV } from "@/util/env";

function isHttpUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

if (isHttpUrl(ENV.DATABASE_URL)) {
  throw new Error(
    "DATABASE_URL looks like an HTTP endpoint. Provide a Postgres connection string (postgres://user:pass@host/db?sslmode=require) from Neon instead."
  );
}

export const sql = postgres(ENV.DATABASE_URL, { prepare: false });
export const db = drizzlePg(sql);
