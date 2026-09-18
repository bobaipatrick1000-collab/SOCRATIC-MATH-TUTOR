import { parse, type Model } from "../math/ast"
import { rat, type Rat } from "../math/rational"
import type { ItemGoal } from "../math/verify"
import type { ContentItem } from "../content/catalog"

export const MIN_WAIT = 6000
export const MAX_WAIT = 45000

export function computeWaitMs(base: number, p: number): number {
  const raw = base * p
  return Math.round(Math.min(MAX_WAIT, Math.max(MIN_WAIT, raw)))
}

export function adjustMultiplier(p: number, event: "correct" | "circling" | "more-time"): number {
  switch (event) {
    case "correct":
      return Math.max(0.5, p - 0.15)
    case "circling":
      return Math.min(2.5, p + 0.15)
    case "more-time":
      return Math.min(3.2, p + 0.35)
  }
}

export function buildGoal(item: ContentItem): ItemGoal {
  const goal: ItemGoal = { kind: item.kind }
  if (item.roots) {
    goal.roots = {}
    for (const [v, arr] of Object.entries(item.roots)) {
      goal.roots[v] = arr.map((s) => rat(s))
    }
  }
  if (item.target) {
    try {
      goal.target = parse(item.target.replace(/\s/g, ""))
    } catch {
      goal.target = undefined
    }
  }
  if (item.init && (item.kind === "solve" || item.kind === "translate")) {
    try {
      goal.translateEquation = parse(item.init.replace(/\s/g, ""))
    } catch {
      goal.translateEquation = undefined
    }
  }
  return goal
}

export function buildGoalFromTwin(twin: {
  kind: "solve" | "simplify" | "translate"
  init?: string
  target?: string
  roots?: Record<string, string[]>
}): ItemGoal {
  const goal: ItemGoal = { kind: twin.kind }
  if (twin.roots) {
    goal.roots = {}
    for (const [v, arr] of Object.entries(twin.roots)) {
      goal.roots[v] = arr.map((s) => rat(s))
    }
  }
  if (twin.target) {
    try {
      goal.target = parse(twin.target.replace(/\s/g, ""))
    } catch {
      goal.target = undefined
    }
  }
  if (twin.init && (twin.kind === "solve" || twin.kind === "translate")) {
    try {
      goal.translateEquation = parse(twin.init.replace(/\s/g, ""))
    } catch {
      goal.translateEquation = undefined
    }
  }
  return goal
}

export function rootFromRat(r: Rat): string {
  if (r.d === 1n) return r.n.toString()
  return `${r.n}/${r.d}`
}

export function isIdentity(model: Model): boolean {
  return model.k === "expr"
}

export type UserState = "idle" | "active" | "stalled" | "off-task"

export function classifyUser(
  idleMs: number,
  waitMs: number,
  committed: boolean
): UserState {
  if (idleMs >= waitMs * 3) return "off-task"
  if (idleMs >= waitMs && !committed) return "stalled"
  return "active"
}