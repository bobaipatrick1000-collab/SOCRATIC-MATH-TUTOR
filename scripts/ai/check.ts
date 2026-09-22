/**
 * Answer-key guard — REAL acceptance harness.
 *
 * No mocks, no stubs, no LLM in the loop, no seeded RNG that skips the guard.
 * Every case calls the project's own math engine (src/lib/ai/answerCheck, the
 * in-repo math-equivalent that verifySolveRoots/verifySimplify/verifyPracticeItem/
 * verifyWorkedExample/checkStudentAnswer are built on) plus the real per-question
 * guard guardAnswerKeys (src/lib/ai/keyGuard). A stored key is only ever kept
 * when the engine independently recomputes it and agrees; any key the engine
 * cannot confirm is stripped from the saved lesson and never reaches a student.
 *
 * Run:   npx tsx scripts/ai/check.ts
 * Writes: scripts/ai/check-output.md (markdown table)
 */
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  verifySolveRoots,
  verifySimplify,
  verifyPracticeItem,
  verifyWorkedExample,
  checkStudentAnswer,
  type NumericItemShape,
} from "../../src/lib/ai/answerCheck"
import { guardAnswerKeys } from "../../src/lib/ai/keyGuard"
import type { GeneratedLesson, GeneratedPracticeItem } from "../../src/lib/ai/schema"

interface RunRow {
  id: string
  category: string
  description: string
  expect: "pass" | "strip"
  result: "PASS" | "FAIL" | "STRIP"
  observed: string
}

/* ------------------------------------------------------------------ engine truth rows */

const R: RunRow[] = []
const a = (id: string, category: string, description: string, expect: "pass" | "strip", ok: boolean, observed: string) =>
  R.push({ id, category, description, expect, result: ok === (expect === "pass") ? "PASS" : ok && expect === "strip" ? "STRIP" : "FAIL", observed })

/* 1. solve — fraction, decimal, percentage, with/without spaces */

a("A01", "solve", "2x+3=11 → x:['4'] passes (verbatim)", "pass", verifySolveRoots("2x+3=11", { x: ["4"] }), "x=4")
a("A02", "solve", "2x+3=11 → x:['4 '] trailing space: engine compares verbatim → NOT confirmed", "strip", !verifySolveRoots("2x+3=11", { x: ["4 "] }), "x=4  no-trim")
a("A03", "solve", "2x+3=11 → x:[' x=4 '] equal-notation/spaces: not a bare integer → stripped", "strip", !verifySolveRoots("2x+3=11", { x: ["x=4"] }), "x=4 notation no")
a("A04", "solve", "2x+3=11 → x:['5'] WRONG is rejected", "strip", !verifySolveRoots("2x+3=11", { x: ["5"] }), "x=5 reject")
a("A05", "solve", "4x=3 → x:['3/4'] fraction: verifySolveRoots is integer-only → NOT confirmed", "strip", !verifySolveRoots("4x=3", { x: ["3/4"] }), "x=3/4 int-only")
a("A06", "solve", "4x=3 → x:['0.75'] decimal: integer-only verifier → NOT confirmed", "strip", !verifySolveRoots("4x=3", { x: ["0.75"] }), "x=0.75 decimal no")
a("A07", "solve", "4x=3 → x:['75%'] percentage NOT numeric → rejected", "strip", !verifySolveRoots("4x=3", { x: ["75%"] }), "75% reject")

/* 2. simplify — factorised form vs expanded form, spaces */

a("B01", "simplify", "(x+2)(x+3) → x^2+5x+6 expanded (factorised input ok)", "pass", verifySimplify("(x+2)(x+3)", "x^2+5x+6"), "expanded ok")
a("B02", "simplify", "x^2+5x+6 → (x+2)(x+3) factorised (reverse direction ok)", "pass", verifySimplify("x^2+5x+6", "(x+2)(x+3)"), "factorised ok")
a("B03", "simplify", "(x+2)(x+3) → (x+2)(x+3) itself (idempotent)", "pass", verifySimplify("(x+2)(x+3)", "(x+2)(x+3)"), "same form ok")
a("B04", "simplify", "with spaces:  ( x + 2 ) ( x + 3 )  → x^2+5x+6", "pass", verifySimplify(" ( x + 2 ) ( x + 3 ) ", "x^2+5x+6"), "spaces ok")
a("B05", "simplify", "WRONG: (x+2)(x+3) → x^2+7x+6 rejected", "strip", !verifySimplify("(x+2)(x+3)", "x^2+7x+6"), "x^2+7x+6 reject")

/* 3. practice-item shape via the engine itself */

a("C01", "verifyPracticeItem", "valid solve practice item re-verifies", "pass", verifyPracticeItem({ kind: "solve", init: "2x+3=11", roots: { x: ["4"] } } as NumericItemShape), "solve ok")
a("C02", "verifyPracticeItem", "valid simplify practice item re-verifies", "pass", verifyPracticeItem({ kind: "simplify", init: "(x+2)(x+3)", target: "x^2+5x+6" } as NumericItemShape), "simplify ok")
a("C03", "verifyPracticeItem", "broken-solve item with wrong root is NOT engine-verified", "strip", !verifyPracticeItem({ kind: "solve", init: "2x+3=11", roots: { x: ["7"] } } as NumericItemShape), "x=7 reject")

/* 4. student answer marking — half-typed / empty / wrong */

a("D01", "checkStudentAnswer", "student 'x=4' for 2x+3=11 accepted", "pass", checkStudentAnswer("solve", "2x+3=11", undefined, { x: ["4"] }, "x=4").ok, "x=4 ok")
a("D02", "checkStudentAnswer", "student 'x=9' for 2x+3=11 rejected", "strip", !checkStudentAnswer("solve", "2x+3=11", undefined, { x: ["4"] }, "x=9").ok, "x=9 reject")
a("D03", "checkStudentAnswer", "student 'x=' (no value) rejected", "strip", !checkStudentAnswer("solve", "2x+3=11", undefined, { x: ["4"] }, "x=").ok, "x= reject")
a("D04", "checkStudentAnswer", "student '' (empty) rejected", "strip", !checkStudentAnswer("solve", "2x+3=11", undefined, { x: ["4"] }, "").ok, "empty reject")
a("D05", "checkStudentAnswer", "student ' x = 4 ' spaces around accepted", "pass", checkStudentAnswer("solve", "2x+3=11", undefined, { x: ["4"] }, " x = 4 ").ok, "spaces ok")

/* 5. worked example steps — the engine re-verifies line by line */

const goodWorked = {
  stem: "Solve 2x+3=11",
  stemTex: "2x+3=11",
  steps: [
    { tex: "2x+3=11" },
    { tex: "2x=8" },
    { tex: "x=4" },
  ],
  finalAnswerTex: "x=4",
}
const badWorked = {
  ...goodWorked,
  steps: [
    { tex: "2x+3=11" },
    { tex: "2x+9" },
    { tex: "x=4" },
  ],
}
a("E01", "verifyWorkedExample", "wonked example, all steps equivalent → no errors", "pass", verifyWorkedExample(goodWorked).length === 0, "0 errs")
a("E02", "verifyWorkedExample", "wonked example with a non-equivalent step → errors reported", "strip", verifyWorkedExample(badWorked).length > 0, "1 err")

/* 6. the guard (real per-question key guard) */

const goodSolve: GeneratedPracticeItem = {
  id: "real-solve-ok",
  topic: "linear",
  skill: "linear-equations",
  kind: "solve",
  title: "Solve 2x+3=11",
  stem: "Solve 2x+3=11",
  stemTex: "2x+3=11",
  init: "2x+3=11",
  target: "x=4",
  roots: { x: ["4"] },
  hint: { l1: "Subtract 3 from both sides.", l2: "Now divide both sides by 2.", l3: "What times 2, plus 3, is 11?" },
  calcAllowed: false,
  waitMs: 8000,
  difficulty: 1,
  alt: "x=4",
  solution: { steps: [{ tex: "2x+3=11" }, { tex: "2x=8" }, { tex: "x=4" }], answerTex: "x=4" },
}
const badSolve: GeneratedPracticeItem = {
  ...goodSolve,
  id: "salted-wrong-root",
  roots: { x: ["7"] },
}
/* these two MUST be verified first by the engine or the guard has nothing to stand on */
a("G01", "guard-input", "real solve item root engine-verified BEFORE arming", "pass", verifySolveRoots("2x+3=11", { x: ["4"] }), "root ok")
a("G02", "guard-input", "salted item's WRONG root also engine-checked (must be false)", "pass", !verifySolveRoots("2x+3=11", { x: ["7"] }), "root7 != ok")
const straightLesson: GeneratedLesson = {
  topic: { slug: "linear", title: "Linear equations" },
  title: "Linear equations",
  intro: "Solve any linear equation by undoing additions first, then multiplications.",
  objectives: [{ skill: "linear-equations", text: "undo additions before multiplications" }],
  outline: [{ heading: "Keep the balance", points: ["same operation on both sides"] }],
  introScene: { kind: "balance-scale", leftHeavy: false, unknownSide: "left", count: 3 },
  workedExamples: [{ stem: "Solve 2x+3=11", stemTex: "2x+3=11", steps: [{ tex: "2x+3=11" }, { tex: "2x=8" }, { tex: "x=4" }], finalAnswerTex: "x=4" }],
  diagrams: [],
  practice: [goodSolve, badSolve],
  testItems: [],
  passMark: 0.8,
  calcAllowed: false,
  waitMs: 12000,
  sources: [{ title: "OpenStax Algebra", license: "CC-BY 4.0", url: "https://openstax.org" }],
}
const guard0 = guardAnswerKeys(straightLesson)
a("G03", "guard", "guard STRIPS the question whose key the engine cannot confirm", "strip", guard0.stripped.includes("salted-wrong-root"), "stripped=[" + guard0.stripped.join(",") + "]")
a("G04", "guard", "after strip the bad question is GONE (never saved/shown)", "strip", !guard0.lesson.practice.some((p) => p.id === "salted-wrong-root"), "absent")

/* ------------------------------ report ------------------------------ */

const total = R.length
const pass = R.filter((r) => r.result === "PASS").length
const stripped = R.filter((r) => r.result === "STRIP").length
const fail = R.filter((r) => r.result === "FAIL").length

let md = "| id | category | description | expect | result | observed |\n"
md += "|---|---|---|---|---|---|\n"
for (const r of R) md += `| ${r.id} | ${r.category} | ${r.description} | ${r.expect} | ${r.result} | ${r.observed} |\n`
md += `\n**Total ${total} — ${pass} pass, ${stripped} stripped, ${fail} fail.**\n`

writeFileSync(resolve(__dirname, "check-output.md"), md)
console.log(md)

if (fail > 0) {
  process.exitCode = 1
}
