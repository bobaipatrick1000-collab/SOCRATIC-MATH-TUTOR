import type { ItemKind } from "../content/catalog"
import { verifyPracticeItem, verifyWorkedExample, verifySimplify } from "./answerCheck"

export type SceneSpec =
  | { kind: "number-line"; from: number; to: number; markers: { at: number; label?: string; open?: boolean }[] }
  | { kind: "balance-scale"; leftHeavy: boolean; unknownSide: "left" | "right"; count: number }
  | { kind: "factor-grid"; a: number; b: number; c: number; d: number }
  | { kind: "coordinate-axes"; fn: { type: "line"; m: number; b: number } | { type: "parabola"; a: number; b: number; c: number } };

export interface GeneratedObjective {
  skill: string
  text: string
}

export interface HintLadder {
  l1: string
  l2: string
  l3: string
}

export interface GeneratedSolution {
  steps: { tex: string; note?: string }[]
  answerTex: string
}

export interface GeneratedPracticeItem {
  id: string
  topic: string
  skill: string
  kind: ItemKind
  title: string
  stem: string
  stemTex?: string
  init?: string
  target?: string
  roots?: Record<string, string[]>
  hint: HintLadder
  calcAllowed: boolean
  waitMs: number
  difficulty: 1 | 2 | 3
  alt: string
  solution: GeneratedSolution
}

export interface TestOption {
  label: string
  tex?: string
}

export type GeneratedTestItem =
  | {
      id: string
      kind: "mc"
      prompt: string
      promptTex?: string
      options: TestOption[]
      correctIndex: number
      explanation: string
    }
  | {
      id: string
      kind: "short"
      prompt: string
      promptTex?: string
      solveKind: "solve" | "simplify" | "translate"
      init?: string
      target?: string
      roots?: Record<string, string[]>
      answerTex: string
      explanation: string
    };

export interface GeneratedLesson {
  topic: { slug: string; title: string }
  title: string
  intro: string
  introScene?: SceneSpec
  objectives: GeneratedObjective[]
  outline: { heading: string; points: string[] }[]
  workedExamples: {
    stem: string
    stemTex: string
    steps: { tex: string; note?: string }[]
    finalAnswerTex: string
  }[]
  diagrams: SceneSpec[]
  practice: GeneratedPracticeItem[]
  testItems: GeneratedTestItem[]
  passMark: number
  calcAllowed: boolean
  waitMs: number
  sources: { title: string; license: string; url: string }[]
}

export interface AiValidation {
  lesson: GeneratedLesson | null
  errors: string[]
  warnings: string[]
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function isString(v: unknown): v is string {
  return typeof v === "string"
}

function isBool(v: unknown): v is boolean {
  return typeof v === "boolean"
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v)
}

function isStrArr(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString)
}

function isStrRec(v: unknown): v is Record<string, string[]> {
  return (
    isRecord(v) &&
    Object.values(v).every((arr) => isStrArr(arr))
  )
}

function isHint(v: unknown): v is HintLadder {
  return isRecord(v) && isString(v.l1) && isString(v.l2) && isString(v.l3)
}

function assertUniqueIds(items: { id: string }[], errors: string[]): void {
  const seen = new Set<string>()
  for (const it of items) {
    if (seen.has(it.id)) errors.push(`duplicate id "${it.id}"`)
    seen.add(it.id)
  }
}

/**
 * Structurally validate an LLM-produced lesson, then re-verify every numeric
 * fact with the math engine. A lesson with wrong math is rejected as a whole.
 */
export function validateGeneratedLesson(input: unknown): AiValidation {
  const errors: string[] = []
  const warnings: string[] = []
  if (!isRecord(input)) {
    return { lesson: null, errors: ["lesson must be a JSON object"], warnings }
  }

  const o = input as Record<string, unknown>

  if (!isRecord(o.topic) || !isString(o.topic.slug) || !isString(o.topic.title)) {
    errors.push("topic { slug, title } is required")
  }
  for (const f of ["title", "intro"]) {
    if (!isString(o[f]) || o[f].trim().length === 0) errors.push(`${f} must be a non-empty string`)
  }

  if (!Array.isArray(o.objectives) || o.objectives.length < 1 || o.objectives.length > 6) {
    errors.push("objectives must be an array of 1..6")
  } else {
    o.objectives.forEach((ob, i) => {
      if (!isRecord(ob) || !isString(ob.text) || ob.text.trim().length === 0) {
        errors.push(`objectives[${i}] has no text`)
      } else if (!isString(ob.skill)) {
        errors.push(`objectives[${i}].skill is required`)
      }
    })
  }

  if (
    !Array.isArray(o.outline) ||
    o.outline.length < 2 ||
    o.outline.length > 6 ||
    !o.outline.every(
      (s) => isRecord(s) && isString(s.heading) && isStrArr(s.points) && s.points.length > 0,
    )
  ) {
    errors.push("outline must be an array of 2..6 sections with heading + points[]")
  }

  if (!Array.isArray(o.workedExamples) || o.workedExamples.length < 1) {
    errors.push("workedExamples must include at least one example")
  } else {
    o.workedExamples.forEach((ex, i) => {
      if (
        !isRecord(ex) ||
        !isString(ex.stem) ||
        !isString(ex.stemTex) ||
        !Array.isArray(ex.steps) ||
        ex.steps.length < 2 ||
        !isString(ex.finalAnswerTex)
      ) {
        errors.push(`workedExamples[${i}] needs stem, stemTex, >=2 steps, finalAnswerTex`)
        return
      }
      for (const s of ex.steps) {
        if (!isRecord(s) || !isString(s.tex)) {
          errors.push(`workedExamples[${i}] has a malformed step`)
          return
        }
      }
const exErrs = verifyWorkedExample(
        {
          stem: String(ex.stem),
          stemTex: String(ex.stemTex),
          steps: (ex.steps as { tex: string }[]).map((s) => ({ tex: s.tex })),
          finalAnswerTex: String(ex.finalAnswerTex),
        },
      )
      if (exErrs.length > 0) errors.push(...exErrs.map((e) => `workedExamples[${i}]: ${e}`))
    })
  }

  if (!Array.isArray(o.practice) || o.practice.length < 4 || o.practice.length > 12) {
    errors.push("practice must have 4..12 items")
  } else {
    assertUniqueIds(o.practice as { id: string }[], errors)
    ;(o.practice as unknown[]).forEach((p, i) => {
      if (!isRecord(p)) {
        errors.push(`practice[${i}] must be an object`)
        return
      }
      const kind = p.kind as string
      if (kind !== "solve" && kind !== "simplify" && kind !== "translate") {
        errors.push(`practice[${i}].kind must be solve|simplify|translate`)
      }
      if (!isString(p.init) && kind === "solve") errors.push(`practice[${i}] needs init`)
      if (kind === "solve" && !isStrRec(p.roots)) errors.push(`practice[${i}] needs roots`)
      if (kind === "simplify" && (!isString(p.target) || !isString(p.init))) {
        errors.push(`practice[${i}] needs init + target`)
      }
      if (!isHint(p.hint)) errors.push(`practice[${i}].hint needs l1,l2,l3`)
      if (!isRecord(p.solution) || !Array.isArray(p.solution.steps) || !isString(p.solution.answerTex)) {
        errors.push(`practice[${i}].solution needs steps[] + answerTex`)
      }
      if (isNum(p.difficulty) && (p.difficulty < 1 || p.difficulty > 3)) {
        errors.push(`practice[${i}].difficulty must be 1..3`)
      }
      if (kind === "solve") {
        const ok = verifyPracticeItem({
          kind: "solve" as const,
          init: p.init as string | undefined,
          roots: p.roots as Record<string, string[]> | undefined,
        })
        if (!ok) errors.push(`practice[${i}] roots do not satisfy the equation (engine re-check failed)`)
      } else if (kind === "simplify") {
        const ok = verifyPracticeItem({
          kind: "simplify" as const,
          init: p.init as string | undefined,
          target: p.target as string | undefined,
        })
        if (!ok) errors.push(`practice[${i}] target is not equivalent to init (engine re-check failed)`)
      }
    })
  }

  if (!Array.isArray(o.testItems) || o.testItems.length < 5 || o.testItems.length > 10) {
    errors.push("testItems must have 5..10 questions")
  } else {
    assertUniqueIds(o.testItems as { id: string }[], errors)
    ;(o.testItems as unknown[]).forEach((q, i) => {
      if (!isRecord(q)) {
        errors.push(`testItems[${i}] must be an object`)
        return
      }
      const kind = q.kind as string
      if (kind === "mc") {
        if (!Array.isArray(q.options) || q.options.length < 2 || !isNum(q.correctIndex)) {
          errors.push(`testItems[${i}] mc needs options[] + correctIndex`)
        } else if (
          !isNum(q.correctIndex) ||
          q.correctIndex < 0 ||
          q.correctIndex >= (q.options as unknown[]).length
        ) {
          errors.push(`testItems[${i}].correctIndex out of range`)
        }
        if (!isString(q.explanation)) errors.push(`testItems[${i}] needs an explanation`)
      } else if (kind === "short") {
        const sk = q.solveKind as string
        if (sk !== "solve" && sk !== "simplify" && sk !== "translate") {
          errors.push(`testItems[${i}] short needs solveKind solve|simplify|translate`)
        }
        if (!isString(q.answerTex)) errors.push(`testItems[${i}] needs answerTex`)
        if (!isString(q.explanation)) errors.push(`testItems[${i}] needs an explanation`)
        if (sk === "solve") {
          const ok = verifyPracticeItem({
            kind: "solve" as const,
            init: q.init as string | undefined,
            roots: q.roots as Record<string, string[]> | undefined,
          })
          if (!ok) errors.push(`testItems[${i}] short-answer math failed engine re-check`)
        } else if (sk === "simplify") {
          const ok = verifyPracticeItem({
            kind: "simplify" as const,
            init: q.init as string | undefined,
            target: q.target as string | undefined,
          })
          if (!ok) errors.push(`testItems[${i}] short-answer math failed engine re-check`)
        }
      } else {
        errors.push(`testItems[${i}].kind must be mc|short`)
      }
    })
  }

  if (!Array.isArray(o.diagrams)) errors.push("diagrams must be an array (may be empty)")

  if (!isNum(o.passMark) || o.passMark < 0.5 || o.passMark > 1) {
    warnings.push("passMark defaulted to 0.8 (must be 0.5..1)")
  }
  if (!isBool(o.calcAllowed)) {
    o.calcAllowed = false
    warnings.push("calcAllowed defaulted to false")
  }
  if (!isNum(o.waitMs) || o.waitMs < 6000 || o.waitMs > 60000) {
    o.waitMs = 12000
    warnings.push("waitMs defaulted to 12000")
  }

  if (warnings.length > 0 && errors.length === 0 && isRecord(input) && !isNum((input as Record<string, unknown>).passMark)) {
    ;(input as Record<string, unknown>).passMark = 0.8
  }

  if (errors.length > 0) return { lesson: null, errors, warnings }

  const lesson = input as unknown as GeneratedLesson
  if (!isNum(lesson.passMark)) lesson.passMark = 0.8
  if (!isBool(lesson.calcAllowed)) lesson.calcAllowed = false
  if (!isNum(lesson.waitMs)) lesson.waitMs = 12000
  if (lesson.sources === undefined) lesson.sources = []
  return { lesson, errors, warnings }
}

/** Verify a generated short-answer test targeting an equation. */
export function verifyShortTarget(target: string, stem: string): boolean {
  return verifySimplify(stem, target)
}