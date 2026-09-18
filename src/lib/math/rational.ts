export interface Rat {
  n: bigint
  d: bigint
}

function gcdn(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b
  while (b !== 0n) {
    const t = a % b
    a = b
    b = t
  }
  return a
}

function normalize(n: bigint, d: bigint): Rat {
  if (d === 0n) throw new Error("division by zero")
  if (d < 0n) {
    n = -n
    d = -d
  }
  const g = gcdn(n, d)
  return { n: n / g, d: d / g }
}

export function rat(n: bigint | number | string, d: bigint = 1n): Rat {
  if (typeof n === "bigint") return normalize(n, d)
  if (typeof n === "number" && Number.isInteger(n)) return normalize(BigInt(n), d)
  return parseDecimal(String(n))
}

export function parseDecimal(src: string): Rat {
  let s = src.trim()
  let neg = false
  if (s.startsWith("-")) {
    neg = true
    s = s.slice(1)
  } else if (s.startsWith("+")) {
    s = s.slice(1)
  }
  const dot = s.indexOf(".")
  let intPart = s
  let fracPart = ""
  if (dot >= 0) {
    intPart = s.slice(0, dot)
    fracPart = s.slice(dot + 1)
    if (!fracPart) throw new Error("invalid number")
  }
  if (!intPart && !fracPart) throw new Error("invalid number")
  const i = intPart ? BigInt(intPart) : 0n
  let ratRes
  if (!fracPart) {
    ratRes = { n: i, d: 1n }
  } else {
    const digs = BigInt(fracPart)
    const den = 10n ** BigInt(fracPart.length)
    ratRes = { n: i * den + digs, d: den }
  }
  if (neg) ratRes.n = -ratRes.n
  return normalize(ratRes.n, ratRes.d)
}

export function gcdnAll(vals: bigint[]): bigint {
  let g = 0n
  for (const v of vals) g = gcdn(g, v)
  return g === 0n ? 1n : g
}

export function lcms(vals: bigint[]): bigint {
  let l = 1n
  for (const v of vals) {
    if (v === 0n) continue
    l = (l * v) / gcdn(l, v)
  }
  return l
}

export function add(a: Rat, b: Rat): Rat {
  return normalize(a.n * b.d + b.n * a.d, a.d * b.d)
}

export function sub(a: Rat, b: Rat): Rat {
  return normalize(a.n * b.d - b.n * a.d, a.d * b.d)
}

export function mul(a: Rat, b: Rat): Rat {
  return normalize(a.n * b.n, a.d * b.d)
}

export function div(a: Rat, b: Rat): Rat {
  if (b.n === 0n) throw new Error("division by zero")
  return normalize(a.n * b.d, a.d * b.n)
}

export function neg(a: Rat): Rat {
  return { n: -a.n, d: a.d }
}

export function inv(a: Rat): Rat {
  return normalize(a.d, a.n)
}

export function isZero(a: Rat): boolean {
  return a.n === 0n
}

export function isOne(a: Rat): boolean {
  return a.n === a.d
}

export function isNeg(a: Rat): boolean {
  return a.n < 0n
}

export function isInt(a: Rat): boolean {
  return a.d === 1n
}

export function cmpRat(a: Rat, b: Rat): number {
  const l = a.n * b.d
  const r = b.n * a.d
  return l < r ? -1 : l > r ? 1 : 0
}

export function eqRat(a: Rat, b: Rat): boolean {
  return a.n === b.n && a.d === b.d
}

export function powRatI(a: Rat, e: bigint): Rat {
  if (e === 0n) return { n: 1n, d: 1n }
  if (e < 0n) return powRatI(inv(a), -e)
  let result: Rat = { n: 1n, d: 1n }
  let base = a
  let k = e
  while (k > 0n) {
    if (k % 2n === 1n) result = mul(result, base)
    base = mul(base, base)
    k /= 2n
  }
  return result
}

export function sqrtRat(r: Rat): Rat | null {
  if (r.n < 0n) return null
  const sn = sqrtBigInt(r.n)
  const sd = sqrtBigInt(r.d)
  if (sn === null || sd === null) return null
  return { n: sn, d: sd }
}

function sqrtBigInt(v: bigint): bigint | null {
  if (v < 0n) return null
  if (v === 0n) return 0n
  let x = v
  let y = (x + 1n) / 2n
  while (y < x) {
    x = y
    y = (x + v / x) / 2n
  }
  return x * x === v ? x : null
}

export function toNum(r: Rat): number {
  if (r.d === 0n) return NaN
  return Number(r.n) / Number(r.d)
}

export function toDec(r: Rat): string {
  const s = normalize(r.n, r.d)
  if (s.d === 1n) return s.n.toString()
  return `${s.n}/${s.d}`
}