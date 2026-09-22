export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS content_items (
  id                TEXT PRIMARY KEY,
  spine             TEXT NOT NULL,
  stem              TEXT NOT NULL,
  stem_latex        TEXT NOT NULL,
  objective         TEXT NOT NULL,
  prerequisites     TEXT NOT NULL DEFAULT '[]',
  difficulty        INTEGER NOT NULL,
  allowed_paths     TEXT NOT NULL DEFAULT '[]',
  misconceptions    TEXT NOT NULL DEFAULT '[]',
  attempt_rules     TEXT NOT NULL DEFAULT '[]',
  ladder            TEXT NOT NULL,
  default_wait_ms   INTEGER NOT NULL,
  transfer_ids      TEXT NOT NULL DEFAULT '[]',
  calc_allowed      INTEGER NOT NULL DEFAULT 0,
  alt_text          TEXT NOT NULL DEFAULT '',
  canonical_answer  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  student_id  TEXT NOT NULL,
  item_id     TEXT NOT NULL,
  started_at  INTEGER NOT NULL,
  status      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES sessions(id),
  t           INTEGER NOT NULL,
  type        TEXT NOT NULL,
  payload     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, t);

CREATE TABLE IF NOT EXISTS interventions (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES sessions(id),
  t           INTEGER NOT NULL,
  level       INTEGER NOT NULL,
  intent      TEXT NOT NULL,
  text        TEXT NOT NULL,
  source      TEXT NOT NULL,
  seen        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_interventions_session ON interventions(session_id, t);

CREATE TABLE IF NOT EXISTS skills (
  id              TEXT PRIMARY KEY,
  student_id      TEXT NOT NULL,
  skill           TEXT NOT NULL,
  warmth          REAL NOT NULL DEFAULT 0,
  n_independent   INTEGER NOT NULL DEFAULT 0,
  n_guided        INTEGER NOT NULL DEFAULT 0,
  n_incomplete    INTEGER NOT NULL DEFAULT 0,
  last_updated    INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_student_skill ON skills(student_id, skill);

CREATE TABLE IF NOT EXISTS generated_lessons (
  topic_key     TEXT PRIMARY KEY,
  payload       TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  refreshed_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_generated_lessons_created ON generated_lessons(created_at);

CREATE TABLE IF NOT EXISTS topic_packs (
  topic_id      TEXT PRIMARY KEY,
  query         TEXT NOT NULL,
  pack_json     TEXT NOT NULL,
  source_hash   TEXT NOT NULL DEFAULT '',
  fallback      INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_topic_packs_updated ON topic_packs(updated_at);
`;