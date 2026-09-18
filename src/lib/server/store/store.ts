import { getDb } from "./db";
import type { ContentCard, SessionEvent, SkillWarmth } from "../../domain/types";

type Row = Record<string, unknown>;

function j(v: unknown): string {
  return JSON.stringify(v);
}

function rowToCard(r: Row): ContentCard {
  return {
    id: String(r.id),
    spine: r.spine as ContentCard["spine"],
    stem: String(r.stem),
    stemLatex: String(r.stem_latex),
    objective: String(r.objective),
    prerequisites: JSON.parse(String(r.prerequisites)),
    difficulty: Number(r.difficulty) as ContentCard["difficulty"],
    allowedPaths: JSON.parse(String(r.allowed_paths)),
    misconceptions: JSON.parse(String(r.misconceptions)),
    substantiveAttemptRules: JSON.parse(String(r.attempt_rules)),
    ladder: JSON.parse(String(r.ladder)),
    defaultWaitMs: Number(r.default_wait_ms),
    transferItemIds: JSON.parse(String(r.transfer_ids)),
    calcAllowed: Number(r.calc_allowed) === 1,
    altText: String(r.alt_text),
    canonicalAnswer: String(r.canonical_answer),
  };
}

const UPSERT_SQL = `
  INSERT INTO content_items (
    id, spine, stem, stem_latex, objective, prerequisites, difficulty,
    allowed_paths, misconceptions, attempt_rules, ladder, default_wait_ms,
    transfer_ids, calc_allowed, alt_text, canonical_answer
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET
    spine=excluded.spine, stem=excluded.stem, stem_latex=excluded.stem_latex,
    objective=excluded.objective, prerequisites=excluded.prerequisites,
    difficulty=excluded.difficulty, allowed_paths=excluded.allowed_paths,
    misconceptions=excluded.misconceptions, attempt_rules=excluded.attempt_rules,
    ladder=excluded.ladder, default_wait_ms=excluded.default_wait_ms,
    transfer_ids=excluded.transfer_ids, calc_allowed=excluded.calc_allowed,
    alt_text=excluded.alt_text, canonical_answer=excluded.canonical_answer
`;

export function upsertContentItem(c: ContentCard): void {
  getDb()
    .prepare(UPSERT_SQL)
    .run(
      c.id,
      c.spine,
      c.stem,
      c.stemLatex,
      c.objective,
      j(c.prerequisites),
      c.difficulty,
      j(c.allowedPaths),
      j(c.misconceptions),
      j(c.substantiveAttemptRules),
      j(c.ladder),
      c.defaultWaitMs,
      j(c.transferItemIds),
      c.calcAllowed ? 1 : 0,
      c.altText,
      c.canonicalAnswer,
    );
}

export function getContentItem(id: string): ContentCard | null {
  const row = getDb().prepare("SELECT * FROM content_items WHERE id = ?").get(id) as Row | undefined;
  return row ? rowToCard(row) : null;
}

export function listContentItems(): ContentCard[] {
  const rows = getDb().prepare("SELECT * FROM content_items ORDER BY id").all() as Row[];
  return rows.map(rowToCard);
}

export function countContentItems(): number {
  const r = getDb().prepare("SELECT COUNT(*) AS c FROM content_items").get() as Row;
  return Number(r.c);
}

export function createSession(id: string, studentId: string, itemId: string, startedAt: number): void {
  getDb()
    .prepare("INSERT OR IGNORE INTO sessions (id, student_id, item_id, started_at, status) VALUES (?,?,?,?, 'active')")
    .run(id, studentId, itemId, startedAt);
}

export function closeSession(id: string, status: "paused" | "closed"): void {
  getDb().prepare("UPDATE sessions SET status = ? WHERE id = ?").run(status, id);
}

export function appendEvent(e: SessionEvent): void {
  getDb()
    .prepare("INSERT INTO events (id, session_id, t, type, payload) VALUES (?,?,?,?,?)")
    .run(e.id, e.sessionId, e.t, e.type, j(e.payload));
}

export function listSessionEvents(sessionId: string): SessionEvent[] {
  const rows = getDb()
    .prepare("SELECT * FROM events WHERE session_id = ? ORDER BY t")
    .all(sessionId) as Row[];
  return rows.map((r) => ({
    id: String(r.id),
    sessionId: String(r.session_id),
    t: Number(r.t),
    type: r.type as SessionEvent["type"],
    payload: JSON.parse(String(r.payload)),
  })) as SessionEvent[];
}

export interface InterventionRecord {
  id: string;
  sessionId: string;
  t: number;
  level: number;
  intent: string;
  text: string;
  source: "authored" | "model";
  seen: number;
}

export function recordIntervention(i: InterventionRecord): void {
  getDb()
    .prepare(
      "INSERT INTO interventions (id, session_id, t, level, intent, text, source, seen) VALUES (?,?,?,?,?,?,?,?)",
    )
    .run(i.id, i.sessionId, i.t, i.level, i.intent, i.text, i.source, i.seen);
}

export function getSkill(studentId: string, skill: string): SkillWarmth | null {
  const row = getDb()
    .prepare("SELECT * FROM skills WHERE student_id = ? AND skill = ?")
    .get(studentId, skill) as Row | undefined;
  if (!row) return null;
  return {
    skill: String(row.skill),
    warmth: Number(row.warmth),
    nIndependent: Number(row.n_independent),
    nGuided: Number(row.n_guided),
    nIncomplete: Number(row.n_incomplete),
    lastUpdated: Number(row.last_updated),
  };
}

export function upsertSkill(studentId: string, s: Omit<SkillWarmth, "lastUpdated">, lastUpdated = Date.now()): void {
  getDb()
    .prepare(
      `INSERT INTO skills (id, student_id, skill, warmth, n_independent, n_guided, n_incomplete, last_updated)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         warmth=excluded.warmth, n_independent=excluded.n_independent,
         n_guided=excluded.n_guided, n_incomplete=excluded.n_incomplete,
         last_updated=excluded.last_updated`,
    )
    .run(
      `${studentId}|${s.skill}`,
      studentId,
      s.skill,
      s.warmth,
      s.nIndependent,
      s.nGuided,
      s.nIncomplete,
      lastUpdated,
    );
}