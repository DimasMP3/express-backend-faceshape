import postgres from "postgres";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { ENV } from "@/util/env";

function isHttpUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

// For Bun/Express apps, we require a Postgres DSN. If an HTTP URL is detected,
// guide the developer to use a proper DSN from Neon (postgres://... with ssl).
if (isHttpUrl(ENV.DATABASE_URL)) {
  throw new Error(
    "DATABASE_URL looks like an HTTP endpoint. Provide a Postgres connection string (postgres://user:pass@host/db?sslmode=require) from Neon instead."
  );
}

export const sql = postgres(ENV.DATABASE_URL, { prepare: false });
export const db = drizzlePg(sql);
