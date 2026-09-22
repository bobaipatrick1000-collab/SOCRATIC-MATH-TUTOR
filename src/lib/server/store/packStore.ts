import { getDb } from "./db";

/** Docs: src/lib/ai/packSchema.ts. Cache row for a web-sourced Topic Pack. */
export interface TopicPackRow {
  topicId: string;
  query: string;
  pack: unknown;
  sourceHash: string;
  fallback: boolean;
  createdAt: number;
  updatedAt: number;
}

type Row = Record<string, unknown>;

export function getTopicPack(topicId: string): TopicPackRow | null {
  const r = getDb()
    .prepare(
      "SELECT topic_id, query, pack_json, source_hash, fallback, created_at, updated_at FROM topic_packs WHERE topic_id = ?",
    )
    .get(topicId) as Row | undefined;
  if (!r) return null;
  return {
    topicId: String(r.topic_id),
    query: String(r.query),
    pack: JSON.parse(String(r.pack_json)),
    sourceHash: String(r.source_hash),
    fallback: Number(r.fallback) === 1,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

export function putTopicPack(
  topicId: string,
  query: string,
  pack: unknown,
  opts: { sourceHash?: string; fallback?: boolean; now?: number } = {},
): void {
  const now = opts.now ?? Date.now();
  getDb()
    .prepare(
      `INSERT INTO topic_packs (topic_id, query, pack_json, source_hash, fallback, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(topic_id) DO UPDATE SET
         query=excluded.query,
         pack_json=excluded.pack_json,
         source_hash=excluded.source_hash,
         fallback=excluded.fallback,
         updated_at=excluded.updated_at`,
    )
    .run(
      topicId,
      query,
      JSON.stringify(pack),
      opts.sourceHash ?? "",
      opts.fallback ? 1 : 0,
      now,
      now,
    );
}

export function listTopicPackIds(): string[] {
  const rows = getDb()
    .prepare("SELECT topic_id FROM topic_packs ORDER BY updated_at DESC")
    .all() as Row[];
  return rows.map((r) => String(r.topic_id));
}