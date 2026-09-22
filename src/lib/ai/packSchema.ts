import type { ItemKind } from "../content/catalog"
import { verifyPracticeItem } from "./answerCheck"

/**
 * Web-sourced Topic Pack — the 5-block unit of study a topic page shows:
 * Description, Context, Objectives, Worked Examples, Practice (with per-item
 * hidden answer keys). Same doctrine as the lesson generator: the LLM proposes,
 * the project's own math engine disposes. `hidden_key.final_result` never
 * reaches the student UI (see stripHiddenKeys / the pack API routes).
 */

export type PackLevel = "beginner" | "intermediate" | "challenge"

export interface PackObjective {
  text: string
  level: PackLevel
}

export interface PackWorkedExample {
  title: string
  prompt: string
  method: string
  steps: string[]
  checkpoint: string
}

export interface PackHiddenKey {
  final_result: string
  first_stuck_point: string
  level_1_hint: string
}

export interface PackPracticeItem {
  id: string
  kind: ItemKind
  stem: string
  stemTex?: string
  init?: string
  target?: string
  roots?: Record<string, string[]>
  difficulty: 1 | 2 | 3
  title?: string
  alt?: string
  calcAllowed?: boolean
  waitMs?: number
  skill?: string
  source_title: string
  hidden_key: PackHiddenKey
}

export interface PackCitation {
  title: string
  org: string
  url: string
  license: string
  accessed: string
}

export interface PackLicenseFlags {
  fallback: boolean
  allowlisted: boolean
}

export interface TopicPack {
  topic: { slug: string; title: string }
  query: string
  description: string
  context: string
  objectives: PackObjective[]
  worked_examples: PackWorkedExample[]
  practice: PackPracticeItem[]
  citations: PackCitation[]
  license_flags: PackLicenseFlags
}

export type PublicPackPracticeItem = Omit<PackPracticeItem, "hidden_key">

export interface PublicTopicPack extends Omit<TopicPack, "practice"> {
  practice: PublicPackPracticeItem[]
}

export interface PackGuardResult {
  pack: TopicPack
  mismatches: { itemId: string; reason: string }[]
  stripped: string[]
}

/* ------------------------------------------------------------------ helpers */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function isString(v: unknown): v is string {
  return typeof v === "string"
}

function nonEmptyStrings(arr: unknown): arr is string[] {
  return Array.isArray(arr) && arr.length > 0 && arr.every((s) => isString(s) && s.trim().length > 0)
}

const LEVELS: PackLevel[] = ["beginner", "intermediate", "challenge"]

export function packTitleCase(s: string): string {
  return s.split("-").filter(Boolean).map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ")
}

/** The engine-canonical answer string for an item, as the workspace writes it. */
export function canonicalAnswer(p: Pick<PackPracticeItem, "kind" | "init" | "target" | "roots">): string {
  if (p.kind === "solve" || p.kind === "translate") {
    const rs = p.roots ?? {}
    const parts: string[] = []
    for (const [v, vals] of Object.entries(rs)) {
      for (const val of vals) parts.push(`${v} = ${val}`)
    }
    return parts.join("; ")
  }
  return p.target ?? ""
}

function normalizeAns(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "")
}

/** Accept a final_result that names the same value the engine confirmed. */
export function finalResultConsistent(res: string, p: Pick<PackPracticeItem, "kind" | "roots" | "target">): boolean {
  const canon = canonicalAnswer(p)
  if (canon && normalizeAns(res) === normalizeAns(canon)) return true
  if (p.kind === "solve" || p.kind === "translate") {
    const rs = p.roots ?? {}
    const values = Object.values(rs).flat()
    if (values.length === 1) {
      const v = values[0]
      const bare = normalizeAns(v)
      if (normalizeAns(res) === bare) return true
      const varNames = Object.keys(rs)
      if (varNames.length === 1) {
        const vn = varNames[0]
        if (normalizeAns(res) === `${vn}=${v}`) return true
        if (normalizeAns(res) === `${v}${vn}`) return true
      }
    }
  }
  return false
}

/* ------------------------------------------------------------------ validation */

export interface PackValidation {
  pack: TopicPack | null
  errors: string[]
  warnings: string[]
}

/**
 * Structural validation of an LLM/fallback pack. Every practice item is
 * re-verified with the engine (init/roots or init/target must check out) and
 * every hidden_key.final_result must name the same value the engine confirmed.
 * Items that fail are reported; call guardPackKeys to actually strip them.
 */
export function validateTopicPack(input: unknown): PackValidation {
  const errors: string[] = []
  const warnings: string[] = []
  if (!isRecord(input)) return { pack: null, errors: ["pack must be a JSON object"], warnings }

  const o = input as Record<string, unknown>

  if (!isRecord(o.topic) || !isString(o.topic.slug) || !isString(o.topic.title) || o.topic.slug.trim().length === 0) {
    errors.push("topic { slug, title } is required")
  }
  for (const f of ["description", "context", "query"]) {
    if (!isString(o[f]) || o[f].trim().length === 0) errors.push(`${f} must be a non-empty string`)
  }

  if (!Array.isArray(o.objectives) || o.objectives.length < 3 || o.objectives.length > 6) {
    errors.push("objectives must be an array of 3..6")
  } else {
    o.objectives.forEach((ob, i) => {
      if (!isRecord(ob) || !isString(ob.text) || ob.text.trim().length === 0) {
        errors.push(`objectives[${i}] has no text`)
      } else if (!isString(ob.level) || (LEVELS as string[]).indexOf(ob.level) === -1) {
        errors.push(`objectives[${i}].level must be beginner|intermediate|challenge`)
      }
    })
  }

  if (!Array.isArray(o.worked_examples) || o.worked_examples.length < 3) {
    errors.push("worked_examples must have at least 3 examples")
  } else {
    o.worked_examples.forEach((ex, i) => {
      if (
        !isRecord(ex) ||
        !isString(ex.title) ||
        !isString(ex.prompt) ||
        !isString(ex.method) ||
        !nonEmptyStrings(ex.steps) ||
        !isString(ex.checkpoint)
      ) {
        errors.push(`worked_examples[${i}] needs title, prompt, method, steps[], checkpoint`)
      }
    })
  }

  if (!Array.isArray(o.practice) || o.practice.length < 8 || o.practice.length > 16) {
    errors.push("practice must have 8..16 items")
  } else {
    const seen = new Set<string>()
    o.practice.forEach((p, i) => {
      if (!isRecord(p)) {
        errors.push(`practice[${i}] must be an object`)
        return
      }
      const id = isString(p.id) ? p.id : `p${i}`
      if (seen.has(id)) errors.push(`practice[${i}] duplicate id "${id}"`)
      seen.add(id)
      const kind = p.kind as string
      if (kind !== "solve" && kind !== "simplify" && kind !== "translate") {
        errors.push(`practice[${i}].kind must be solve|simplify|translate`)
      }
      if (!isString(p.stem) || p.stem.trim().length === 0) errors.push(`practice[${i}].stem required`)
      if (!isString(p.source_title) || p.source_title.trim().length === 0) {
        errors.push(`practice[${i}].source_title required`)
      }
      if (!isNumIn(p.difficulty, 1, 3)) errors.push(`practice[${i}].difficulty must be 1..3`)
      if (!isRecord(p.hidden_key)) {
        errors.push(`practice[${i}].hidden_key required`)
      } else if (!isString((p.hidden_key as Record<string, unknown>).final_result)) {
        errors.push(`practice[${i}].hidden_key.final_result required`)
      }
    })
  }

  if (!Array.isArray(o.citations)) errors.push("citations must be an array (may be empty)")
  else {
    o.citations.forEach((c, i) => {
      if (!isRecord(c) || !isString(c.title) || !isString(c.license)) {
        errors.push(`citations[${i}] needs title + license`)
      }
    })
  }

  if (!isRecord(o.license_flags)) errors.push("license_flags required")
  else {
    if (!isBoolean(o.license_flags.fallback)) errors.push("license_flags.fallback must be boolean")
    if (!isBoolean(o.license_flags.allowlisted)) errors.push("license_flags.allowlisted must be boolean")
  }

  // Engine re-check (shape-only jobs happen above; numeric jobs happen here).
  if (Array.isArray(o.practice)) {
    ;(o.practice as unknown[]).forEach((p, i) => {
      if (!isRecord(p)) return
      const kind = p.kind as ItemKind
      if (!p.hidden_key) return
      const shape = {
        kind,
        init: isString(p.init) ? p.init : undefined,
        target: isString(p.target) ? p.target : undefined,
        roots: isStrRec(p.roots) ? (p.roots as Record<string, string[]>) : undefined,
      }
      if (!verifyPracticeItem(shape as never)) {
        errors.push(`practice[${i}] math failed engine re-check (roots/target not confirmed)`)
        return
      }
      if (!finalResultConsistent(String((p.hidden_key as Record<string, unknown>).final_result), shape as never)) {
        errors.push(`practice[${i}] hidden_key.final_result disagrees with the engine-confirmed value`)
      }
    })
  }

  if (errors.length > 0) return { pack: null, errors, warnings }
  return { pack: input as unknown as TopicPack, errors, warnings }
}

function isNumIn(v: unknown, lo: number, hi: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean"
}

function isStrRec(v: unknown): v is Record<string, string[]> {
  return isRecord(v) && Object.values(v).every((arr) => Array.isArray(arr) && arr.every((x) => isString(x)))
}

/* ------------------------------------------------------------------ answer-key guard */

export interface KeyMismatch {
  itemId: string
  reason: string
}

/** Strip every item whose key the engine cannot confirm (mirrors keyGuard). */
export function guardPackKeys(pack: TopicPack): PackGuardResult {
  const mismatches: KeyMismatch[] = []
  const stripped: string[] = []
  const practice: PackPracticeItem[] = []
  for (const p of pack.practice) {
    const verified = verifyPracticeItem({ kind: p.kind, init: p.init, target: p.target, roots: p.roots })
    if (!verified) {
      mismatches.push({ itemId: p.id, reason: "engine recompute disagrees with the stored key" })
      stripped.push(p.id)
      console.warn(`[pack-guard] practice "${p.id}" (${p.kind}) is unsafe — discarded.`)
      continue
    }
    if (!finalResultConsistent(p.hidden_key.final_result, p)) {
      mismatches.push({ itemId: p.id, reason: "hidden_key.final_result disagrees with the engine-confirmed value" })
      stripped.push(p.id)
      console.warn(`[pack-guard] practice "${p.id}" hidden_key.final_result is unsafe — discarded.`)
      continue
    }
    practice.push(p)
  }
  return { pack: { ...pack, practice }, mismatches, stripped }
}

/** Student-facing form of a pack: hidden keys are gone from the response entirely. */
export function stripHiddenKeys(pack: TopicPack): PublicTopicPack {
  return {
    topic: pack.topic,
    query: pack.query,
    description: pack.description,
    context: pack.context,
    objectives: pack.objectives,
    worked_examples: pack.worked_examples,
    practice: pack.practice.map((p) => p as PublicPackPracticeItem),
    citations: pack.citations,
    license_flags: pack.license_flags,
  }
}