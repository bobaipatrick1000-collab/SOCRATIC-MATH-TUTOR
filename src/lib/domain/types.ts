export type Spine = "linear" | "inequalities" | "systems" | "quadratics" | "word-problems";

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type LadderLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface LadderStep {
  level: LadderLevel;
  /** Machine label, e.g. "distribution", "isolate-term". */
  intent: string;
  /** Authored fallback sentence. */
  text: string;
  /** Approved wording variants a model may be constrained to. */
  variants?: string[];
  /** Intervene only if lock released (always true in practice at level >= 1). */
  requiresSubstantiveAttempt?: boolean;
  source: "authored" | "model";
}

export interface ContentCard {
  id: string;
  spine: Spine;
  stem: string;
  stemLatex: string;
  objective: string;
  prerequisites: string[];
  difficulty: Difficulty;
  /** Named valid methods, e.g. "distribute-first", "collect-then-solve". */
  allowedPaths: string[];
  misconceptions: string[];
  /** Human-readable predicates for what counts as a substantive attempt. */
  substantiveAttemptRules: string[];
  ladder: LadderStep[];
  defaultWaitMs: number;
  transferItemIds: string[];
  calcAllowed: boolean;
  altText: string;
  /** Canonical answer (verified end-state) used by the done detector. */
  canonicalAnswer: string;
}

/** Tagged transformation of a line relative to its predecessor. */
export type MoveTag =
  | "distribute"
  | "combine"
  | "add-term-both-sides"
  | "subtract-term-both-sides"
  | "multiply-both-sides"
  | "divide-both-sides"
  | "expand"
  | "factor"
  | "isolate"
  | "substitute"
  | "rewrite"
  | "check-substitute"
  | "unknown";

export interface LinePayload {
  official: boolean;
  latex: string;
  astHash: string | null;
  moveTag: MoveTag | null;
  /** Equivalence of this line vs the previous committed official line. */
  eqPrev: "eq" | "err" | "neutral";
}

export type StudentState =
  | "none"
  | "progressing"
  | "circling"
  | "stuck"
  | "done"
  | "off-task";

export interface HintShownPayload {
  level: LadderLevel;
  intent: string;
  text: string;
  source: "authored" | "model";
  /** Derived from the attempt-lock at the moment it fired. */
  lockReleasedBy: "attempt" | "stuck-detector" | "explicit-stuck";
}

export type SessionEvent =
  | { id: string; sessionId: string; t: number; type: "line_commit"; payload: LinePayload }
  | { id: string; sessionId: string; t: number; type: "row_delete"; payload: { rowIndex: number } }
  | { id: string; sessionId: string; t: number; type: "parse_error"; payload: { raw: string } }
  | {
      id: string;
      sessionId: string;
      t: number;
      type: "state_change";
      payload: { from: StudentState; to: StudentState; reason: string };
    }
  | { id: string; sessionId: string; t: number; type: "stuck_detected"; payload: { reason: string } }
  | { id: string; sessionId: string; t: number; type: "plan_stated"; payload: { text: string } }
  | {
      id: string;
      sessionId: string;
      t: number;
      type: "hint_requested";
      payload: { lockReleasedBy: "attempt" | "stuck-detector" | "explicit-stuck" };
    }
  | { id: string; sessionId: string; t: number; type: "hint_shown"; payload: HintShownPayload }
  | {
      id: string;
      sessionId: string;
      t: number;
      type: "answer_committed";
      payload: { latex: string; correct: boolean; justified: boolean };
    }
  | { id: string; sessionId: string; t: number; type: "check_requested"; payload: { method: "substitute" | "inverse" | "estimate" } }
  | { id: string; sessionId: string; t: number; type: "done"; payload: { mode: "independent" | "guided" | "incomplete" } };

/** A session as replayed for diagnosis or evaluation. */
export interface Session {
  id: string;
  studentId: string;
  itemId: string;
  startedAt: number;
  status: "active" | "paused" | "closed";
  events: SessionEvent[];
}

export interface SkillWarmth {
  skill: string;
  warmth: number; // 0..1
  nIndependent: number;
  nGuided: number;
  nIncomplete: number;
  lastUpdated: number;
}

/**
 * Eval-harness transcript annotation. One turn per visible event.
 * `expect` is the gold label from a human-author; auto-scorers must reproduce it.
 */
export interface TranscriptTurn {
  t: number; // ms since session start
  actor: "student" | "tutor" | "system";
  kind: "line" | "hint" | "intervention" | "plan" | "answer" | "message" | "state";
  latex?: string;
  text?: string;
  level?: LadderLevel;
  state?: StudentState; // annotated student state at this turn
  expect?: "ok" | "leak" | "premature" | "late" | "wrong-level";
  note?: string;
}

export type TranscriptScenario = "clean" | "guided" | "leaky" | "overhelp" | "late" | "mixed";

export interface Transcript {
  id: string;
  scenario: TranscriptScenario;
  itemId: string;
  turns: TranscriptTurn[];
}