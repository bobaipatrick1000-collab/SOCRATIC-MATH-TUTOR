import type { Expr, Model } from "./ast"

const SYM_NAME: Record<string, string> = {
  pi: "\\pi",
  e: "\\mathrm{e}",
  theta: "\\theta",
  alpha: "\\alpha",
}

export function toLatex(model: Model): string {
  return model.k === "eq"
    ? `${exprLatex(model.lhs)} = ${exprLatex(model.rhs)}`
    : exprLatex(model.expr)
}

export function exprLatex(e: Expr): string {
  return latex(e, 0)
}

function latex(e: Expr, parent: number): string {
  switch (e.k) {
    case "num":
      if (e.v.n === 0n) return "0"
      if (e.v.n < 0n) return `-${latex({ k: "num", v: { n: -e.v.n, d: e.v.d } }, 0)}`
      if (e.v.d === 1n) return e.v.n.toString()
      return `\\frac{${e.v.n.toString()}}{${e.v.d.toString()}}`
    case "sym":
      return SYM_NAME[e.v] ?? (e.v.length === 1 ? e.v : `\\operatorname{${e.v}}`)
    case "neg":
      return `-${brace(latex(e.e, 2))}`
    case "add": {
      const s = e.terms
        .map((t) => {
          const inner = latex(t, 1)
          return t.k === "neg" ? ` - ${latex((t as { e: Expr }).e, 0)}` : ` + ${inner}`
        })
        .join("")
      const body = s.startsWith(" + ") ? s.slice(3) : s
      return wrap(body, parent > 1)
    }
    case "mul": {
      const parts = e.factors.map((f) => {
        if (f.k === "num") return latex(f, 4)
        if (f.k === "neg") return latex(f, 4)
        return latex(f, 3)
      })
      const body = parts.join("\\,")
      return wrap(body, parent > 2)
    }
    case "div":
      return wrap(`\\frac{${latex(e.num, 0)}}{${latex(e.den, 0)}}`, parent > 2)
    case "pow":
      return `${brace(latex(e.base, 3))}^{${latex(e.exp, 0)}}`
    case "call": {
      switch (e.fn) {
        case "sqrt":
          return wrap(`\\sqrt{${latex(e.args[0], 0)}}`, parent > 3)
        case "abs":
          return wrap(`\\left| ${latex(e.args[0], 0)} \\right|`, parent > 3)
        case "__div":
          return wrap(`\\frac{${latex(e.args[0], 0)}}{${latex(e.args[1], 0)}}`, parent > 2)
        default:
          return wrap(`${fnName(e.fn)}${paren(e.args.map((a) => latex(a, 0)).join(", "))}`, parent > 3)
      }
    }
  }
}

function fnName(fn: string): string {
  const map: Record<string, string> = {
    sin: "\\sin",
    cos: "\\cos",
    tan: "\\tan",
    ln: "\\ln",
    log: "\\log",
    exp: "\\exp",
  }
  return map[fn] ?? `\\operatorname{${fn}}`
}

function brace(s: string): string {
  if (s.length === 1) return s
  return `\\left(${s}\\right)`
}

function paren(s: string): string {
  return `\\left(${s}\\right)`
}

function wrap(s: string, cond: boolean): string {
  return cond ? brace(s) : s
}