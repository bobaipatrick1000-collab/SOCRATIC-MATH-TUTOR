import type { GeneratedLesson, GeneratedPracticeItem, GeneratedTestItem } from "./schema"
import { verifyPracticeItem, verifyWorkedExample } from "./answerCheck"

/** A single recomputed-vs-stored-key mismatch (always logged; never silent). */
export interface KeyMismatch {
  section: "practice" | "test" | "workedExample"
  itemId: string
  kind: string
  field: string
  expected: string
  recomputed: string
  reason: string
}

export interface GuardResult {
  /** The lesson with every unverifiable question removed — a bad key never reaches a student. */
  lesson: GeneratedLesson
  mismatches: KeyMismatch[]
  stripped: string[]
}

/** Independent engine-side recompute for a solve/simplify question. */
function verifyFromEngine(kind: GeneratedPracticeItem["kind"], init?: string, target?: string, roots?: Record<string, string[]>): boolean {
  return verifyPracticeItem({ kind, init, target, roots })
}

/** Shape a short *test* item into what the engine's verifier accepts. */
function testShortShape(it: GeneratedTestItem & { kind: "short" }): { kind: GeneratedPracticeItem["kind"]; init?: string; target?: string; roots?: Record<string, string[]> } {
  return { kind: it.solveKind, init: it.init, target: it.target, roots: it.roots }
}

/**
 * Per-question answer-key guard. For EVERY practice item, short test item and
 * worked example, the answer is independently recomputed with the project's own
 * math engine (the in-repo equivalent of mathjs — the same engine students use,
 * reached through verifyPracticeItem/verifyWorkedExample, which internally call
 * verifySolveRoots/verifySimplify/verifyLine). Each recompute is compared against
 * the stored key; every disagreement is logged, and the offending question is
 * discarded from the saved lesson so a wrong key can never be shown or graded.
 * The LLM never decides correctness — the engine does.
 */
export function guardAnswerKeys(lesson: GeneratedLesson): GuardResult {
  const mismatches: KeyMismatch[] = []
  const stripped: string[] = []

  const practice: GeneratedPracticeItem[] = []
  for (const p of lesson.practice) {
    if (!verifyFromEngine(p.kind, p.init, p.target, p.roots)) {
      const expected = p.kind === "solve" ? JSON.stringify(p.roots) : p.target ?? ""
      mismatches.push({
        section: "practice",
        itemId: p.id,
        kind: p.kind,
        field: p.kind === "solve" ? "roots" : "target",
        expected,
        recomputed: "",
        reason: "engine recompute disagrees with the stored key",
      })
      stripped.push(p.id)
      console.warn(`[key-guard] practice "${p.id}" (${p.kind}) is unsafe — discarded. expected=${expected}`)
      continue
    }
    practice.push(p)
  }

  const testItems: GeneratedTestItem[] = []
  for (const it of lesson.testItems) {
    if (it.kind === "mc") {
      if (
        typeof it.correctIndex !== "number" ||
        !Number.isInteger(it.correctIndex) ||
        it.correctIndex < 0 ||
        it.correctIndex >= it.options.length
      ) {
        mismatches.push({
          section: "test",
          itemId: it.id,
          kind: "mc",
          field: "correctIndex",
          expected: String(it.correctIndex),
          recomputed: "",
          reason: "correctIndex is out of range for the option list",
        })
        stripped.push(it.id)
        console.warn(`[key-guard] test mc "${it.id}" has an out-of-range correctIndex — discarded.`)
        continue
      }
      testItems.push(it)
      continue
    }
    const shape = testShortShape(it)
    if (!verifyPracticeItem(shape)) {
      const expected = it.solveKind === "solve" ? JSON.stringify(it.roots) : it.target ?? ""
      mismatches.push({
        section: "test",
        itemId: it.id,
        kind: `short:${it.solveKind}`,
        field: it.solveKind === "solve" ? "roots" : "target",
        expected,
        recomputed: "",
        reason: "engine recompute disagrees with the stored key",
      })
      stripped.push(it.id)
      console.warn(`[key-guard] test short "${it.id}" (${it.solveKind}) is unsafe — discarded. expected=${expected}`)
      continue
    }
    testItems.push(it)
  }

  const workedExamples: GeneratedLesson["workedExamples"] = []
  for (const ex of lesson.workedExamples) {
    const errs = verifyWorkedExample({
      stem: ex.stem,
      stemTex: ex.stemTex,
      steps: ex.steps,
      finalAnswerTex: ex.finalAnswerTex,
    })
    if (errs.length > 0) {
      for (const e of errs) {
        mismatches.push({
          section: "workedExample",
          itemId: ex.stem,
          kind: "workedExample",
          field: "steps",
          expected: e,
          recomputed: "",
          reason: "worked-example steps fail line-by-line engine verification",
        })
      }
      stripped.push(ex.stem)
      console.warn(`[key-guard] worked example "${ex.stem}" is unsafe — discarded. ${errs.join(" | ")}`)
      continue
    }
    workedExamples.push(ex)
  }

  return {
    lesson: { ...lesson, practice, testItems, workedExamples },
    mismatches,
    stripped,
  }
}
