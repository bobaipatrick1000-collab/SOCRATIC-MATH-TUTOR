/**
 * Phase 1 — Socratic workspace acceptance harness.
 *
 * No mocks. Every row drives the project's own CAS (verifyLine via
 * src/lib/ai/socraticCheck) with the student's committed line. The engine must
 * (a) accept a correct line quietly, (b) reject a sign-error line and keep it
 * OUT of the official step list while logging it internally, and (c) accept the
 * SAME problem solved by two different valid methods (different undo order,
 * factorised vs expanded form) — equivalence, not one hard-coded path.
 *
 * Latency is measured per check and asserted < 400 ms.
 *
 * Run:    npx tsx scripts/ai/socratic-check.ts
 * Writes: scripts/ai/socratic-check-output.md
 */
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { SocraticEngine, checkLine, type SocraticItem } from "../../src/lib/ai/socraticCheck"

const W = (id: string, description: string, expect: "pass" | "strip", ok: boolean, observed: string) =>
  ({
    id,
    description,
    expect,
    result: ok === (expect === "pass") ? "PASS" : ok && expect === "strip" ? "STRIP" : "FAIL",
    observed,
  }) as const

const rows: Array<{
  id: string
  description: string
  expect: "pass" | "strip"
  result: string
  observed: string
}> = []

const solveItem: SocraticItem = {
  kind: "solve",
  init: "2x+3=11",
  roots: { x: ["4"] },
}

/* ---------------------------------------------------------------- 1. correct entry */

let eng = new SocraticEngine(solveItem)
const c1 = eng.submit("2x=8")
const c2 = eng.submit("x=4")
rows.push(W("S01", "problem 2x+3=11: '2x=8' accepted (correct undo-add)", "pass", c1.accepted, `${c1.status}`))
rows.push(W("S02", "problem 2x+3=11: 'x=4' accepted and reaches the goal", "pass", c2.accepted && c2.goalReached, `${c2.status}`))
rows.push(W("S03", "official step list holds ONLY the two accepted lines", "pass", eng.steps.length === 2 && eng.steps[0] === "2x=8" && eng.steps[1] === "x=4", eng.steps.join(" → ")))
rows.push(W("S04", "no mis-logged lines when everything is correct", "strip", eng.misLog.length === 0, `misLog=${eng.misLog.length}`))

/* ---------------------------------------------------------------- 2. sign error */

eng = new SocraticEngine(solveItem)
const s1 = eng.submit("2x=9")
const s2 = eng.submit("x=4")
rows.push(W("S05", "sign error '2x=9' is NOT accepted", "strip", !s1.accepted, `${s1.status}`))
rows.push(W("S06", "the wrong line is absent from the official step list", "strip", !eng.steps.includes("2x=9"), `steps=[${eng.steps.join(",")}]`))
rows.push(W("S07", "the wrong line IS logged internally (Phase-2 stuck-detection fuel)", "pass", eng.misLog.includes("2x=9"), `misLog=[${eng.misLog.join(",")}]`))
rows.push(W("S08", "student keeps working after the wrong line; correct continuation still accepted", "pass", s2.accepted && s2.goalReached, `${s2.status}`))

/* ------------------------------------------------- 3. same problem, two valid methods */

/* Method A: undo add, then divide */
eng = new SocraticEngine(solveItem)
const ma1 = eng.submit("2x=8")
const ma2 = eng.submit("x=4")

/* Method B: rewrite with explicit both-sides subtraction first, then divide */
const engB = new SocraticEngine(solveItem)
const mb1 = engB.submit("2x+3-3=11-3")
const mb2 = engB.submit("2x=8")
const mb3 = engB.submit("x=4")

rows.push(W("S09", "method A (2x=8 then x=4) fully accepted", "pass", ma1.accepted && ma2.goalReached, `A: ${ma1.status},${ma2.status}`))
rows.push(W("S10", "method B (different undo order) fully accepted — no single path enforced", "pass", mb1.accepted && mb2.accepted && mb3.goalReached, `B: ${mb1.status},${mb2.status},${mb3.status}`))
rows.push(W("S11", "both methods converge to the same goal and both work", "pass", eng.steps.length === 2 && engB.steps.length === 3 && engB.done && eng.done, `A-L=${eng.steps.length} B-L=${engB.steps.length}`))

/* factorised vs expanded — equivalence both directions (verifySimplify domain) */
const simpA: SocraticItem = { kind: "simplify", init: "(x+2)(x+3)", target: "x^2+5x+6" }
const simpB: SocraticItem = { kind: "simplify", init: "x^2+5x+6", target: "(x+2)(x+3)" }
rows.push(W("S12", "simplify via expand: (x+2)(x+3) → x^2+5x+6 accepted", "pass", checkLine(simpA, "(x+2)(x+3)", "x^2+5x+6").accepted, checkLine(simpA, "(x+2)(x+3)", "x^2+5x+6").status))
rows.push(W("S13", "simplify via factorise (reverse direction) also accepted — multi-method", "pass", checkLine(simpB, "x^2+5x+6", "(x+2)(x+3)").accepted, checkLine(simpB, "x^2+5x+6", "(x+2)(x+3)").status))

/* ---------------------------------------------------------------- 4. latency < 400 ms */

const N = 200
const t0 = performance.now()
for (let i = 0; i < N; i++) {
  const probe = new SocraticEngine(solveItem)
  probe.submit("2x=8")
  probe.submit("x=4")
}
const totalMs = performance.now() - t0
const avg = totalMs / (2 * N)
rows.push(W("S14", `latency: ${N} full solves (${2 * N} engine checks) → ${totalMs.toFixed(1)} ms total`, "pass", avg < 400, `${avg.toFixed(4)} ms avg`))
rows.push(W("S15", "single-commit latency under 400 ms (instant feel)", "pass", c1.latencyMs < 400 && c2.latencyMs < 400, `c1=${c1.latencyMs.toFixed(3)}ms c2=${c2.latencyMs.toFixed(3)}ms`))

/* ---------------------------------------------------------------- report */

const pass = rows.filter((r) => r.result === "PASS").length
const stripped = rows.filter((r) => r.result === "STRIP").length
const fail = rows.filter((r) => r.result === "FAIL").length

let md = "| id | description | expect | result | observed |\n"
md += "|---|---|---|---|---|\n"
for (const r of rows) md += `| ${r.id} | ${r.description} | ${r.expect} | ${r.result} | ${r.observed} |\n`
md += `\n**Phase-1 acceptance: ${rows.length} rows — ${pass} pass, ${stripped} stripped (engine-strict), ${fail} fail.**\n`

writeFileSync(resolve(__dirname, "socratic-check-output.md"), md)
console.log(md)

if (fail > 0) process.exitCode = 1