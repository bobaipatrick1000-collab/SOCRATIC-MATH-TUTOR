export type TokType =
  | "num"
  | "id"
  | "op"
  | "lparen"
  | "rparen"
  | "comma"
  | "assign"
  | "eof"

export interface Tok {
  type: TokType
  val: string
  pos: number
}

export class TokenError extends Error {
  pos: number
  constructor(msg: string, pos: number) {
    super(msg)
    this.pos = pos
  }
}

const OP_CHARS = new Set(["+", "-", "*", "/", "^"])

export function tokenize(src: string): Tok[] {
  const out: Tok[] = []
  const n = src.length
  let i = 0
  while (i < n) {
    const c = src[i]
    if (c === " " || c === "\t" || c === "\u00a0") {
      i++
      continue
    }
    const pos = i
    if (c >= "0" && c <= "9") {
      let j = i
      while (j < n && ((src[j] >= "0" && src[j] <= "9") || src[j] === ".")) {
        if (src[j] === "." && src[j + 1] === ".") break
        j++
      }
      const text = src.slice(i, j)
      const dots = text.split(".").length - 1
      if (dots > 1) throw new TokenError(`malformed number "${text}"`, pos)
      if (text === ".") throw new TokenError("expected digits", pos)
      out.push({ type: "num", val: text, pos })
      i = j
      continue
    }
    if (/[A-Za-z]/.test(c)) {
      let j = i
      while (j < n && /[A-Za-z0-9]/.test(src[j])) j++
      out.push({ type: "id", val: src.slice(i, j), pos })
      i = j
      continue
    }
    if (OP_CHARS.has(c)) {
      out.push({ type: "op", val: c, pos })
      i++
      continue
    }
    if (c === "(") {
      out.push({ type: "lparen", val: c, pos })
      i++
      continue
    }
    if (c === ")") {
      out.push({ type: "rparen", val: c, pos })
      i++
      continue
    }
    if (c === ",") {
      out.push({ type: "comma", val: c, pos })
      i++
      continue
    }
    if (c === "=") {
      out.push({ type: "assign", val: c, pos })
      i++
      continue
    }
    throw new TokenError(`unrecognised character "${c}"`, pos)
  }
  out.push({ type: "eof", val: "", pos: n })
  return out
}