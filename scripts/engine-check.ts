import { parse } from "../src/lib/math/ast"
import { toLatex } from "../src/lib/math/format"
import {
  modelToPoly,
  polyKey,
  solvePoly,
} from "../src/lib/math/normalize"
import { verifyLine, type ItemGoal } from "../src/lib/math/verify"
import { eqRat, rat } from "../src/lib/math/rational"
import { buildTwin } from "../src/lib/content/twin"
import { buildGoalFromTwin } from "../src/lib/tutor/policy"

let pass = 0
let fail = 0

function check(name: string, cond: boolean, detail = "") {
  if (cond) pass++
  else {
    fail++
    console.log(`FAIL ${name} ${detail}`)
  }
}

function pkey(src: string): string {
  return polyKey(modelToPoly(parse(src))!, { primitiveKey: true })
}

check("expand", pkey("2x+6") === pkey("2(x+3)"), pkey("2x+6"))
check("factor equal", pkey("x^2+5x+6") === pkey("(x+2)(x+3)"))
check("move terms", pkey("2x = 8") === pkey("2x+3 = 11"))
check("not equal", pkey("2x = 8") !== pkey("2x = 10"), "should differ")
check("neg spread", pkey("-(x-4)") === pkey("-x+4"), pkey("-(x-4)"))
check("fractions", pkey("x/2+1/3") === pkey("(3x+2)/6"))
check("squared", pkey("(x+3)^2") === pkey("x^2+6x+9"))
check("diff of squares", pkey("x^2-9") === pkey("(x-3)(x+3)"))

console.log("latex 2x+3=11:", toLatex(parse("2x+3=11")))
console.log("latex 1/2:", toLatex(parse("1/2")))
console.log("latex frac:", toLatex(parse("x/2+1/3")))
console.log("latex sqrt:", toLatex(parse("sqrt(x+2)")))
console.log("latex square:", toLatex(parse("(x+2)^2")))

const goal: ItemGoal = {
  kind: "solve",
  roots: { x: [rat(4)] },
}

const step = verifyLine("2x+3=11", { goal })
check("first line ok", step.status === "verified", step.status)
console.log("first:", step.status, step.moveTag)

const s2 = verifyLine("2x = 8", { goal, prev: step.line })
console.log("s2:", s2.status, s2.moveTag)
check("s2 verified", s2.status === "verified", s2.status)

const s3 = verifyLine("x = 4", { goal, prev: s2.line })
console.log("s3:", s3.status, s3.rootClaimed?.value)
check("s3 complete", s3.status === "complete" && s3.rootClaimed?.value.n === 4n)

const wrong = verifyLine("x = 5", { goal, prev: s2.line })
check("wrong root", wrong.status === "invalid", wrong.status)

const wrongMove = verifyLine("2x = 11 + 3", { goal, prev: step.line })
console.log("wrong move:", wrongMove.status, wrongMove.errorKey)
check("wrong move tagged", wrongMove.errorKey === "moved-term-sign", wrongMove.errorKey)

const dup = verifyLine("2x+3=11", { goal, prev: step.line })
check("duplicate", dup.status === "duplicate", dup.status)

const ex = verifyLine("2x+4=12", { goal })
const factorStep = verifyLine("2(x+2) = 12", { goal, prev: ex.line })
console.log("factor:", factorStep.status, factorStep.moveTag)
check("factor move", factorStep.status === "verified" && factorStep.moveTag === "factor", `${factorStep.status} ${factorStep.moveTag}`)

const scaled = verifyLine("4x+6 = 22", { goal, prev: step.line })
console.log("scaled:", scaled.status, scaled.moveTag)
check("rescale move", scaled.status === "verified" && scaled.moveTag === "mult-div-both-sides", `${scaled.status} ${scaled.moveTag}`)

const quadGoal: ItemGoal = {
  kind: "solve",
  roots: { x: [rat(-1), rat(-5)] },
}
const q1 = verifyLine("x^2+6x+5 = 0", { goal: quadGoal })
check("quad first", q1.status === "verified", q1.status)
const q2 = verifyLine("x+3 = 2", { goal: quadGoal, prev: q1.line })
console.log("q2 branch move:", q2.status, q2.moveTag)
check("q2 branch soft", q2.status === "note" || q2.status === "verified", q2.status)
const q3 = verifyLine("x = -1", { goal: quadGoal, prev: q2.line })
check("q3 root1", q3.status === "complete" && q3.rootClaimed?.value.n === -1n, q3.status)

const misc = verifyLine("2x+3", {})
console.log("misc unreadable?:", misc.status)

const bad = verifyLine("x+3=5=6", {})
console.log("bad:", bad.status)

const mis = verifyLine("(x+2)(x+3)", {})
console.log("paren only:", mis.status, mis.line.latex)

const parseErr = verifyLine("2x +", {})
console.log("trailing op:", parseErr.status)

const solve = solvePoly(modelToPoly(parse("2x+3=11"))!, "x")
console.log("solve lin:", solve.kind, solve.roots?.[0])
check("linear root 4", solve.kind === "linear" && eqRat(solve.roots![0], rat(4)))

const quadsol = solvePoly(modelToPoly(parse("x^2=9"))!, "x")
console.log("solve quad:", quadsol.kind, quadsol.roots)
check("quad roots", quadsol.kind === "quadratic-rational" && quadsol.roots!.length === 2)

const sq = verifyLine("(x+3)^2 = 4", { goal: quadGoal })
console.log("square both sides start:", sq.status, sq.line.latex)
const sq2 = verifyLine("x^2+6x+9 = 4", { goal: quadGoal, prev: sq.line })
console.log("expand square:", sq2.status, sq2.moveTag)
const sq3 = verifyLine("x^2+6x = -5", { goal: quadGoal, prev: sq2.line })
console.log("move const:", sq3.status, sq3.moveTag)

const sysGoal: ItemGoal = {
  kind: "solve",
  roots: { x: [rat(3)], y: [rat(1)] },
}
const sys = verifyLine("x+y=4", { goal: sysGoal })
const sys2 = verifyLine("x-y=2", { goal: sysGoal, prev: sys.line })
const sys3 = verifyLine("x = 3", { goal: sysGoal, prev: sys2.line })
console.log("system:", sys.status, sys2.status, sys3.status, sys3.rootClaimed)
check("system root x", sys3.status === "complete" && sys3.rootClaimed?.var === "x")

const transGoal: ItemGoal = {
  kind: "translate",
  translateEquation: parse("2x+3=11") as never,
  roots: { x: [rat(4)] },
}
const t1 = verifyLine("2x+3=11", { goal: transGoal })
check("translate first", t1.status === "verified", t1.status)
const t2 = verifyLine("x = 4", { goal: transGoal, prev: t1.line })
check("translate done", t2.status === "complete", t2.status)

for (const tpl of [
  "line-a",
  "line-bracket",
  "line-frac",
  "line-both",
  "line-neg",
  "translate-add",
  "translate-sub",
  "expand-binom",
  "expand-minus",
  "expand-dots",
  "factor-quad",
  "factor-dots",
  "quad-fact",
  "quad-square",
  "quad-bracket",
  "quad-complete",
  "quad-complete2",
  "system-lin",
]) {
  let generated = 0
  let valid = 0
  for (let seed = 1; seed <= 60; seed++) {
    const twin = buildTwin(tpl, seed, new Set())
    if (twin === null) continue
    generated++
    const goal = buildGoalFromTwin(twin)
    if (tpl === "system-lin") {
      const m = twin.stemTex?.match(/x \+ y = (-?\d+)  and  x - y = (-?\d+)/)
      if (!m) continue
      const S = Number(m[1])
      const D = Number(m[2])
      if ((S + D) % 2 !== 0 || (S - D) % 2 !== 0) continue
      const wantX = String((S + D) / 2)
      const wantY = String((S - D) / 2)
      const roots = goal.roots ?? {}
      if (roots.x?.[0] === undefined || roots.y?.[0] === undefined) continue
      if (String(roots.x[0].n) === wantX && String(roots.y[0].n) === wantY) valid++
      else console.log(`TWIN-MISMATCH ${tpl} seed=${seed} want=(${wantX},${wantY}) got=(${roots.x[0].n},${roots.y[0].n})`)
      continue
    }
    if (goal.kind === "solve" || goal.kind === "translate") {
      const roots = goal.roots ?? {}
      if (twin.init === undefined) continue
      try {
        const m = parse(twin.init)
        if (m.k !== "eq") continue
        const p = modelToPoly({ k: "eq", lhs: m.lhs, rhs: m.rhs })
        if (p === null) continue
        const sol = solvePoly(p, Object.keys(roots)[0] ?? "x")
        const want = (roots[Object.keys(roots)[0] ?? "x"] ?? []).map((r) => String(r.n))
        const got = sol.roots?.map((r) => String(r.n)) ?? []
        const eq = want.length === got.length && want.every((w) => got.includes(w))
        if (eq) valid++
        else {
          console.log(`TWIN-MISMATCH ${tpl} seed=${seed} want=${want} got=${got} ${twin.init}`)
        }
      } catch {
        console.log(`TWIN-PARSE-ERR ${tpl} seed=${seed} ${twin.init}`)
      }
    } else {
      // simplify: the start and target must evaluate to the same polynomial
      const base = twin.stemTex
      const tgt = twin.target
      if (base === undefined || tgt === undefined) continue
      try {
        const a = modelToPoly(parse(base.replace(/\s/g, "")))
        const b = modelToPoly(parse(tgt.replace(/\s/g, "")))
        if (a === null || b === null) continue
        if (polyKey(a, { primitiveKey: true }) === polyKey(b, { primitiveKey: true })) valid++
        else console.log(`TWIN-EQ-MISMATCH ${tpl} seed=${seed} ${base} != ${tgt}`)
      } catch {
        console.log(`TWIN-TARGET-ERR ${tpl} seed=${seed} ${base} ${tgt}`)
      }
    }
  }
  check(`twin ${tpl} all valid`, generated > 0 && valid === generated, `generated=${generated} valid=${valid}`)
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)