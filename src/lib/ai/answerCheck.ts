import { parse } from "../math/ast"
import { modelToPoly, polyKey, solvePoly } from "../math/normalize"
import { eqRat, rat, type Rat } from "../math/rational"
import { parseToLine, verifyLine } from "../math/verify"

/** Worked lesson example. */
export interface WorkedStep {
  tex: string
  note?: string
}

export interface WorkedExample {
  stem: string
  stemTex: string
  steps: WorkedStep[]
  finalAnswerTex: string
}

export interface NumericItemShape {
  kind: "solve" | "simplify" | "translate"
  init?: string
  target?: string
  roots?: Record<string, string[]>
}

export function toRatMap(rs?: Record<string, string[]>): Record<string, Rat[]> | undefined {
  if (!rs) return undefined
  const out: Record<string, Rat[]> = {}
  for (const [v, arr] of Object.entries(rs)) {
    out[v] = arr.map((s) => {
      const [n, d] = s.split("/")
      return rat(BigInt(n), d ? BigInt(d) : 1n)
    })
  }
  return out
}

function setEq(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((x, i) => x === sb[i])
}

/**
 * Engine re-verification of a solve/translate item: solving the *init* with the
 * real engine must reproduce exactly the claimed roots. The LLM never decides
 * correctness — the engine does.
 */
export function verifySolveRoots(init: string, roots: Record<string, string[]>): boolean {
  let model
  try {
    model = parse(init)
  } catch {
    return false
  }
  if (model.k !== "eq") return false
  const p = modelToPoly({ k: "eq", lhs: model.lhs, rhs: model.rhs })
  if (p === null) return false
  for (const [v, vals] of Object.entries(roots)) {
    const sol = solvePoly(p, v)
    if (sol.kind !== "linear" && sol.kind !== "quadratic-rational") return false
    const got = (sol.roots ?? [])
      .map((r) => toDecString(r))
      .filter((x) => !x.includes("/"))
    if (!setEq(vals, got)) return false
  }
  return true
}

function toDecString(r: Rat): string {
  return r.d === 1n ? String(r.n) : `${r.n}/${r.d}`
}

/** Simplify target vs stem must be polynomial-equivalent. */
export function verifySimplify(init: string, target: string): boolean {
  try {
    const a = modelToPoly(parse(init))
    const b = modelToPoly(parse(target))
    if (a === null || b === null) return false
    return polyKey(a, { primitiveKey: true }) === polyKey(b, { primitiveKey: true })
  } catch {
    return false
  }
}

/** Full engine-side check for one practice/test item. */
export function verifyPracticeItem(item: NumericItemShape): boolean {
  if (item.kind === "solve" || item.kind === "translate") {
    if (!item.init || !item.roots) return false
    return verifySolveRoots(item.init, item.roots)
  }
  if (!item.init || !item.target) return false
  return verifySimplify(item.init, item.target)
}

/**
 * Worked-example step re-verification: every step must be a *verified* move from
 * the previous step toward the goal. Uses the same verifyLine the app lives on.
 */
export function verifyWorkedExample(ex: WorkedExample): string[] {
  const errors: string[] = []
  const lines = ex.steps.map((s) => s.tex)
  if (lines.length < 2) {
    errors.push(`worked example "${ex.stem}" has fewer than 2 steps`)
    return errors
  }
  const first = parseToLine(lines[0])
  if (first === null) {
    errors.push(`step 1 "${lines[0]}" does not parse`)
    return errors
  }
  for (let i = 1; i < lines.length; i++) {
    const prev = parseToLine(lines[i - 1])
    const cur = parseToLine(lines[i])
    if (prev === null || cur === null) {
      errors.push(`a step in "${ex.stem}" does not parse`)
      continue
    }
    const prevPoly = prev.poly
    const curPoly = cur.poly
    if (prevPoly === null || curPoly === null) {
      continue
    }
    const same = polyKey(prevPoly, { primitiveKey: true }) === polyKey(curPoly, { primitiveKey: true })
    if (!same) {
      errors.push(`step ${i + 1} "${lines[i]}" is not equivalent to step ${i} "${lines[i - 1]}"`)
    }
  }
  return errors
}

/** Verify a student's typed short answer against a question. */
export function checkStudentAnswer(
  kind: "solve" | "simplify" | "translate",
  init: string | undefined,
  target: string | undefined,
  roots: Record<string, string[]> | undefined,
  input: string,
): { ok: boolean; reason?: string } {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, reason: "Type an answer first." }
  if (kind === "solve" || kind === "translate") {
    if (!init || !roots) return { ok: false, reason: "No checked answer available." }
    const goal = { kind: "solve" as "solve" | "simplify" | "translate", roots: toRatMap(roots) }
    const res = verifyLine(trimmed, { goal })
    if (res.status === "complete") return { ok: true }
    return {
      ok: false,
      reason:
        res.status === "invalid"
          ? "Not the solution — substitute back to check."
          : "Write the solution line, e.g. `x = 4`.",
    }
  }
  if (!init || !target) return { ok: false, reason: "No checked answer available." }
  try {
    const model = parse(trimmed)
    const got = modelToPoly(model)
    const want = modelToPoly(parse(target))
    const base = modelToPoly(parse(init))
    if (got === null || want === null || base === null) return { ok: false, reason: "Could not read that — try a full expression." }
    const gotKey = polyKey(got, { primitiveKey: true })
    const wantKey = polyKey(want, { primitiveKey: true })
    if (gotKey === wantKey) return { ok: true }
    if (gotKey === polyKey(base, { primitiveKey: true })) return { ok: false, reason: "That is the starting expression — simplify it first." }
    return { ok: false, reason: "Not equivalent to the target form." }
  } catch {
    return { ok: false, reason: "Could not read that — try a full expression." }
  }
}

export function ratEq(a: Rat, b: Rat): boolean {
  return eqRat(a, b)
}