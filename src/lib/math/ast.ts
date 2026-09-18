import { rat, type Rat } from "./rational"
import { tokenize, type Tok } from "./token"

export type Expr =
  | { k: "num"; v: Rat }
  | { k: "sym"; v: string }
  | { k: "add"; terms: Expr[] }
  | { k: "mul"; factors: Expr[] }
  | { k: "pow"; base: Expr; exp: Expr }
  | { k: "div"; num: Expr; den: Expr }
  | { k: "neg"; e: Expr }
  | { k: "call"; fn: string; args: Expr[] }

export type Model = { k: "expr"; expr: Expr } | { k: "eq"; lhs: Expr; rhs: Expr }

export class ParseError extends Error {
  pos: number
  constructor(msg: string, pos: number) {
    super(msg)
    this.pos = pos
  }
}

const FUNCTIONS = new Set([
  "sqrt",
  "abs",
  "sin",
  "cos",
  "tan",
  "ln",
  "log",
  "exp",
])

function startsFactor(t: Tok): boolean {
  return t.type === "num" || t.type === "id" || t.type === "lparen"
}

export function parse(src: string): Model {
  const toks = tokenize(src)
  const p = new Parser(toks)
  const model = p.parseModel()
  if (p.peek().type !== "eof") {
    throw new ParseError("unexpected extra input", p.peek().pos)
  }
  return model
}

export function parseExpr(src: string): Expr {
  const model = parse(src)
  if (model.k === "eq") throw new ParseError("expected an expression, not an equation", 0)
  return model.expr
}

class Parser {
  private idx = 0
  constructor(private toks: Tok[]) {}

  peek(): Tok {
    return this.toks[this.idx] ?? this.toks[this.toks.length - 1]
  }

  next(): Tok {
    return this.toks[this.idx++] ?? this.toks[this.toks.length - 1]
  }

  parseModel(): Model {
    const e1 = this.parseAdd()
    if (this.peek().type === "assign") {
      this.next()
      const e2 = this.parseAdd()
      return { k: "eq", lhs: e1, rhs: e2 }
    }
    return { k: "expr", expr: e1 }
  }

  parseAdd(): Expr {
    const terms: Expr[] = []
    let first = true
    while (true) {
      const t = this.peek()
      if (t.type === "op" && (t.val === "+" || t.val === "-")) {
        this.next()
        const sign = t.val === "-" ? -1 : 1
        const operand = this.parseTerm()
        terms.push(sign === 1 ? operand : { k: "neg", e: operand })
        first = false
        continue
      }
      if (first) {
        if (t.type === "eof") throw new ParseError("expression is empty", t.pos)
        if (t.type === "rparen" || t.type === "comma") throw new ParseError("missing an expression here", t.pos)
        terms.push(this.parseTerm())
        first = false
        continue
      }
      break
    }
    return terms.length === 1 ? terms[0] : { k: "add", terms }
  }

  parseTerm(): Expr {
    let acc = this.parseFactor()
    while (true) {
      const t = this.peek()
      if (t.type === "op" && (t.val === "*" || t.val === "/")) {
        this.next()
        const operand = this.parseFactor()
        acc =
          t.val === "*"
            ? { k: "mul", factors: [acc, operand] }
            : { k: "div", num: acc, den: operand }
        continue
      }
      if (startsFactor(t)) {
        const operand = this.parseFactor()
        acc = { k: "mul", factors: [acc, operand] }
        continue
      }
      break
    }
    return acc
  }

  parseFactor(): Expr {
    const t = this.peek()
    if (t.type === "op" && (t.val === "+" || t.val === "-")) {
      this.next()
      const operand = this.parseFactor()
      return t.val === "-" ? { k: "neg", e: operand } : operand
    }
    const post = this.parsePostfix()
    if (this.peek().type === "op" && this.peek().val === "^") {
      this.next()
      const exp = this.parseFactor()
      return { k: "pow", base: post, exp }
    }
    return post
  }

  parsePostfix(): Expr {
    const t = this.peek()
    if (t.type === "lparen") {
      this.next()
      const inner = this.parseAdd()
      const close = this.next()
      if (close.type !== "rparen") throw new ParseError("missing closing parenthesis", close.pos)
      return inner
    }
    if (t.type === "num") {
      this.next()
      return { k: "num", v: rat(t.val) }
    }
    if (t.type === "id") {
      this.next()
      const id = t.val
      if (FUNCTIONS.has(id) && this.peek().type === "lparen") {
        this.next()
        const args: Expr[] = [this.parseAdd()]
        while (this.peek().type === "comma") {
          this.next()
          args.push(this.parseAdd())
        }
        const close = this.next()
        if (close.type !== "rparen") throw new ParseError("missing closing parenthesis", close.pos)
        return { k: "call", fn: id, args }
      }
      return { k: "sym", v: id }
    }
    throw new ParseError("expected a number, symbol, or expression", t.pos)
  }
}