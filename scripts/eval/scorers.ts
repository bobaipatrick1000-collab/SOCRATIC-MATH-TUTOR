import type { Transcript, TranscriptTurn } from "../../src/lib/domain/types";
import { looksLikeLeak } from "../../src/lib/engine/guard";

export interface TurnAutoFlags {
  leak?: string;
  premature?: string;
  late?: string;
  wrongLevel?: string;
}

export interface Mismatch {
  turnIndex: number;
  expected: string | undefined;
  flags: string[];
  detail: string;
}

export interface TranscriptReport {
  id: string;
  scenario: string;
  auto: TurnAutoFlags[];
  mismatches: Mismatch[];
  leaksDetected: number;
  prematureDetected: number;
  lateDetected: number;
  wrongLevelDetected: number;
  pass: boolean;
}

const START_SIGNAL_RE = /\bdon'?t\s+(?:even\s+)?know\s+how\s+to\s+start\b/i;
const FIRST_MOVE_TOO_HIGH_RE =
  /^(?:full\s+solution|the\s+answer|here'?s\s+(?:the\s+)?(?:full|everything|the\s+whole)|let\s+me\s+solve|just\s+(?:do|write|fill))\b/i;

interface WalkState {
  studentState: "none" | "progressing" | "circling" | "stuck" | "done" | "off-task";
  lastStudentLineT: number | null;
  stuckOnsetT: number | null;
  planSeen: boolean;
  startSignalSeen: boolean;
  hintRequested: boolean;
  tutorTexts: string[];
  tutorHintCount: number;
  firstTutorIdx: number | null;
}

const LATE_WINDOW_MS = 30000;

export function autodetect(turns: TranscriptTurn[]): TurnAutoFlags[] {
  const flags: TurnAutoFlags[] = turns.map(() => ({}));

  const w: WalkState = {
    studentState: "none",
    lastStudentLineT: null,
    stuckOnsetT: null,
    planSeen: false,
    startSignalSeen: false,
    hintRequested: false,
    tutorTexts: [],
    tutorHintCount: 0,
    firstTutorIdx: null,
  };

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    const f = flags[i];

    if (turn.actor === "tutor" && w.firstTutorIdx === null) {
      w.firstTutorIdx = i;
    }

    // Capture student state announcements (state turns or state-tagged lines).
    if (turn.state && turn.state !== w.studentState) {
      if (turn.state === "stuck" && w.stuckOnsetT === null) w.stuckOnsetT = turn.t;
      if (turn.state !== "stuck") w.stuckOnsetT = null;
      w.studentState = turn.state;
    }

    if (turn.actor === "student") {
      // A line (or plan) written while the student was already flagged stuck
      // and we stayed silent for the window = missed (late) intervention.
      if (w.studentState === "stuck" && w.stuckOnsetT !== null) {
        if (turn.t - w.stuckOnsetT >= LATE_WINDOW_MS) {
          f.late = `no intervention within ${LATE_WINDOW_MS}ms of stuck onset`;
          w.stuckOnsetT = null;
        }
      }
      if (turn.kind === "plan") w.planSeen = true;
      if (turn.text && START_SIGNAL_RE.test(turn.text)) w.startSignalSeen = true;
      if (turn.kind === "line") w.lastStudentLineT = turn.t;
    }

    if (turn.actor === "tutor") {
      const reason =
        turn.level !== undefined
          ? `level ${turn.level}`
          : turn.text
            ? `"${turn.text.slice(0, 48)}${turn.text.length > 48 ? "…" : ""}"`
            : "message";

      // Lateness resolved: an intervention arrived.
      if (w.stuckOnsetT !== null) w.stuckOnsetT = null;

      // 1) Premature: broke silence while the student was progressing,
      //    or jumped in before any attempt at all.
      if (w.studentState === "progressing") {
        f.premature = `intervened while progressing (${reason})`;
      } else if (w.studentState === "none" && turn.kind !== "message") {
        const released = w.planSeen || w.startSignalSeen || w.hintRequested;
        if (!released) {
          f.premature = `hint before any substantive attempt (${reason})`;
        }
      }

      // 2) Leak detection on all outbound tutor text.
      if (turn.text) {
        const verdict = looksLikeLeak(turn.text);
        if (verdict.leak && verdict.reason) f.leak = verdict.reason;
      }

      // 3) Ladder / wrong-level checks.
      if (turn.level !== undefined) {
        if (turn.level < 1 || turn.level > 6) {
          f.wrongLevel = `level ${turn.level} out of 1..6`;
        }
        if (i === w.firstTutorIdx && turn.level >= 5) {
          f.wrongLevel = `hint level ${turn.level} as first move (forbidden)`;
        }
        if (turn.level === 6 && w.tutorHintCount < 2) {
          f.wrongLevel = "level 6 without at least two lower-ladder hints";
        }
        if (turn.text) {
          const norm = turn.text.toLowerCase().trim();
          if (w.tutorTexts.length > 0 && w.tutorTexts[w.tutorTexts.length - 1] === norm) {
            f.wrongLevel = "immediate repetition of the same hint text";
          }
          w.tutorTexts.push(norm);
        }
        w.tutorHintCount += 1;
      } else if (turn.text && i === w.firstTutorIdx) {
        if (FIRST_MOVE_TOO_HIGH_RE.test(turn.text.trim())) {
          f.wrongLevel =
            "full-solution-style first move (violates attempt lock / ladder)";
        }
      }
    }
  }

  return flags;
}

export function scoreTranscript(t: Transcript): TranscriptReport {
  const auto = autodetect(t.turns);
  const mismatches: Mismatch[] = [];

  for (let i = 0; i < t.turns.length; i++) {
    const turn = t.turns[i];
    const f = auto[i];
    const flagKeys = (Object.keys(f) as Array<keyof TurnAutoFlags>).filter(
      (k) => f[k] !== undefined,
    );
    const flags = flagKeys.map((k) => `${k}: ${f[k]}`);
    const expected = turn.expect;

    if (expected === "ok" && flagKeys.length > 0) {
      mismatches.push({
        turnIndex: i,
        expected,
        flags,
        detail: "annotated as ok but auto-detector fired",
      });
    } else if (expected && expected !== "ok") {
      const expectedKey = (expected === "wrong-level" ? "wrongLevel" : expected) as keyof TurnAutoFlags;
      if (!flagKeys.includes(expectedKey)) {
        mismatches.push({
          turnIndex: i,
          expected,
          flags,
          detail: `annotated as ${expected} but no ${expected} flag auto-detected`,
        });
      }
    }
  }

  const leaksDetected = auto.filter((f) => f.leak).length;
  const prematureDetected = auto.filter((f) => f.premature).length;
  const lateDetected = auto.filter((f) => f.late).length;
  const wrongLevelDetected = auto.filter((f) => f.wrongLevel).length;
  const anyFlags = auto.filter((f) => Object.keys(f).length > 0).length;

  // Scenario semantics:
  //  - clean / guided  -> quiescence expected (no flags at all)
  //  - leaky           -> the leak detector must fire
  //  - overhelp        -> premature or wrong-level detector must fire
  //  - late            -> lateness detector must fire
  //  - mixed           -> annotations must be consistent (no mismatches)
  let pass = mismatches.length === 0;
  if (t.scenario === "clean" || t.scenario === "guided") {
    pass = pass && anyFlags === 0;
  } else if (t.scenario === "leaky") {
    pass = pass && leaksDetected > 0;
  } else if (t.scenario === "overhelp") {
    pass = pass && (prematureDetected > 0 || wrongLevelDetected > 0);
  } else if (t.scenario === "late") {
    pass = pass && lateDetected > 0;
  }

  return {
    id: t.id,
    scenario: t.scenario,
    auto,
    mismatches,
    leaksDetected,
    prematureDetected,
    lateDetected,
    wrongLevelDetected,
    pass,
  };
}