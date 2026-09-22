import { TOPICS, topicBySlug, type TopicNode } from "../content/catalog"

/** Normalise a user query to a stable cache key + canonical topic when known. */
export interface TopicResolution {
  key: string
  canonical: TopicNode | null
  label: string
  mathish: boolean
}

const MATH_HINTS =
  /\b(eqn|equations?|solve|solving|factor|factoris|factoriz|expand|bracket|quadratic|linear|simultaneous|algebra|trigonometr|sine|cosine|tangent|ratio|proportion|fraction[s]?|decimal|negative|indices|powers?|roots?|polynomial|sequence|nth term|differentiat|integrat|matrix|vector)/i

export function looksLikeMathQuery(q: string): boolean {
  const s = q.trim()
  if (s.length < 2) return false
  if (!/[A-Za-z]/.test(s)) return false
  if (/^[0-9+\-*/^=()\s]+$/.test(s)) return false
  return true
}

export function resolveTopic(raw: string): TopicResolution {
  const q = raw.trim()
  const lower = q.toLowerCase()

  const direct = topicBySlug(lower)
  if (direct) {
    return { key: direct.slug, canonical: direct, label: direct.title, mathish: true }
  }

  const fuzzy = TOPICS.find(
    (t) =>
      t.title.toLowerCase().includes(lower) ||
      lower.includes(t.title.toLowerCase().split(" & ")[0]) ||
      t.blurb.toLowerCase().includes(lower),
  )
  if (fuzzy) {
    return { key: fuzzy.slug, canonical: fuzzy, label: fuzzy.title, mathish: true }
  }

  const mathish = looksLikeMathQuery(q)
  const key = stableKey(q)
  return { key, canonical: null, label: q, mathish }
}

function stableKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}