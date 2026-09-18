import { parse, type Expr, type Model } from "./ast"
import { toLatex } from "./format"
import {
  complexity,
  eqPoly,
  modelToPoly,
  polyKey,
  sampleKey,
  sub as polySub,
  toPoly,
  makeCtx,
  scalePoly,
  type Poly,
} from "./normalize"
import { div, eqRat, isZero, rat, type Rat } from "./rational"

export type LineStatus = "verified" | "complete" | "unreadable" | "invalid" | "note" | "duplicate"

export type MoveTag =
  | "expand"
  | "factor"
  | "combine"
  | "move-term"
  | "add-sub-both-sides"
  | "mult-div-both-sides"
  | "square-both-sides"
  | "square-root-both-sides"
  | "rewrite"

export type MisKey =
  | "moved-term-sign"
  | "minus-distribution"
  | "binomial-sign"
  | "expansion-error"
  | "divide-by-zero"
  | "translate-error"
  | "sign-error"
  | "value-not-simpler"

export interface ParsedLine {
  source: string
  model: Model
  latex: string
  kind: "eq" | "expr"
  poly: Poly | null
  canonicalKey: string
  score: number
}

export interface ItemGoal {
  kind: "solve" | "simplify" | "translate"
  roots?: Record<string, Rat[]>
  target?: Model
  translateEquation?: Model
}

export function parseToLine(source: string): ParsedLine | null {
  try {
    const model = parse(source)
    return {
      source,
      model,
      latex: toLatex(model),
      kind: model.k === "eq" ? "eq" : "expr",
      poly: modelToPoly(model),
      canonicalKey: modelToPoly(model)
        ? polyKey(modelToPoly(model)!, { primitiveKey: true })
        : sampleKey(model) ?? "",
      score: modelToPoly(model) ? complexity(modelToPoly(model)!) : -1,
    }
  } catch {
    return null
  }
}

export interface VerifyResult {
  status: LineStatus
  line: ParsedLine
  moveTag?: MoveTag
  errorKey?: MisKey
  rootClaimed?: { var: string; value: Rat }
  note?: string
  lowConfidence?: boolean
}

export interface VerifyCtx {
  prev?: ParsedLine
  goal?: ItemGoal
}

export function hasSymbolRef(e: Expr): boolean {
  switch (e.k) {
    case "num":
      return false
    case "sym":
      return true
    case "add":
      return e.terms.some(hasSymbolRef)
    case "mul":
      return e.factors.some(hasSymbolRef)
    case "div":
      return hasSymbolRef(e.num) || hasSymbolRef(e.den)
    case "pow":
      return hasSymbolRef(e.base) || hasSymbolRef(e.exp)
    case "neg":
      return hasSymbolRef(e.e)
    case "call":
      return e.args.some(hasSymbolRef)
  }
}

export function verifyLine(source: string, ctx: VerifyCtx): VerifyResult {
  const line = parseToLine(source)
  if (line === null) {
    return {
      status: "unreadable",
      line: {
        source,
        model: { k: "expr", expr: { k: "num", v: { n: 0n, d: 1n } } },
        latex: "",
        kind: "expr",
        poly: null,
        canonicalKey: "",
        score: -1,
      },
    }
  }
  const goal = ctx.goal

  if (goal?.kind === "translate") {
    const first = ctx.prev === undefined
    if (first) {
      if (goal.translateEquation) {
        const gPoly = modelToPoly(goal.translateEquation)
        const sPoly = modelToPoly(line.model)
        const same =
          gPoly !== null && sPoly !== null
            ? eqPoly(gPoly, sPoly)
            : sampleKey(goal.translateEquation) === sampleKey(line.model)
        return same
          ? { status: "verified", line, moveTag: "rewrite" }
          : { status: "invalid", line, errorKey: "translate-error" }
      }
    }
  }

  const root = detectTerminalRoot(line, goal)
  if (goal?.kind === "solve" || (goal?.kind === "translate" && ctx.prev !== undefined)) {
    if (root) {
      const accepted = goal.roots?.[root.var]?.some((r) => eqRat(r, root.value)) ?? false
      if (accepted) return { status: "complete", line, rootClaimed: root }
      return { status: "invalid", line, errorKey: "sign-error", note: "Check by substituting back." }
    }
  }

  if (goal?.kind === "simplify" && goal.target) {
    const gPoly = goal.target ? modelToPoly(goal.target) : null
    const sPoly = line.poly
    const same =
      gPoly !== null && sPoly !== null ? eqPoly(gPoly, sPoly) : sampleKey(goal.target) === line.canonicalKey
    if (same) return { status: "complete", line }
  }

  if (!ctx.prev) {
    return { status: "verified", line, moveTag: "rewrite" }
  }

  const changed = !astSame(asExpr(ctx.prev.model), asExpr(line.model))
  const equiv = equivalent(ctx.prev, line)

  if (!changed) {
    return { status: "duplicate", line }
  }

  if (equiv) {
    const tag = detectMoveTag(ctx.prev, line)
    if (goal?.kind === "simplify" && ctx.prev.score >= 0 && line.score >= 0) {
      if (line.score < ctx.prev.score) return { status: "verified", line, moveTag: tag }
      return { status: "note", line, moveTag: tag, errorKey: "value-not-simpler" }
    }
    return { status: "verified", line, moveTag: tag }
  }

  if (goal?.kind === "simplify" || goal?.kind === "translate") {
    const err = classifyError(ctx.prev, line)
    return { status: "invalid", line, errorKey: err.key, note: err.note }
  }

  const err = classifyError(ctx.prev, line)
  if (err.isStructural) {
    return { status: "invalid", line, errorKey: err.key, note: err.note }
  }
  return { status: "note", line, moveTag: "rewrite", note: "Still a valid move to explore — watch the next line." }
}

function equivalent(a: ParsedLine, b: ParsedLine): boolean {
  if (a.poly !== null && b.poly !== null) return eqPoly(a.poly, b.poly)
  if (a.poly !== null || b.poly !== null) return false
  return (
    a.canonicalKey === b.canonicalKey && a.canonicalKey !== null && b.canonicalKey !== null
  )
}

interface ErrorVerdict {
  key: MisKey
  note?: string
  isStructural: boolean
}

function classifyError(prev: ParsedLine, cur: ParsedLine): ErrorVerdict {
  const d = detectDivideByZero(cur)
  if (d) return { key: "divide-by-zero", note: "Dividing by an expression that can be zero can lose or invent solutions.", isStructural: false }

  const move = detectStructuralIntent(prev, cur)
  if (move === "expand" || move === "factor") {
    const binom = binomialSquareError(prev, cur)
    if (binom) return { key: binom, isStructural: true }
    return { key: "expansion-error", isStructural: true }
  }

  const sign = singleSignMistake(prev, cur)
  if (sign) return { key: sign, isStructural: true }

  const minus = minusDistributionError(prev, cur)
  if (minus) return { key: "minus-distribution", isStructural: true }

  return { key: "sign-error", isStructural: false }
}

function detectStructuralIntent(prev: ParsedLine, cur: ParsedLine): "expand" | "factor" | null {
  const p = prev.model
  const c = cur.model
  if (p.k !== c.k) return null
  if (containsProductOfSums(asExpr(p)) && !containsProductOfSums(asExpr(c))) return "expand"
  if (!containsProductOfSums(asExpr(p)) && containsProductOfSums(asExpr(c))) return "factor"
  return null
}

function asExpr(m: Model): Expr {
  return m.k === "eq" ? { k: "add", terms: [m.lhs, { k: "neg", e: m.rhs }] } : m.expr
}

function containsProductOfSums(e: Expr): boolean {
  switch (e.k) {
    case "num":
    case "sym":
      return false
    case "add":
      return e.terms.some(containsProductOfSums)
    case "mul":
      if (e.factors.some((f) => f.k === "add")) return true
      return e.factors.some(containsProductOfSums)
    case "div":
      return containsProductOfSums(e.num) || containsProductOfSums(e.den)
    case "pow":
      if (e.base.k === "add" && e.exp.k === "num" && e.exp.v.d === 1n) return true
      return containsProductOfSums(e.base)
    case "neg":
      return containsProductOfSums(e.e)
    case "call":
      return e.args.some(containsProductOfSums)
  }
}

function binomialSquareError(prev: ParsedLine, cur: ParsedLine): "binomial-sign" | "expansion-error" | null {
  const inner = findBinomialSquare(prev.model)
  if (inner === null) return null
  const ctx = makeCtx(prev.model)
  const correct = mulSquarePoly(inner, ctx) ?? { syms: ctx.syms, index: ctx.index, terms: new Map() }
  const got = cur.poly
  if (got === null) return "expansion-error"
  if (eqPoly(correct, got)) return null
  const e = polySub(got, correct)
  if (e.terms.size <= 2) return "binomial-sign"
  return "expansion-error"
}

function findBinomialSquare(model: Model): Expr | null {
  return scanBin(model.k === "eq" ? model.lhs : model.expr) ?? scanBin(model.k === "eq" ? model.rhs : null)
}

function scanBin(e: Expr | null): Expr | null {
  if (e === null) return null
  if (e.k === "pow" && e.base.k === "add" && e.exp.k === "num" && e.exp.v.n === 2n && e.exp.v.d === 1n)
    return e.base
  switch (e.k) {
    case "add":
      for (const t of e.terms) {
        const r = scanBin(t)
        if (r) return r
      }
      return null
    case "mul":
      for (const f of e.factors) {
        const r = scanBin(f)
        if (r) return r
      }
      return null
    case "neg":
      return scanBin(e.e)
    case "call":
      for (const a of e.args) {
        const r = scanBin(a)
        if (r) return r
      }
      return null
    case "div":
      return scanBin(e.num) ?? scanBin(e.den)
    default:
      return null
  }
}

function mulSquarePoly(inner: Expr, ctx: { syms: string[]; index: Map<string, number> }): Poly | null {
  const par = toPoly({ k: "pow", base: inner, exp: { k: "num", v: rat(2) } }, ctx)
  return par
}

function singleSignMistake(prev: ParsedLine, cur: ParsedLine): "moved-term-sign" | "sign-error" | null {
  if (prev.poly === null || cur.poly === null) return null
  const err = polySub(cur.poly, prev.poly)
  if (err.terms.size === 1) {
    const [k, v] = [...err.terms.entries()][0]
    const pv = prev.poly.terms.get(k)
    if (pv !== undefined && !isZero(v)) {
      const two = { n: 2n, d: 1n }
      const scaled = scalePoly({ syms: prev.poly.syms, index: prev.poly.index, terms: new Map([[k, pv]]) }, two)
      if (eqPoly(err, scaled)) return "moved-term-sign"
    }
    return "sign-error"
  }
  return null
}

function minusDistributionError(prev: ParsedLine, cur: ParsedLine): boolean {
  const inner = findNegOverSum(prev.model)
  if (inner === null) return false
  if (prev.poly === null || cur.poly === null) return false
  const ctx = makeCtx(prev.model)
  const innerPoly = toPoly(inner, ctx)
  const err = polySub(cur.poly, prev.poly)
  if (innerPoly === null) return false
  const doubled = scalePoly(innerPoly, { n: 2n, d: 1n })
  return eqPoly(err, doubled)
}

function findNegOverSum(model: Model): Expr | null {
  return findNeg(asExpr(model))
}

function findNeg(e: Expr): Expr | null {
  if (e.k === "neg") {
    const inner = e.e
    if (inner.k === "add") return inner
    if (inner.k === "mul" && inner.factors.some((f) => f.k === "add")) return inner
  }
  switch (e.k) {
    case "add":
      for (const t of e.terms) {
        const r = findNeg(t)
        if (r) return r
      }
      return null
    case "mul":
      for (const f of e.factors) {
        const r = findNeg(f)
        if (r) return r
      }
      return null
    case "div":
      return findNeg(e.num) ?? findNeg(e.den)
    case "pow":
      return findNeg(e.base)
    case "neg":
      return findNeg(e.e)
    case "call":
      for (const a of e.args) {
        const r = findNeg(a)
        if (r) return r
      }
      return null
    default:
      return null
  }
}

function detectDivideByZero(cur: ParsedLine): boolean {
  return divBySym(cur.model)
}

function divBySym(m: Model): boolean {
  const check = (e: Expr): boolean => {
    switch (e.k) {
      case "div":
        if (hasSymbolRef(e.den)) return true
        return check(e.num) || check(e.den)
      case "add":
        return e.terms.some(check)
      case "mul":
        return e.factors.some(check)
      case "pow":
        return check(e.base) || check(e.exp)
      case "neg":
        return check(e.e)
      case "call":
        return e.args.some(check)
      default:
        return false
    }
  }
  return m.k === "eq" ? check(m.lhs) || check(m.rhs) : check(m.expr)
}

interface TerminalRoot {
  var: string
  value: Rat
}

function detectTerminalRoot(line: ParsedLine, goal?: ItemGoal): TerminalRoot | null {
  if (line.kind !== "eq" || !goal || !goal.roots) return null
  const m = line.model
  if (m.k !== "eq") return null
  const sides: Array<{ e: Expr; isVar: boolean; kind: "lhs" | "rhs" }> = [
    { e: m.lhs, isVar: isSingleSym(m.lhs), kind: "lhs" },
    { e: m.rhs, isVar: isSingleSym(m.rhs), kind: "rhs" },
  ]
  const varSide = sides.find((s) => s.isVar)
  const constSide = sides.find((s) => !s.isVar)
  if (!varSide?.e || varSide.e.k !== "sym" || !constSide) return null
  if (hasSymbolRef(constSide.e)) return null
  const v = evalConst(constSide.e)
  if (v === null) return null
  return { var: varSide.e.v, value: v }
}

function isSingleSym(e: Expr): boolean {
  return e.k === "sym" || (e.k === "neg" && e.e.k === "sym")
}

export function evalConst(e: Expr): Rat | null {
  if (e.k === "num") return e.v
  if (e.k === "neg") {
    const v = evalConst(e.e)
    return v === null ? null : { n: -v.n, d: v.d }
  }
  if (e.k === "add") {
    let acc: Rat | null = null
    for (const t of e.terms) {
      const v = evalConst(t)
      if (v === null) return null
      acc = acc === null ? v : addRat(acc, v)
    }
    return acc
  }
  if (e.k === "mul") {
    let acc: Rat | null = null
    for (const f of e.factors) {
      const v = evalConst(f)
      if (v === null) return null
      acc = acc === null ? v : mulRat(acc, v)
    }
    return acc
  }
  if (e.k === "div") {
    const n = evalConst(e.num)
    const d = evalConst(e.den)
    if (n === null || d === null || d.n === 0n) return null
    return div(n, d)
  }
  return null
}

function addRat(a: Rat, b: Rat): Rat {
  return { n: a.n * b.d + b.n * a.d, d: a.d * b.d }
}

function mulRat(a: Rat, b: Rat): Rat {
  return { n: a.n * b.n, d: a.d * b.d }
}

function detectMoveTag(prev: ParsedLine, cur: ParsedLine): MoveTag {
  if (prev.kind === "eq" && cur.kind === "eq") {
    if (isSquareOf(prev, cur)) return "square-both-sides"
    if (isSqrtOf(prev, cur)) return "square-root-both-sides"
  }
  if (prev.poly !== null && cur.poly !== null && eqPoly(prev.poly, cur.poly)) {
    if (containsProductOfSums(asExpr(prev.model)) && !containsProductOfSums(asExpr(cur.model))) return "expand"
    if (containsProductOfSums(asExpr(cur.model)) && !containsProductOfSums(asExpr(prev.model))) return "factor"
    if (cur.poly.terms.size < prev.poly.terms.size) return "combine"
    if (cur.poly.terms.size > prev.poly.terms.size) return "expand"
  }
  if (prev.kind === "eq" && cur.kind === "eq") {
    const dl = sideDiff(prev, cur, 0)
    const dr = sideDiff(prev, cur, 1)
    if (dl && dr && constEquals(dl, dr)) return "add-sub-both-sides"
    const q = rescaleQuotient(prev, cur)
    if (q !== null) return "mult-div-both-sides"
    if (eqPoly(modelToPoly(prev.model)!, modelToPoly(cur.model)!)) return "move-term"
    return "rewrite"
  }
  return "rewrite"
}

function constEquals(a: Poly, b: Poly): boolean {
  if (a.terms.size !== 1 || b.terms.size !== 1) return false
  const [ka, va] = [...a.terms.entries()][0]
  const [kb, vb] = [...b.terms.entries()][0]
  if (ka.split(",").some((s) => s !== "0") || kb.split(",").some((s) => s !== "0")) return false
  return eqRat(va, vb)
}

function rescaleQuotient(prev: ParsedLine, cur: ParsedLine): Rat | null {
  const p = prev.model
  const c = cur.model
  if (p.k !== "eq" || c.k !== "eq") return null
  const ctx = makeCtx(c)
  const pl = toPoly(p.lhs, ctx)
  const pr = toPoly(p.rhs, ctx)
  const cl = toPoly(c.lhs, ctx)
  const cr = toPoly(c.rhs, ctx)
  if (pl === null || pr === null || cl === null || cr === null) return null
  const fl = scalarQuotient(pl, cl)
  const fr = scalarQuotient(pr, cr)
  if (fl === null || fr === null) return null
  if (!eqRat(fl, fr)) return null
  if (eqRat(fl, { n: 1n, d: 1n })) return null
  return fl
}

function scalarQuotient(a: Poly | null, b: Poly | null): Rat | null {
  if (!a || !b || a.terms.size !== b.terms.size || a.terms.size === 0) return null
  const keysA = [...a.terms.keys()].sort()
  const keysB = [...b.terms.keys()].sort()
  for (let i = 0; i < keysA.length; i++) if (keysA[i] !== keysB[i]) return null
  let ratio: Rat | null = null
  for (const k of keysA) {
    const va = a.terms.get(k)!
    const vb = b.terms.get(k)!
    if (vb.n === 0n) return null
    const r = div(va, vb)
    if (ratio === null) ratio = r
    else if (!eqRat(ratio, r)) return null
  }
  return ratio
}

function sideDiff(prev: ParsedLine, cur: ParsedLine, which: 0 | 1): Poly | null {
  const p = prev.model
  const c = cur.model
  if (p.k !== "eq" || c.k !== "eq") return null
  const pe = which === 0 ? p.lhs : p.rhs
  const ce = which === 0 ? c.lhs : c.rhs
  const ctx = makeCtx(c)
  const pp = toPoly(pe, ctx)
  const cp = toPoly(ce, ctx)
  if (pp === null || cp === null) return null
  return polySub(cp, pp)
}

function isSquareOf(prev: ParsedLine, cur: ParsedLine): boolean {
  const p = prev.model
  const c = cur.model
  if (p.k !== "eq" || c.k !== "eq") return false
  return (c.lhs.k === "pow" && astSame(c.lhs.base, p.lhs) && c.rhs.k === "pow" && astSame(c.rhs.base, p.rhs))
}

function isSqrtOf(prev: ParsedLine, cur: ParsedLine): boolean {
  const p = prev.model
  const c = cur.model
  if (p.k !== "eq" || c.k !== "eq") return false
  const lhs = p.lhs.k === "pow" && p.lhs.exp.k === "num" && p.lhs.exp.v.n === 2n && astSame(p.lhs.base, c.lhs)
  const rhs = p.rhs.k === "pow" && p.rhs.exp.k === "num" && p.rhs.exp.v.n === 2n && astSame(p.rhs.base, c.rhs)
  return lhs && rhs
}

export function lineHasProducts(line: ParsedLine): boolean {
  return containsProductOfSums(asExpr(line.model))
}

export interface CheckResult {
  ok: boolean
  low?: boolean
  reason?: string
}

export function checkJustification(source: string, claimedNumerals: string[]): CheckResult {
  const line = parseToLine(source.replace(/\s/g, ""))
  if (line === null || hasSymbolRef(asExpr(line.model))) {
    return { ok: false, reason: "Substitute your answer back in — no letters." }
  }
  const m = line.model
  if (m.k !== "eq") {
    return { ok: false, reason: "Write it as an equation, like 2(4)+3 = 11." }
  }
  const l = evalConst(m.lhs)
  const r = evalConst(m.rhs)
  if (l === null || r === null || r.n === 0n) {
    return { ok: false, reason: "Scale-check needs plain numbers." }
  }
  const close = l.n * r.d === r.n * l.d
  if (!close) return { ok: false, reason: "The two sides don't agree — check the arithmetic." }
  const mentions = claimedNumerals.some((v) => source.includes(v))
  return { ok: true, low: !mentions }
}

export function astSame(a: Expr | Model, b: Expr | Model): boolean {
  if (a.k === "eq") {
    if (b.k !== "eq") return false
    return astSame(a.lhs, b.lhs) && astSame(a.rhs, b.rhs)
  }
  if (a.k === "expr") {
    if (b.k !== "expr") return false
    return astSame(a.expr, b.expr)
  }
  if (b.k === "eq" || b.k === "expr") return false
  if (a.k !== b.k) return false
  switch (a.k) {
    case "num":
      return b.k === "num" && eqRat(a.v, b.v)
    case "sym":
      return b.k === "sym" && a.v === b.v
    case "add":
      return b.k === "add" && a.terms.length === b.terms.length && a.terms.every((t, i) => astSame(t, b.terms[i]))
    case "mul":
      return b.k === "mul" && a.factors.length === b.factors.length && a.factors.every((f, i) => astSame(f, b.factors[i]))
    case "div":
      return b.k === "div" && astSame(a.num, b.num) && astSame(a.den, b.den)
    case "pow":
      return b.k === "pow" && astSame(a.base, b.base) && astSame(a.exp, b.exp)
    case "neg":
      return b.k === "neg" && astSame(a.e, b.e)
    case "call":
      return (
        b.k === "call" &&
        a.fn === b.fn &&
        a.args.length === b.args.length &&
        a.args.every((t, i) => astSame(t, b.args[i]))
      )
  }
}