export interface SkillState {
  skill: string
  warmth: number
  nInd: number
  nGuided: number
  nInc: number
  lastTs?: number
}

export type SkillMap = Record<string, SkillState>

export type WarmthBand = "untried" | "shaky" | "warm" | "mastered"

const DAY_MS = 86_400_000

export function bandOf(s: SkillState | undefined, now = Date.now()): WarmthBand {
  if (!s || s.nInd + s.nGuided + s.nInc === 0) return "untried"
  const age = Math.max(0, now - (s.lastTs ?? now))
  const decayed = s.warmth * Math.exp((-age * 0.35) / DAY_MS)
  if (decayed >= 0.7) return "mastered"
  if (decayed >= 0.4) return "warm"
  return "shaky"
}

export function emptySkill(skill: string): SkillState {
  return { skill, warmth: 0, nInd: 0, nGuided: 0, nInc: 0, lastTs: Date.now() }
}

export function recordOutcome(
  map: SkillMap,
  skill: string,
  outcome: "independent" | "guided" | "incomplete"
): SkillMap {
  const cur: SkillState = map[skill] ?? emptySkill(skill)
  const next: SkillState = { ...cur }
  if (outcome === "independent") {
    next.nInd += 1
    next.warmth = Math.min(1, cur.warmth + 0.45)
  } else if (outcome === "guided") {
    next.nGuided += 1
    next.warmth = Math.min(0.85, cur.warmth + 0.22)
  } else {
    next.nInc += 1
    next.warmth = Math.max(0, cur.warmth - 0.18)
  }
  next.lastTs = Date.now()
  return { ...map, [skill]: next }
}

export function heatColumns(map: SkillMap): { band: WarmthBand; count: number }[] {
  const all: WarmthBand[] = ["mastered", "warm", "shaky", "untried"]
  return all.map((band) => {
    let count = 0
    for (const s of Object.values(map)) {
      if (bandOf(s) === band) count++
    }
    return { band, count }
  })
}

const STORE_KEY = "aurea:skills:v1"

export function loadSkills(): SkillMap {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as SkillMap
  } catch {
    return {}
  }
}

export function saveSkills(map: SkillMap): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(map))
  } catch {
    void 0
  }
}