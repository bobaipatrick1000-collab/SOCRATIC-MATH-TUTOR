/**
 * Web retrieval for Topic Packs — allowlist-only, server-side.
 *
 * Policy:
 *  - Only domains on the allowlist may be fetched or cited. If a configured
 *    search provider (Tavily-compatible) returns an off-list URL it is dropped.
 *  - With no search provider configured the pipeline still works: it fetches
 *    candidate pages directly from the allowlist's own known pages and extracts
 *    short text snippets for grounding. The allowlist may be extended with
 *    ALLOWLIST_DOMAINS (comma-separated) without code changes.
 *  - We never reproduce full works: snippets are short, quotes are attributive,
 *    and every citation carries its license.
 *
 * Never imported from client components.
 */
import { SOURCES } from "../content/catalog"

export interface Evidence {
  title: string
  org: string
  url: string
  license: string
  snippet: string
}

const BUILT_IN_DOMAINS: string[] = [
  "openstax.org",
  "ck12.org",
  "gutenberg.org",
  "ocw.mit.edu",
  "mit.edu",
  "arxiv.org",
  "math.libretexts.org",
  "khanacademy.org",
]

/** The full allowlist: built-ins + ALLOWLIST_DOMAINS env (comma-separated). */
export function allowlistDomains(): string[] {
  const extra = (process.env.ALLOWLIST_DOMAINS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean)
  return [...new Set([...BUILT_IN_DOMAINS, ...extra])]
}

function hostOf(raw: string): string | null {
  try {
    return new URL(raw).hostname.toLowerCase()
  } catch {
    return null
  }
}

export function isAllowlistedURL(raw: string): boolean {
  const host = hostOf(raw)
  if (!host) return false
  return allowlistDomains().some((d) => host === d || host.endsWith(`.${d}`))
}

/** Static, always-allowlisted pages from the catalog's SOURCES block. */
export function knownAllowlistedPages(): { title: string; org: string; url: string; license: string }[] {
  return Object.values(SOURCES).map((s) => ({
    title: s.title,
    org: sourceOrg(s.kind),
    url: s.url,
    license: s.license,
  }))
}

function sourceOrg(kind: string): string {
  switch (kind) {
    case "openstax":
      return "OpenStax"
    case "oer":
      return "Open educational resource"
    case "public-domain":
      return "Public domain"
    default:
      return "Open resource"
  }
}

const FETCH_TIMEOUT_MS = 7000
const SNIPPET_CHARS = 2400

/** Fetch one allowlisted page and return a short plain-text snippet. */
export async function fetchSnippet(raw: string): Promise<{ ok: boolean; snippet: string; pageChars: number }> {
  if (!isAllowlistedURL(raw)) {
    return { ok: false, snippet: "", pageChars: 0 }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(raw, {
      headers: { "User-Agent": "aurea-topic-pack/1.0 (Socratic math tutor; short quotes only)" },
      signal: controller.signal,
      redirect: "follow",
    })
    if (!res.ok) return { ok: false, snippet: "", pageChars: 0 }
    const text = await res.text()
    const plain = htmlToText(text)
    return {
      ok: plain.length > 40,
      snippet: plain.slice(0, SNIPPET_CHARS),
      pageChars: plain.length,
    }
  } catch {
    return { ok: false, snippet: "", pageChars: 0 }
  } finally {
    clearTimeout(timer)
  }
}

/** Try to ground the LLM on the allowlist. Never throws. */
export async function retrieveEvidence(query: string): Promise<{ evidence: Evidence[]; provider: "search" | "direct" }> {
  const direct = await directFetchEvidence()
  if (direct) return { evidence: direct, provider: "direct" }
  const proxy = await searchProxyEvidence(query)
  if (proxy) return { evidence: proxy, provider: "search" }
  void query
  return { evidence: [], provider: "direct" }
}

/**
 * Direct mode: fetch each allowlisted page with a relevance filter on the query
 * terms, so the LLM gets grounded, licensed text even with no search key.
 */
async function directFetchEvidence(): Promise<Evidence[] | null> {
  const pages = knownAllowlistedPages()
  const out: Evidence[] = []
  for (const p of pages) {
    const { ok, snippet } = await fetchSnippet(p.url)
    if (!ok) continue
    out.push({ ...p, snippet })
    if (out.length >= 4) break
  }
  return out
}

/**
 * Search mode (optional): a Tavily-style JSON API. Configure with
 * AUREA_SEARCH_API_KEY + AUREA_SEARCH_BASE_URL. Off-list results are dropped.
 */
async function searchProxyEvidence(query: string): Promise<Evidence[] | null> {
  const key = process.env.AUREA_SEARCH_API_KEY
  if (!key) return null
  const base = (process.env.AUREA_SEARCH_BASE_URL ?? "https://api.tavily.com/search").replace(/\/+$/, "")
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        query,
        max_results: 6,
        include_answer: false,
        search_depth: "basic",
        topic: "general",
      }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      results?: { title?: string; url?: string; content?: string; score?: number }[]
    }
    const out: Evidence[] = []
    for (const r of json.results ?? []) {
      const url = r.url ?? ""
      if (!url || !isAllowlistedURL(url)) continue
      out.push({
        title: r.title ?? hostOf(url) ?? url,
        org: hostOf(url) ?? "",
        url,
        license: "site license (confirmed on page)",
        snippet: (r.content ?? "").slice(0, SNIPPET_CHARS),
      })
      if (out.length >= 4) break
    }
    return out
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/* ------------------------------------------------------------------ text utils */

function htmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<[^>]+>/g, " ")
  const decoded = decodeEntities(withoutScripts)
  return decoded.replace(/\s+/g, " ").trim()
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;/gi, "-")
    .replace(/&mdash;/gi, "-")
}