import { chatJson, AiNotConfiguredError, type ChatMessage } from "./client"
import { fixtureLesson } from "./fixtures"
import { resolveTopic, looksLikeMathQuery } from "./topic"
import { validateGeneratedLesson, type GeneratedLesson } from "./schema"
import { getGeneratedLesson, putGeneratedLesson } from "../server/store/store"

const LESSON_SYSTEM = `You build mathematics lessons for Aurea, a patient Socratic tutor.
Return ONLY one JSON object (no markdown fence, no commentary). It must match this shape exactly:

{
  "topic": { "slug": "linear", "title": "Linear equations" },
  "title": "Linear equations",
  "intro": "one to three plain-English sentences with no math symbols",
  "objectives": [ { "skill": "a-slug", "text": "I can ..." } ],
  "outline": [ { "heading": "...", "points": ["...", "..."] } ],
  "workedExamples": [
    {
      "stem": "solve 2x + 3 = 11",
      "stemTex": "2x+3=11",
      "steps": [ { "tex": "2x+3=11", "note": "balance" }, { "tex": "2x=8", "note": "subtract 3 both sides" }, { "tex": "4", "note": "divide both sides by 2" } ],
      "finalAnswerTex": "x=4"
    }
  ],
  "diagrams": [],
  "practice": [
    {
      "id": "p1", "topic": "linear", "skill": "linear-equations", "kind": "solve",
      "title": "A first balance", "stem": "Solve for x.",
      "stemTex": "2x+3=11", "init": "2x+3=11",
      "roots": { "x": ["4"] },
      "hint": { "l1": "What must 2x be equal to?", "l2": "Undo the +3 first.", "l3": "Write 2x = 8, then finish." },
      "calcAllowed": false, "waitMs": 12000, "difficulty": 1,
      "alt": "Two x-blocks and three units balance eleven units.",
      "solution": { "steps": [ { "tex": "2x+3=11" }, { "tex": "2x=8" } ], "answerTex": "x=4" }
    }
  ],
  "testItems": [
    { "id": "q1", "kind": "mc", "prompt": "Which is a solution?", "promptTex": "2x+3=11", "options": [ { "label": "4", "tex": "4" }, { "label": "5", "tex": "5" }, { "label": "7", "tex": "7" }, { "label": "14", "tex": "14" } ], "correctIndex": 0, "explanation": "Substituting 4 gives 11." },
    { "id": "q2", "kind": "short", "prompt": "Solve for x.", "promptTex": "3x-1=14", "solveKind": "solve", "init": "3x-1=14", "roots": { "x": ["5"] }, "answerTex": "x=5", "explanation": "Add 1, then divide by 3." }
  ],
  "passMark": 0.8, "calcAllowed": false, "waitMs": 12000,
  "sources": [ { "title": "Authored by Aurea tutor", "license": "internal", "url": "" } ]
}

Rules:
- practice needs 4 to 8 items with increasing difficulty (1 = easy, 3 = hard).
- testItems needs 5 to 8 questions, mixing "mc" (4 options, correctIndex valid) and "short" (solveKind one of solve|simplify|translate).
- For short items with roots, give integer roots. For simplify items give init and a target that is algebraically equal (e.g. init "(x+2)(x+3)", target "x^2+5x+6").
- Every workedExample step line that is an equation must keep the equation true line by line.
- skill must be a kebab-case slug like linear-equations, bracket-expansion, factorising, quadratics, simultaneous.
- Keep every string short and honest. A lesson whose math fails a re-check is discarded.`

export type GenerateResult =
  | { ok: true; lesson: GeneratedLesson; mode: "api" | "fixture" | "cache"; cached: boolean }
  | { ok: false; error: string; mode: "api" | "fixture"; notMath?: boolean }

function responseJson(text: string): GeneratedLesson | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "")
  try {
    const parsed = JSON.parse(cleaned) as unknown
    const validation = validateGeneratedLesson(parsed)
    if (validation.lesson) return validation.lesson
    return null
  } catch {
    return null
  }
}

const MAX_RETRIES = 2

async function callApiLesson(key: string, label: string): Promise<GeneratedLesson> {
  let lastError = ""
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const messages: ChatMessage[] = [
      { role: "system", content: LESSON_SYSTEM },
      {
        role: "user",
        content: `Write a lesson for the topic: ${label}\nCache key (use as topic.slug): ${key}
${attempt > 0 ? "\nYour previous attempt was rejected as invalid math. Recheck every root by substitution and keep JSON exact." : ""}`,
      },
    ]
    const raw = await chatJson(messages, { kind: "lesson", maxTokens: 3200 })
    const lesson = responseJson(raw)
    if (lesson) return lesson
    lastError = "schema or engine verification rejected the response"
  }
  throw new Error(`All ${MAX_RETRIES + 1} attempts failed: ${lastError}`)
}

/**
 * Generate (or fetch cached) a full lesson for a user query.
 * Fixture mode when no API key is configured — offline-safe.
 */
export async function generateLesson(rawQuery: string, opts: { refresh?: boolean } = {}): Promise<GenerateResult> {
  const clean = rawQuery.trim()
  if (clean.length === 0 || !looksLikeMathQuery(clean)) {
    return {
      ok: false,
      error: "That doesn't look like a math topic yet — try something like “sine rule” or “factorising quadratics”.",
      mode: "fixture",
      notMath: true,
    }
  }
  const resolution = resolveTopic(clean)
  const key = resolution.key

  if (!opts.refresh) {
    const cached = getGeneratedLesson(key)
    if (cached) {
      const validation = validateGeneratedLesson(JSON.parse(cached.payload))
      if (validation.lesson) {
        return { ok: true, lesson: validation.lesson, mode: "cache", cached: true }
      }
    }
  }

  const fallback = fixtureLesson(key)
  if (!process.env.AUREA_AI_API_KEY) {
    if (fallback) {
      putGeneratedLesson(key, JSON.stringify(fallback))
      return { ok: true, lesson: fallback, mode: "fixture", cached: false }
    }
    return {
      ok: false,
      error:
        "No lesson is available for that yet in the offline library, and no AI key is configured. Set AUREA_AI_API_KEY to generate on demand.",
      mode: "fixture",
    }
  }

  try {
    const lesson = await callApiLesson(key, resolution.label)
    putGeneratedLesson(key, JSON.stringify(lesson))
    return { ok: true, lesson, mode: "api", cached: false }
  } catch (err) {
    if (fallback) {
      putGeneratedLesson(key, JSON.stringify(fallback))
      const note = err instanceof Error ? err.message : String(err)
      void note
      return { ok: true, lesson: fallback, mode: "fixture", cached: false }
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "The lesson could not be generated.",
      mode: "api",
    }
  }
}