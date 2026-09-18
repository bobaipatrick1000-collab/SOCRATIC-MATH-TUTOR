"use client"

import { useCallback, useEffect, useState } from "react"
import type { ContentItem } from "../content/catalog"
import type { Twin } from "../content/twin"
import type { ItemGoal, LineStatus, MisKey, MoveTag } from "../math/verify"
import { buildGoalFromTwin } from "../tutor/policy"

export type SessionStatus = "active" | "done"

export interface CommittedLine {
  id: string
  source: string
  latex: string
  status: LineStatus
  moveTag?: MoveTag
  errorKey?: MisKey
  rootClaimed?: { var: string; value: string }
  note?: string
  t: number
}

export interface TutorNote {
  id: string
  kind: "hint" | "repair" | "stuck" | "done" | "note"
  level?: 1 | 2 | 3
  text: string
  t: number
  seen: boolean
}

export interface WorkspaceItem {
  kind: "solve" | "simplify" | "translate"
  title: string
  stem: string
  stemTex?: string
  skill: string
  sourceId: string
  alt: string
}

export interface SessionState {
  key: string
  item: WorkspaceItem
  rootsAsStrings?: Record<string, string[]>
  init?: string
  target?: string
  lines: CommittedLine[]
  scratch: CommittedLine[]
  hintStage: number
  hintsGiven: number
  claimedRoots: string[]
  status: SessionStatus
  startedAt: number
  endedAt?: number
  lastActionAt: number
  substantive: boolean
  errorStreak: number
  repeatWindow: string[]
  transcripts: TutorNote[]
  p: number
  moreTimeCount: number
  twinCount: number
  origin: string
  job: "solving" | "justify"
  rule: number
}

type Action =
  | { type: "commit"; line: CommittedLine; key: string }
  | { type: "hint"; level: 1 | 2 | 3; text: string }
  | { type: "repair"; key: MisKey }
  | { type: "stuck"; text: string }
  | { type: "more-time" }
  | { type: "mark-seen"; id: string }
  | { type: "complete" }
  | { type: "switch-job"; job: SessionState["job"] }
  | { type: "delete-last" }
  | { type: "scratch-add"; line: CommittedLine }
  | { type: "scratch-delete"; id: string }
  | { type: "clear-errors" }
  | { type: "restart"; state: SessionState }

let nid = 0
function nextId(): string {
  nid += 1
  return `n${nid}-${Date.now().toString(36)}`
}

export function createState(
  key: string,
  item: WorkspaceItem,
  seed: { roots?: Record<string, string[]>; init?: string; target?: string; origin?: string }
): SessionState {
  return {
    key,
    item,
    rootsAsStrings: seed.roots,
    init: seed.init,
    target: seed.target,
    lines: [],
    scratch: [],
    hintStage: 0,
    hintsGiven: 0,
    claimedRoots: [],
    status: "active",
    startedAt: Date.now(),
    lastActionAt: Date.now(),
    substantive: false,
    errorStreak: 0,
    repeatWindow: [],
    transcripts: [],
    p: 1,
    moreTimeCount: 0,
    twinCount: 0,
    origin: seed.origin ?? "practice",
    job: "solving",
    rule: Date.now(),
  }
}

export function goalOf(state: SessionState): ItemGoal {
  return buildGoalFromTwin({
    kind: state.item.kind,
    roots: state.rootsAsStrings,
    init: state.init,
    target: state.target,
  })
}

export function allRootsClaimed(state: SessionState): boolean {
  const need = state.rootsAsStrings ?? {}
  for (const [v, vals] of Object.entries(need)) {
    for (const val of vals) {
      if (!state.claimedRoots.includes(`${v}:${val}`)) return false
    }
  }
  if (Object.keys(need).length > 0) return true
  return state.item.kind === "simplify"
}

function hintExists(state: SessionState, needle: string): boolean {
  return state.transcripts.some(
    (t) => (t.kind === "hint" || t.kind === "repair" || t.kind === "stuck") && t.text === needle
  )
}

export function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "commit": {
      const hadSubstantive = state.substantive
      const substantive =
        action.line.status === "verified" ||
        action.line.status === "complete" ||
        action.line.status === "note"
      const errorStreak = action.line.status === "invalid" ? state.errorStreak + 1 : 0
      const window = [...state.repeatWindow, action.key].slice(-8)
      const claimed = [...state.claimedRoots]
      if (action.line.rootClaimed) {
        const ck = `${action.line.rootClaimed.var}:${action.line.rootClaimed.value}`
        if (!claimed.includes(ck)) claimed.push(ck)
      }
      const all = allRootsClaimed({ ...state, claimedRoots: claimed })
      const done = state.item.kind === "simplify"
        ? action.line.status === "complete"
        : all
      const notes = [...state.transcripts]
      if (!hadSubstantive && substantive) {
        notes.push({ id: nextId(), kind: "note", text: "Your first real mark. I'll watch quietly.", t: Date.now(), seen: false })
      }
      const TWO_ERRORS = "Two misses on this line. Back up one step — what single move comes next?"
      const stalledNudge =
        errorStreak >= 2 && !hintExists(state, TWO_ERRORS) && state.hintStage === 0
          ? [
              {
                id: nextId(),
                kind: "hint" as const,
                level: 1 as const,
                text: TWO_ERRORS,
                t: Date.now(),
                seen: false,
              },
            ]
          : []
      const finalNotes = [...notes, ...stalledNudge]
      return {
        ...state,
        lines: [...state.lines, action.line],
        lastActionAt: Date.now(),
        substantive: hadSubstantive || substantive,
        errorStreak,
        repeatWindow: window,
        claimedRoots: claimed,
        transcripts: finalNotes,
        p: action.line.status === "verified" ? Math.max(0.5, state.p - 0.05) : state.p,
        status: done ? "done" : state.status,
        endedAt: done ? Date.now() : state.endedAt,
      }
    }
    case "hint": {
      const runaway = state.hintStage >= 3
      if (runaway) return state
      return {
        ...state,
        hintStage: Math.min(3, state.hintStage + 1),
        hintsGiven: state.hintsGiven + 1,
        transcripts: [
          ...state.transcripts,
          { id: nextId(), kind: "hint", level: action.level, text: action.text, t: Date.now(), seen: false },
        ],
        lastActionAt: Date.now(),
      }
    }
    case "repair": {
      return {
        ...state,
        transcripts: [
          ...state.transcripts,
          { id: nextId(), kind: "repair", text: action.key, t: Date.now(), seen: false },
        ],
        lastActionAt: Date.now(),
      }
    }
    case "stuck": {
      if (hintExists(state, action.text)) return state
      return {
        ...state,
        transcripts: [
          ...state.transcripts,
          { id: nextId(), kind: "stuck", level: 1, text: action.text, t: Date.now(), seen: false },
        ],
        lastActionAt: Date.now(),
      }
    }
    case "more-time": {
      return {
        ...state,
        p: Math.min(3.2, state.p + 0.4),
        moreTimeCount: state.moreTimeCount + 1,
      }
    }
    case "mark-seen": {
      return {
        ...state,
        transcripts: state.transcripts.map((t) => (t.id === action.id ? { ...t, seen: true } : t)),
      }
    }
    case "complete": {
      return { ...state, status: "done", endedAt: Date.now(), lastActionAt: Date.now() }
    }
    case "switch-job": {
      return { ...state, job: action.job, transcripts: state.transcripts.filter((t) => t.kind !== "done") }
    }
    case "delete-last": {
      if (state.lines.length === 0) return state
      return {
        ...state,
        lines: state.lines.slice(0, -1),
        lastActionAt: Date.now(),
        errorStreak: 0,
      }
    }
    case "scratch-add": {
      return { ...state, scratch: [...state.scratch, action.line] }
    }
    case "scratch-delete": {
      return { ...state, scratch: state.scratch.filter((l) => l.id !== action.id) }
    }
    case "clear-errors": {
      return { ...state, errorStreak: 0 }
    }
    case "restart": {
      return action.state
    }
  }
}

export function waitMsOf(state: SessionState, baseWait: number): number {
  const raw = baseWait * state.p
  return Math.round(Math.min(45000, Math.max(6000, raw)))
}

function storageKey(key: string): string {
  return `aurea:session:${key}`
}

export function persist(state: SessionState): void {
  try {
    localStorage.setItem(storageKey(state.key), JSON.stringify(state))
  } catch {
    void 0
  }
}

export function hydrate(key: string): SessionState | null {
  try {
    const raw = localStorage.getItem(storageKey(key))
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionState
    if (parsed.status !== "active") return null
    return parsed
  } catch {
    return null
  }
}

export function wipeSession(key: string): void {
  try {
    localStorage.removeItem(storageKey(key))
  } catch {
    void 0
  }
}

export function itemOfContent(item: ContentItem): WorkspaceItem {
  return {
    kind: item.kind,
    title: item.title,
    stem: item.stem,
    stemTex: item.stemTex,
    skill: item.skill,
    sourceId: item.sourceId,
    alt: item.alt,
  }
}

export function itemOfTwin(twin: Twin): WorkspaceItem {
  return {
    kind: twin.kind,
    title: "Twin problem",
    stem: twin.stem,
    stemTex: twin.stemTex,
    skill: "derived",
    sourceId: "twin",
    alt: "A freshly generated twin of the pattern you just solved.",
  }
}

export function useSession(
  key: string,
  item: WorkspaceItem,
  seed: { roots?: Record<string, string[]>; init?: string; target?: string; origin?: string }
): [SessionState, (a: Action) => void] {
  const [state, setState] = useState<SessionState>(() => initFor(key, item, seed))
  const [loadedKey, setLoadedKey] = useState(key)
  if (loadedKey !== key) {
    setLoadedKey(key)
    setState(initFor(key, item, seed))
  }

  useEffect(() => {
    persist(state)
  }, [state])

  const dispatch = useCallback((a: Action) => {
    setState((s) => reducer(s, a))
  }, [])

  return [state, dispatch]
}

function initFor(
  key: string,
  item: WorkspaceItem,
  seed: { roots?: Record<string, string[]>; init?: string; target?: string; origin?: string }
): SessionState {
  const existing = hydrate(key)
  if (existing && existing.item.title === item.title) {
    return existing
  }
  return createState(key, item, seed)
}