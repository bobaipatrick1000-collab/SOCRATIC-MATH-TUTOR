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
 */
export function getDb(): DatabaseSync {
  if (instance) return instance;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA_SQL);
  instance = db;
  return db;
}

export function closeDb(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}

export { DB_PATH };