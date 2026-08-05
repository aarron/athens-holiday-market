import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Fail loudly at first use rather than silently connecting to nothing.
  throw new Error(
    "DATABASE_URL is not set. Add a Neon connection string to .env.local / Vercel env.",
  );
}

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });

export type Database = typeof db;
export * as schema from "./schema";
