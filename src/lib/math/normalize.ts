import type { Expr, Model } from "./ast"
import {
  add,
  div,
  gcdnAll,
  isZero,
  lcms,
  mul as rmul,
  neg as rneg,
  powRatI,
  sqrtRat,
  sub,
  toNum,
  type Rat,
} from "./rational"

export interface Poly {
  syms: string[]
  index: Map<string, number>
  terms: Map<string, Rat>
}

export function symbolsOf(model: Model): string[] {
  const set = new Set<string>()
  const collect = (e: Expr) => collectSyms(e, set)
  if (model.k === "eq") {
    collect(model.lhs)
    collect(model.rhs)
  } else {
    collect(model.expr)
  }
  return [...set].sort()
}

function collectSyms(e: Expr, out: Set<string>): void {
  switch (e.k) {
    case "num":
      return
    case "sym":
      out.add(e.v)
      return
    case "add":
      e.terms.forEach((t) => collectSyms(t, out))
      return
    case "mul":
      e.factors.forEach((f) => collectSyms(f, out))
      return
    case "div":
      collectSyms(e.num, out)
      collectSyms(e.den, out)
      return
    case "pow":
      collectSyms(e.base, out)
      collectSyms(e.exp, out)
      return
    case "neg":
      collectSyms(e.e, out)
      return
    case "call":
      e.args.forEach((a) => collectSyms(a, out))
      return
  }
}

export function makeCtx(model: Model): { syms: string[]; index: Map<string, number> } {
  const syms = symbolsOf(model)
  const index = new Map(syms.map((s, i) => [s, i]))
  return { syms, index }
}

function zero(ctx: { syms: string[]; index: Map<string, number> }): Poly {
  return { syms: ctx.syms, index: ctx.index, terms: new Map() }
}

function key(ctx: { index: Map<string, number> }, exps: number[]): string {
  return exps.join(",")
}

function constPoly(ctx: { syms: string[]; index: Map<string, number> }, r: Rat): Poly {
  const p = zero(ctx)
  if (!isZero(r)) p.terms.set(key(ctx, new Array(ctx.syms.length).fill(0)), r)
  return p
}

function symPoly(ctx: { syms: string[]; index: Map<string, number> }, name: string): Poly {
  const p = zero(ctx)
  const i = ctx.index.get(name)
  if (i === undefined) return p
  const exps = new Array(ctx.syms.length).fill(0)
  exps[i] = 1
  p.terms.set(key(ctx, exps), { n: 1n, d: 1n })
  return p
}

function negPoly(p: Poly): Poly {
  const out: Poly = { syms: p.syms, index: p.index, terms: new Map() }
  for (const [k, v] of p.terms) out.terms.set(k, rneg(v))
  return out
}

function scalePoly(p: Poly, c: Rat): Poly {
  if (isZero(c)) return zero(p)
  const out: Poly = { syms: p.syms, index: p.index, terms: new Map() }
  for (const [k, v] of p.terms) out.terms.set(k, rmul(v, c))
  return out
}

export { scalePoly }

function addPoly(a: Poly, b: Poly): Poly {
  const out: Poly = { syms: a.syms, index: a.index, terms: new Map(a.terms) }
  for (const [k, v] of b.terms) {
    const prev = out.terms.get(k)
    if (prev === undefined) out.terms.set(k, v)
    else {
      const nv = add(prev, v)
      if (isZero(nv)) out.terms.delete(k)
      else out.terms.set(k, nv)
    }
  }
  return out
}

function subPoly(a: Poly, b: Poly): Poly {
  return addPoly(a, negPoly(b))
}

export { subPoly as sub }

function mulPoly(a: Poly, b: Poly): Poly {
  const out = zero(a)
  const ec = new Array(a.syms.length).fill(0)
  for (const [ka, va] of a.terms) {
    const ea = ka.split(",").map((s) => Number(s))
    for (const [kb, vb] of b.terms) {
      const eb = kb.split(",").map((s) => Number(s))
      ec.fill(0)
      for (let i = 0; i < ec.length; i++) ec[i] = ea[i] + eb[i]
      const k = ec.join(",")
      const prev = out.terms.get(k)
      const nv = rmul(va, vb)
      if (prev === undefined) out.terms.set(k, nv)
      else {
        const s = add(prev, nv)
        if (isZero(s)) out.terms.delete(k)
        else out.terms.set(k, s)
      }
    }
  }
  return out
}

export function toPoly(e: Expr, ctx: { syms: string[]; index: Map<string, number> }): Poly | null {
  switch (e.k) {
    case "num":
      return constPoly(ctx, e.v)
    case "sym":
      if (ctx.index.has(e.v)) return symPoly(ctx, e.v)
      return null
    case "neg": {
      const inner = toPoly(e.e, ctx)
      return inner === null ? null : negPoly(inner)
    }
    case "add": {
      let acc = zero(ctx)
      for (const t of e.terms) {
        const p = toPoly(t, ctx)
        if (p === null) return null
        acc = addPoly(acc, p)
      }
      return acc
    }
    case "mul": {
      let acc = constPoly(ctx, { n: 1n, d: 1n })
      for (const f of e.factors) {
        const p = toPoly(f, ctx)
        if (p === null) return null
        acc = mulPoly(acc, p)
      }
      return acc
    }
    case "div": {
      const d = toPoly(e.den, ctx)
      if (d === null) return null
      if (isConstPoly(d)) return scalePoly(toPoly(e.num, ctx) ?? constPoly(ctx, { n: 0n, d: 1n }), invPoly(d))
      return null
    }
    case "pow": {
      const expNum = numOf(e.exp)
      const baseNum = numOf(e.base)
      if (expNum === null) return null
      if (expNum.d !== 1n || expNum.n < -50n || expNum.n > 100n) return null
      if (baseNum !== null) {
        const r = powRatI(baseNum, expNum.n)
        return constPoly(ctx, r)
      }
      const exp = Number(expNum.n)
      if (exp < 0) return null
      const bp = toPoly(e.base, ctx)
      if (bp === null) return null
      let acc = constPoly(ctx, { n: 1n, d: 1n })
      for (let i = 0; i < exp; i++) acc = mulPoly(acc, bp)
      return acc
    }
    case "call":
      return null
  }
  return null
}

function numOf(e: Expr): Rat | null {
  return e.k === "num" ? e.v : null
}

function isConstPoly(p: Poly): boolean {
  if (p.terms.size === 0) return true
  const len = p.syms.length
  for (const k of p.terms.keys()) {
    if (!k.split(",").every((s) => s === "0")) return false
  }
  return len >= 0
}

function invPoly(p: Poly): Rat {
  const v = [...p.terms.values()][0]
  if (!v) return { n: 0n, d: 1n }
  return { n: v.d, d: v.n }
}

export function modelToPoly(model: Model): Poly | null {
  if (model.k === "expr") {
    const ctx = makeCtx(model)
    return toPoly(model.expr, ctx)
  }
  const ctx = makeCtx(model)
  const l = toPoly(model.lhs, ctx)
  const r = toPoly(model.rhs, ctx)
  return l === null || r === null ? null : subPoly(l, r)
}

export function primitive(p: Poly): Poly {
  const out: Poly = { syms: p.syms, index: p.index, terms: new Map() }
  if (p.terms.size === 0) return out
  const lcm = lcms([...p.terms.values()].map((c) => c.d))
  const ints: Array<[string, bigint]> = []
  for (const [k, c] of p.terms) ints.push([k, (c.n * lcm) / c.d])
  const g = gcdnAll(ints.map(([, v]) => v))
  for (const [k, v] of ints) out.terms.set(k, { n: v / g, d: 1n })
  const lead = orderedTerms(out)[0]
  if (lead && out.terms.get(lead)!.n < 0n) {
    const flipped = new Map<string, Rat>()
    for (const [k, v] of out.terms) flipped.set(k, { n: -v.n, d: v.d })
    out.terms = flipped
  }
  return out
}

function orderedTerms(p: Poly): string[] {
  return [...p.terms.keys()].sort((a, b) => {
    const ea = a.split(",").map(Number)
    const eb = b.split(",").map(Number)
    const da = ea.reduce((s, x) => s + x, 0)
    const db = eb.reduce((s, x) => s + x, 0)
    if (da !== db) return db - da
    return ea.join("") < eb.join("") ? -1 : 1
  })
}

export function polyKey(p: Poly, opts?: { primitiveKey: boolean }): string {
  const src = opts?.primitiveKey ? primitive(p) : p
  const parts = orderedTerms(src).map((k) => {
    const v = src.terms.get(k)!
    const n = v.n.toString()
    const d = v.d === 1n ? "" : `/${v.d.toString()}`
    return `${v.n < 0n ? "" : "+"}${n}${d}@${k}`
  })
  return src.terms.size === 0 ? "0" : parts.join(";")
}

export function complexity(p: Poly): number {
  let c = 0
  for (const [k, v] of p.terms) {
    let mag = v.n < 0n ? -v.n : v.n
    let digits = 0
    while (mag > 0n) {
      digits++
      mag /= 10n
    }
    c += Math.max(digits, 1) + k.split(",").reduce((s, x) => s + Number(x), 0) + 1
  }
  return p.terms.size === 0 ? 0 : c
}

export function eqPoly(a: Poly, b: Poly): boolean {
  return polyKey(a, { primitiveKey: true }) === polyKey(b, { primitiveKey: true })
}

export interface SolveResult {
  kind: "linear" | "quadratic-rational" | "quadratic-surd" | "none" | "unsupported"
  roots?: Rat[]
  a?: Rat
  b?: Rat
  c?: Rat
}

export function solvePoly(p: Poly, sym: string): SolveResult {
  const i = p.index.get(sym)
  if (i === undefined) return { kind: "none" }
  const coeffs = new Map<number, Rat>()
  for (const [k, v] of p.terms) {
    const exps = k.split(",")
    const d = Number(exps[i] ?? 0)
    coeffs.set(d, (coeffs.get(d) ?? { n: 0n, d: 1n }).n === 0n ? v : add(coeffs.get(d)!, v))
  }
  const deg = Math.max(0, ...[...coeffs.keys()])
  const c0 = coeffs.get(0) ?? { n: 0n, d: 1n }
  if (deg === 1) {
    const c1 = coeffs.get(1)!
    return { kind: "linear", roots: [div(rneg(c0), c1)] }
  }
  if (deg === 2) {
    const a = coeffs.get(2)!
    const b = coeffs.get(1) ?? { n: 0n, d: 1n }
    const disc = sub(rmul(b, b), rmul({ n: 4n, d: 1n }, rmul(a, c0)))
    const sd = sqrtRat(disc)
    const twoA = rmul({ n: 2n, d: 1n }, a)
    if (sd !== null) {
      const r1 = div(add(rneg(b), sd), twoA)
      const r2 = div(sub(rneg(b), sd), twoA)
      return { kind: "quadratic-rational", roots: [r1, r2] }
    }
    return { kind: "quadratic-surd", a, b, c: c0 }
  }
  return { kind: "unsupported" }
}

export function ratOf(x: number): Rat {
  if (!Number.isFinite(x)) return { n: 0n, d: 1n }
  if (Number.isInteger(x)) return { n: BigInt(x), d: 1n }
  const s = x.toString()
  return {
    n: BigInt(s.replace(".", "")),
    d: 10n ** BigInt(s.includes(".") ? s.length - s.indexOf(".") - 1 : 0),
  }
}

export function evalNum(e: Expr, pt: Map<string, number>): number | null {
  switch (e.k) {
    case "num":
      return toNum(e.v)
    case "sym": {
      if (e.v === "pi") return Math.PI
      if (e.v === "e") return Math.E
      return pt.get(e.v) ?? null
    }
    case "neg": {
      const v = evalNum(e.e, pt)
      return v === null ? null : -v
    }
    case "add": {
      let acc = 0
      for (const t of e.terms) {
        const v = evalNum(t, pt)
        if (v === null) return null
        acc += v
      }
      return acc
    }
    case "mul": {
      let acc = 1
      for (const f of e.factors) {
        const v = evalNum(f, pt)
        if (v === null) return null
        acc *= v
      }
      return acc
    }
    case "div": {
      const n = evalNum(e.num, pt)
      const d = evalNum(e.den, pt)
      if (n === null || d === null || d === 0) return null
      return n / d
    }
    case "pow": {
      const b = evalNum(e.base, pt)
      const x = evalNum(e.exp, pt)
      if (b === null || x === null) return null
      return Math.pow(b, x)
    }
    case "call": {
      const vals = e.args.map((a) => evalNum(a, pt))
      if (vals.some((v) => v === null)) return null
      const v = vals[0]!
      switch (e.fn) {
        case "sqrt":
          return v < 0 ? null : Math.sqrt(v)
        case "abs":
          return Math.abs(v)
        case "sin":
          return Math.sin(v)
        case "cos":
          return Math.cos(v)
        case "tan":
          return Math.cos(v) === 0 ? null : Math.tan(v)
        case "ln":
          return v <= 0 ? null : Math.log(v)
        case "log":
          return v <= 0 ? null : Math.log10(v)
        case "exp":
          return Math.exp(v)
        default:
          return null
      }
    }
  }
  return null
}

const SAMPLE_POINTS: number[] = [0, 1, -1, 2, -2, 3, 4, 0.5, -0.5, 1.5]

export function sampleKey(model: Model): string | null {
  const syms = symbolsOf(model)
  if (syms.length === 0) {
    const v = evalNum(model.k === "eq" ? model.lhs : model.expr, new Map())
    if (v === null || !Number.isFinite(v)) return null
    return Math.round(v * 1e6).toString()
  }
  const vals: string[] = []
  const pt = new Map(syms.map((s) => [s, 0]))
  for (const pp of SAMPLE_POINTS) {
    for (const s of syms) pt.set(s, pp)
    const v = evalNum(model.k === "eq" ? model.lhs : model.expr, pt)
    if (v === null || !Number.isFinite(v)) return null
    vals.push(Math.round(v * 1e6).toString())
  }
  return vals.join("|")
}