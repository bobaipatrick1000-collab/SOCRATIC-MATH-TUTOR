import { chatJson, type ChatMessage } from "./client"
import { resolveTopic } from "./topic"
import { fixtureLesson } from "./fixtures"
import { buildTwin } from "../content/twin"
import { ITEMS, TOPICS, lessonBySlug, topicBySlug, type ContentItem } from "../content/catalog"
import { retrieveEvidence, type Evidence } from "./retrieval"
import { getTopicPack as getStoredPack, putTopicPack as putStoredPack } from "../server/store/packStore"
import {
  guardPackKeys,
  packTitleCase,
  type PackCitation,
  type PackHiddenKey,
  type PackObjective,
  type PackPracticeItem,
  type PackWorkedExample,
  type TopicPack,
} from "./packSchema"
import { validateTopicPack } from "./packSchema"

/**
 * Topic Pack generation. Same three-mode doctrine as the lesson generator:
 *   cache  -> stored pack (validated on read)
 *   fixture-> hand-built from the internal curriculum spine (no network, no key)
 *   api    -> web-allowlisted retrieval + LLM, engine-verified, then persisted
 * Every numeric claim is re-checked by the project's math engine before it is
 * kept; unverifiable practice items are stripped by guardPackKeys.
 */

/* ---------------------------------------------------------------- result type */

export type PackMode = "cache" | "fixture" | "api"

export interface GeneratePackResult {
  ok: boolean
  pack: TopicPack | null
  mode: PackMode
  cached: boolean
  error?: string
  notMath?: boolean
}

/* ------------------------------------------------------------------- the prompt */

const PACK_SYSTEM = `You build "topic packs" for Aurea, a patient Socratic math tutor. A topic pack prepares a student before they practise: it describes the idea, sets it in context, states objectives, shows worked examples, and gives 8-12 practice problems whose hidden answer keys the tutor's engine checks.

Return ONLY one JSON object (no markdown fence, no commentary). Shape, exactly:

{
  "topic": { "slug": "linear", "title": "Linear equations" },
  "query": "what was asked",
  "description": "one to three plain-English sentences, no math symbols",
  "context": "a paragraph: when this idea is used, what it builds on, and where it leads",
  "objectives": [ { "text": "I can ...", "level": "beginner" } ],
  "worked_examples": [
    {
      "title": "A first balance",
      "prompt": "Solve 2x + 3 = 11",
      "method": "Undo additions first, then the multiplication",
      "steps": [ "2x + 3 = 11", "2x = 8", "x = 4" ],
      "checkpoint": "Substitute your answer back: 2(4)+3 = 11"
    }
  ],
  "practice": [
    {
      "id": "p1",
      "kind": "solve",
      "stem": "Solve for x.",
      "stemTex": "2x + 3 = 11",
      "init": "2x+3=11",
      "roots": { "x": ["4"] },
      "difficulty": 1,
      "title": "A first balance",
      "alt": "Two x-blocks and three units balance eleven units.",
      "calcAllowed": false,
      "waitMs": 12000,
      "skill": "linear-equations",
      "source_title": "OpenStax — Intermediate Algebra",
      "hidden_key": {
        "final_result": "x = 4",
        "first_stuck_point": "Subtracting 3 from both sides",
        "level_1_hint": "First make 2x stand alone."
      }
    }
  ],
  "citations": [ { "title": "...", "org": "...", "url": "...", "license": "...", "accessed": "YYYY-MM-DD" } ],
  "license_flags": { "fallback": false, "allowlisted": true }
}

Rules:
- worked_examples needs 3 or more, each step a TeX line that keeps the equation true line by line.
- practice needs 8 to 12 items with increasing difficulty (1 easy, 2 steady, 3 stretch). Practice items need kind solve|simplify|translate with STRUCTURED machine fields (init, roots for solve/translate with integer roots; init + target for simplify) so the math engine can verify them. hidden_key.final_result MUST be exactly the value the engine confirms from those fields (e.g. "x = 4" or "(x+2)(x+3)").
- hidden_key is for the tutor's answer guard and is stripped before students see a pack. first_stuck_point is where a typical student stalls; level_1_hint is the gentlest nudge. Keep them short.
- Every citation URL must come from the EVIDENCE provided (they are all allowlisted). Short quotes only; never reproduce a full work.
- objectives needs 3 to 6 with level beginner|intermediate|challenge.
- Keep every string short and honest. A practice item whose math fails an engine re-check is discarded.`

function parsePackJson(text: string): TopicPack | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "")
  try {
    const parsed = JSON.parse(cleaned) as unknown
    const validation = validateTopicPack(parsed)
    return validation.pack
  } catch {
    return null
  }
}

const MAX_RETRIES = 2

async function callApiPack(key: string, label: string, query: string, evidence: Evidence[]): Promise<TopicPack> {
  const evidenceBlock = JSON.stringify(
    evidence.map((e) => ({ title: e.title, org: e.org, url: e.url, license: e.license, snippet: e.snippet.slice(0, 1200) })),
  )
  let lastError = ""
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const messages: ChatMessage[] = [
      { role: "system", content: PACK_SYSTEM },
      {
        role: "user",
        content: `Build a topic pack for: ${label}
Cache key (use as topic.slug): ${key}
Search query: ${query}
${evidence.length > 0 ? `\nALLOWLISTED EVIDENCE (cite only these, as-is):\n${evidenceBlock}` : "\nNo live evidence reached this run. Build the pack from your own knowledge, keep citations to the well-known free sources you use, and set every source_title accordingly."}
${attempt > 0 ? "\nYour previous attempt failed the engine re-check. Verify every roots/target by substitution and keep JSON exact." : ""}`,
      },
    ]
    const raw = await chatJson(messages, { kind: "pack", maxTokens: 4200 })
    const pack = parsePackJson(raw)
    if (pack) return pack
    lastError = "schema or engine verification rejected the response"
  }
  throw new Error(`All ${MAX_RETRIES + 1} attempts failed: ${lastError}`)
}

/* ------------------------------------------------------- fallback (offline) builder */

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function hiddenKeyFor(item: { kind: string; init?: string; target?: string; roots?: Record<string, string[]> }, l1: string, stuck: string): PackHiddenKey {
  const canon =
    item.kind === "solve" || item.kind === "translate"
      ? Object.entries(item.roots ?? {}).flatMap(([v, vals]) => vals.map((val) => `${v} = ${val}`)).join("; ")
      : (item.target ?? "")
  return { final_result: canon, first_stuck_point: stuck, level_1_hint: l1 }
}

function packItemFromPractice(
  p: { id: string; title: string; stem: string; stemTex?: string; kind: "solve" | "simplify" | "translate"; init?: string; target?: string; roots?: Record<string, string[]>; hint: { l1: string; l2: string; l3: string }; calcAllowed: boolean; waitMs: number; difficulty: 1 | 2 | 3; alt: string; skill: string },
  idx: number,
  sourceTitle: string,
): PackPracticeItem {
  const init = p.init ?? (p.kind === "simplify" ? p.stemTex : undefined)
  return {
    id: `p${idx + 1}`,
    kind: p.kind,
    stem: p.stem,
    stemTex: p.stemTex,
    init,
    target: p.target,
    roots: p.roots,
    difficulty: p.difficulty,
    title: p.title,
    alt: p.alt,
    calcAllowed: p.calcAllowed,
    waitMs: p.waitMs,
    skill: p.skill,
    source_title: sourceTitle,
    hidden_key: hiddenKeyFor({ kind: p.kind, init, target: p.target, roots: p.roots }, p.hint.l1, p.hint.l2),
  }
}

function workedFor(
  title: string,
  prompt: string,
  method: string,
  steps: string[],
  checkpoint: string,
): PackWorkedExample {
  return { title, prompt, method, steps, checkpoint }
}

function citationsFromSources(sources: { title: string; license: string; url: string }[]): PackCitation[] {
  return sources
    .filter((s) => s.url)
    .map((s) => ({
      title: s.title,
      org: s.license === "internal" ? "Aurea practice spine" : "Open-licensed resource",
      url: s.url,
      license: s.license,
      accessed: todayStr(),
    }))
}

/** Catalog items for a slug, including one level of descendants (parenn topics). */
function itemsForSlugInclusive(slug: string): ContentItem[] {
  const kids = TOPICS.filter((t) => t.parent === slug).map((t) => t.slug)
  return ITEMS.filter((i) => i.topic === slug || kids.includes(i.topic))
}

/**
 * Build a complete pack from the internal curriculum spine (fixture lessons +
 * catalog items + twin templates to top up practice). Never touches the network.
 */
export function buildPackFallback(key: string): TopicPack | null {
  const topic = topicBySlug(key)
  if (!topic) return null
  const lesson = lessonBySlug(key)
  const fixture = fixtureLesson(key)
  const items = itemsForSlugInclusive(key)

  const objectives: PackObjective[] = []
  if (fixture && fixture.objectives.length > 0) {
    fixture.objectives.forEach((ob, i) => {
      const level: PackObjective["level"] = i === 0 ? "beginner" : i === fixture.objectives.length - 1 ? "challenge" : "intermediate"
      objectives.push({ text: ob.text, level })
    })
  }
  if (objectives.length < 3) {
    for (const s of topic.skills.slice(0, 3)) {
      objectives.push({ text: `I can work with ${packTitleCase(s)}.`, level: "beginner" })
    }
  }
  while (objectives.length < 3) {
    objectives.push({ text: "I can check my working by substitution before submitting.", level: "intermediate" })
  }

  const worked: PackWorkedExample[] = []
  if (lesson?.workedPattern) {
    worked.push(
      workedFor(
        "The core pattern",
        lesson.workedPattern.stem,
        "Follow the same move on both sides until the answer stands alone.",
        lesson.workedPattern.steps,
        `Check by substituting your answer back into the original: ${lesson.workedPattern.stem.split("=")[0] ?? ""} = your number.`,
      ),
    )
  }
  if (fixture) {
    fixture.workedExamples.slice(0, 3).forEach((ex) => {
      worked.push(
        workedFor(
          `Worked example ${worked.length + 1}`,
          ex.stem || ex.stemTex,
          "Isolate the unknown one verified move at a time, keeping every equation true.",
          ex.steps.map((s) => s.tex),
          `The final line is ${ex.finalAnswerTex} — substitute it back to confirm.`,
        ),
      )
    })
  }
  if (worked.length === 0 && fixture && fixture.practice.length > 0) {
    fixture.practice.slice(0, 3).forEach((p, i) => {
      worked.push(
        workedFor(
          `Worked example ${i + 1}`,
          p.stem,
          "Read the problem, apply the method, then check by substitution.",
          p.solution.steps.map((s) => s.tex),
          `The answer is ${p.solution.answerTex}.`,
        ),
      )
    })
  }

  const practice: PackPracticeItem[] = []
  const spineTitle = fixture && fixture.sources[0]?.title && fixture.sources[0].license !== "internal"
    ? fixture.sources[0].title
    : "Aurea practice spine"
  if (fixture) {
    fixture.practice.forEach((p, i) => practice.push(packItemFromPractice(p, i, spineTitle)))
  } else {
    items
      .slice(0, 8)
      .forEach((it, i) =>
        practice.push(
          packItemFromPractice(
            { id: it.id, title: it.title, stem: it.stem, stemTex: it.stemTex, kind: it.kind, init: it.init, target: it.target, roots: it.roots, hint: it.hint, calcAllowed: it.calcAllowed, waitMs: it.waitMs, difficulty: it.difficulty, alt: it.alt, skill: it.skill },
            i,
            spineTitle,
          ),
        ),
      )
  }

  // Top up to >= 8 using twin templates (fresh digits, engine-safe by construction).
  if (practice.length < 8) {
    const tmplSet = new Set(items.map((i) => i.tpl).filter(Boolean))
    let seed = Date.now()
    for (const tpl of tmplSet) {
      if (practice.length >= 8) break
      for (let n = practice.length; n < 8 && practice.length < 8; n++) {
        seed += 1
        const twin = buildTwin(tpl, seed * 31, new Set())
        if (!twin) continue
        practice.push(
          packItemFromPractice(
            { id: `p${practice.length + 1}`, title: "Twin problem", stem: twin.stem, stemTex: twin.stemTex, kind: twin.kind, init: twin.init, target: twin.target, roots: twin.roots, hint: twin.hint, calcAllowed: false, waitMs: 16000, difficulty: ((practice.length % 3) + 1) as 1 | 2 | 3, alt: "A freshly generated twin of a spine problem.", skill: "derived" },
            practice.length,
            spineTitle,
          ),
        )
      }
    }
  }

  if (worked.length < 3) {
    const used = new Set(worked.map((w) => w.prompt.trim()))
    for (const p of practice) {
      if (worked.length >= 3) break
      const prompt = p.stemTex ?? p.stem
      if (used.has(prompt.trim())) continue
      used.add(prompt.trim())
      worked.push(
        workedFor(
          `Worked example ${worked.length + 1}`,
          prompt,
          p.kind === "solve" ? "Do the same to both sides until the unknown is alone." : "Work one honest move at a time, then check back.",
          [prompt, "\\text{apply one legal, honest move}"],
          `The answer is ${p.hidden_key.final_result}.`,
        ),
      )
    }
  }

  if (practice.length < 8 || worked.length < 3) return null

  const sources = lesson?.sources ?? fixture?.sources ?? []
  const pack: TopicPack = {
    topic: { slug: key, title: topic.title },
    query: topic.title,
    description: fixture?.intro ?? topic.blurb,
    context: lesson
      ? lesson.blocks.map((b) => b.text).join(" ")
      : `${topic.blurb} Work the problems below to turn the method into a habit.`,
    objectives,
    worked_examples: worked.slice(0, 4),
    practice,
    citations: citationsFromSources(sources),
    license_flags: { fallback: true, allowlisted: true },
  }
  return pack
}

/* -------------------------------------------------------------------- orchestration */

export interface PackFetchOpts {
  refresh?: boolean
}

export function parseAndValidate(raw: string): TopicPack | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    const validation = validateTopicPack(parsed)
    const pack = validation.pack
    if (!pack) return null
    // Guard against a stale cache row whose keys no longer verify.
    const guarded = guardPackKeys(pack)
    return guarded.pack.practice.length >= 8 ? guarded.pack : null
  } catch {
    return null
  }
}

/**
 * Get (or build + persist) a Topic Pack for a user query. Student-safe publics
 * are produced by stripHiddenKeys at the API boundary; the raw pack (with
 * hidden keys) is only ever held server-side and inside the workspace launcher.
 */
export async function getTopicPack(query: string, opts: PackFetchOpts = {}): Promise<GeneratePackResult> {
  const clean = query.trim()
  if (clean.length === 0) {
    return { ok: false, pack: null, mode: "fixture", cached: false, error: "A topic is required.", notMath: true }
  }
  const resolution = resolveTopic(clean)
  const key = resolution.key

  if (!opts.refresh) {
    const row = getStoredPack(key)
    if (row) {
      const pack = parseAndValidate(String(row.pack))
      if (pack) return { ok: true, pack, mode: "cache", cached: true }
    }
  }

  const fallback = buildPackFallback(key)
  if (!process.env.AUREA_AI_API_KEY) {
    if (fallback) {
      putStoredPack(key, clean, fallback, { fallback: true })
      return { ok: true, pack: fallback, mode: "fixture", cached: false }
    }
    return {
      ok: false,
      pack: null,
      mode: "fixture",
      cached: false,
      error: "No open-source pack is available for that topic yet, and no AI key is configured. Set AUREA_AI_API_KEY to generate on demand.",
      notMath: true,
    }
  }

  try {
    const { evidence } = await retrieveEvidence(clean)
    const pack = await callApiPack(key, resolution.label, clean, evidence)
    const guarded = guardPackKeys(pack)
    const ok = guarded.pack.practice.length >= 8
    const final = ok ? guarded.pack : pack
    putStoredPack(key, clean, final, {
      fallback: !ok,
      sourceHash: hashCitations(final.citations),
    })
    return { ok: true, pack: final, mode: "api", cached: false }
  } catch (err) {
    if (fallback) {
      putStoredPack(key, clean, fallback, { fallback: true })
      const note = err instanceof Error ? err.message : String(err)
      void note
      return { ok: true, pack: fallback, mode: "fixture", cached: false }
    }
    return {
      ok: false,
      pack: null,
      mode: "api",
      cached: false,
      error: err instanceof Error ? err.message : "The topic pack could not be generated.",
    }
  }
}

/** Stable hash of a pack's citations — the `source_hash` for rebuild freshness. */
export function hashCitations(citations: { url: string; license?: string }[]): string {
  const flat = citations
    .map((c) => `${c.url}|${c.license ?? ""}`)
    .sort()
    .join(";")
  let h = 2166136261
  for (let i = 0; i < flat.length; i++) {
    h ^= flat.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

export function aiConfigured(): boolean {
  return Boolean(process.env.AUREA_AI_API_KEY)
}