export interface GuardResult {
  ok: boolean
  reason?: string
}

const UNSAFE = /(here is|the answer is|answer:|x\s*=\s*-?\d+\s*(;|$))/

export function guardText(text: string, leakTokens: string[]): GuardResult {
  if (!text || text.trim().length === 0) return { ok: false, reason: "empty" }
  const lower = text.toLowerCase()
  if (UNSAFE.test(lower)) return { ok: false, reason: "answer-like" }
  for (const tok of leakTokens) {
    const t = tok.toLowerCase().replace(/\s/g, "")
    const compact = lower.replace(/\s/g, "")
    if (compact.includes(t) && t.length >= 2) return { ok: false, reason: "leak-of-final" }
  }
  return { ok: true }
}

export function safeHint(candidate: string, fallback: string, leakTokens: string[]): string {
  const g = guardText(candidate, leakTokens)
  return g.ok ? candidate : fallback
}