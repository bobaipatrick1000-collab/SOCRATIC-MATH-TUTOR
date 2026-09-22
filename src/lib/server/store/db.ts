import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA_SQL } from "./schema";

const DATA_DIR = process.env.AUREA_DATA_DIR ?? path.join(process.cwd(), "data");
const DB_PATH = process.env.AUREA_DB_PATH ?? path.join(DATA_DIR, "aurea.db");

let instance: DatabaseSync | null = null;

/**
 * Single shared SQLite connection (Node >= 22.5 `node:sqlite`).
 * Production swaps this behind a port: Postgres via a dedicated driver.
 * Schema is idempotent (CREATE TABLE IF NOT EXISTS).
 *
 * Serverless filesystems are read-only outside /tmp, so if the on-disk
 * database cannot be created we degrade to an in-memory database: the app
 * keeps working (fallback packs, generated lessons) at the cost of a cache
 * that does not survive a cold start.
 */
export function getDb(): DatabaseSync {
  if (instance) return instance;
  instance = openDatabase();
  return instance;
}

function openDatabase(): DatabaseSync {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec(SCHEMA_SQL);
    return db;
  } catch {
    const mem = new DatabaseSync(":memory:");
    mem.exec(SCHEMA_SQL);
    return mem;
  }
}

export function closeDb(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}

export { DB_PATH };