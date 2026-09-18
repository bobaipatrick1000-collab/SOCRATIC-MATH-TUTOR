"use client"

import { bandOf, type SkillMap, type WarmthBand } from "@/lib/skills/warmth"
import { catLabel } from "@/lib/content/labels"

const BAND_LABEL: Record<WarmthBand, string> = {
  mastered: "mastered",
  warm: "warm",
  shaky: "shaky",
  untried: "untried",
}

export function skillTitle(skill: string): string {
  return catLabel(skill)
}

function dots(warmth: number): WarmthBand[] {
  const n = Math.round(warmth * 5)
  const out: WarmthBand[] = []
  for (let i = 0; i < 5; i++) {
    if (i < n) out.push(warmth >= 0.7 ? "mastered" : "warm")
    else out.push("untried")
  }
  return out
}

export function SkillRow({ skill, map }: { skill: string; map: SkillMap }) {
  const s = map[skill]
  const band = bandOf(s)
  const warmth = s?.warmth ?? 0
  return (
    <div className="skill-row">
      <div className="skill-name">{skillTitle(skill)}</div>
      <div className="skill-dots">
        {dots(warmth).map((d, i) => (
          <span key={i} className={`skill-dot ${d}`} />
        ))}
      </div>
      <span className={`band-pill ${band}`}>{BAND_LABEL[band]}</span>
      <div className="skill-count">
        {s ? `${s.nInd} solved · ${s.nGuided} guided` : "not started"}
      </div>
    </div>
  )
}

export function SkillHeat({ map, skills }: { map: SkillMap; skills: string[] }) {
  return (
    <div>
      {skills.map((sk) => (
        <SkillRow key={sk} skill={sk} map={map} />
      ))}
    </div>
  )
}