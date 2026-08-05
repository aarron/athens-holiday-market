import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | null = null;

/**
 * Lazily construct the Neon/Drizzle client on first use.
 * Deferring neon() avoids evaluating the connection string at build/module-load
 * time (which broke static route analysis when DATABASE_URL was unavailable).
 */
function getDb(): DrizzleDb {
  if (_db) return _db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add a Neon connection string to the environment.");
  }
  _db = drizzle(neon(connectionString), { schema });
  return _db;
}

// Proxy so `db.query…`, `db.insert(…)`, etc. resolve against the lazy client.
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    const client = getDb();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export { schema };
