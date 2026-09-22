"use client"

import { toRatMap } from "@/lib/ai/answerCheck"
import {
  parseToLine,
  verifyLine,
  type ItemGoal,
  type LineStatus,
  type ParsedLine,
} from "@/lib/math/verify"

export interface SocraticItem {
  kind: "solve" | "simplify" | "translate"
  init?: string
  target?: string
  roots?: Record<string, string[]>
}

export interface LineDecision {
  accepted: boolean
  goalReached: boolean
  status: LineStatus
  latex?: string
  errorKey?: string
  latencyMs: number
}

function goalFor(item: SocraticItem): ItemGoal {
  const goal: ItemGoal = { kind: item.kind }
  if ((item.kind === "solve" || item.kind === "translate") && item.roots) {
    const roots = toRatMap(item.roots)
    if (roots) goal.roots = roots
  }
  if (item.kind === "simplify" && item.target) {
    const t = parseToLine(item.target)
    if (t) goal.target = t.model
  }
  if (item.kind === "translate" && item.target) {
    const t = parseToLine(item.target)
    if (t) goal.translateEquation = t.model
  }
  return goal
}

/**
 * Check one committed student line against the real CAS (verifyLine).
 *
 * Accepts multiple valid methods by construction: verifyLine marks any line
 * the symbolic engine proves algebraically equivalent to the previous line as
 * `verified`, and marks a line that reaches the goal (root match / target
 * polynomial match) as `complete`. No single solution path is hard-coded.
 *
 * Latency: pure in-process math, no network, no LLM.
 */
export function checkLine(
  item: SocraticItem,
  prevSource: string | undefined,
  input: string
): LineDecision {
  const t0 = performance.now()
  const goal = goalFor(item)
  let prev: ParsedLine | undefined
  if (prevSource) prev = parseToLine(prevSource) ?? undefined
  const res = verifyLine(input, { goal, prev })
  const status = res.status
  const accepted = status === "verified" || status === "complete"
  return {
    accepted,
    goalReached: status === "complete",
    status,
    latex: res.line?.latex,
    errorKey: res.errorKey,
    latencyMs: performance.now() - t0,
  }
}

/**
 * Stateful Socratic engine: one problem, one line at a time.
 *
 * Official step list holds only engine-accepted lines (the student's transcript).
 * Rejected lines go to misLog — internal bookkeeping for Phase-2 stuck detection,
 * never rendered, never flagged to the student.
 */
export class SocraticEngine {
  readonly item: SocraticItem
  readonly steps: string[] = []
  readonly misLog: string[] = []
  private prev: string | undefined

  constructor(item: SocraticItem) {
    this.item = item
    this.prev = item.init
  }

  get init(): string | undefined {
    return this.item.init
  }

  get done(): boolean {
    return this.steps.length > 0 && checkFinal(this.item, this.steps[this.steps.length - 1]!).accepted
  }

  submit(input: string): LineDecision {
    const source = input.replace(/\s+/g, "")
    if (!source) {
      return { accepted: false, goalReached: false, status: "unreadable", latencyMs: 0 }
    }
    const decision = checkLine(this.item, this.prev, source)
    if (decision.accepted) {
      this.steps.push(source)
      this.prev = source
    } else {
      this.misLog.push(source)
    }
    return decision
  }
}

function checkFinal(item: SocraticItem, last: string): LineDecision {
  const goal = goalFor(item)
  const res = verifyLine(last, { goal })
  return {
    accepted: res.status === "complete",
    goalReached: res.status === "complete",
    status: res.status,
    latencyMs: 0,
  }
}
