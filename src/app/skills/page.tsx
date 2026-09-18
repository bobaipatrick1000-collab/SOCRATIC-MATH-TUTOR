"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Flame, Play, Plus, Repeat } from "lucide-react"
import { ITEMS, skillsTouched } from "@/lib/content/catalog"
import { loadSkills, type SkillMap } from "@/lib/skills/warmth"
import { SkillHeat } from "@/components/SkillPanel"

export default function SkillsPage() {
  const [map, setMap] = useState<SkillMap>({})
  useEffect(() => {
    const t = window.setTimeout(() => setMap(loadSkills()), 0)
    return () => window.clearTimeout(t)
  }, [])

  const skills = skillsTouched().sort((a, b) => {
    const sa = map[a]
    const sb = map[b]
    return (sb?.nInd ?? 0) - (sa?.nInd ?? 0)
  })

  const nextPractice = (skill: string) => {
    const found = ITEMS.find((i) => i.skill === skill)
    return found ?? ITEMS[0]
  }

  return (
    <div>
      <div className="title-bar">
        <div>
          <div className="eyebrow">skill warmth</div>
          <h1 className="display" style={{ fontSize: 34, margin: 0 }}>
            How warm are your skills?
          </h1>
          <p className="lead" style={{ marginTop: 8 }}>
            Every solved problem warms a skill; hints warm it a little less, and abandoned problems cool it. All of it
            lives in this browser, until accounts arrive.
          </p>
        </div>
      </div>

      <div className="section-title">
        <h2>Today&apos;s read</h2>
        <span>{skills.length} tracked skills</span>
      </div>
      <div className="card">
        <div className="skill-row" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="skill-name" style={{ color: "var(--faint)", fontWeight: 600 }}>skill</div>
          <div className="skill-dots" style={{ color: "var(--faint)", fontSize: 11.5 }}>warmth</div>
          <div />
          <div className="skill-count" style={{ color: "var(--faint)" }}>evidence</div>
        </div>
        <SkillHeat map={map} skills={skills} />
      </div>

      <div className="section-title">
        <h2>Warm one up</h2>
        <span>pick a skill, get a problem</span>
      </div>
      <div className="grid-2">
        {skills.slice(0, 8).map((sk) => {
          const s = map[sk]
          const pr = nextPractice(sk)
          return (
            <Link key={sk} className="card hoverable" href={`/workspace/${pr.id}?src=lesson`}>
              <div className="path-icon">
                <Flame size={17} />
              </div>
              <h4 style={{ margin: 0 }}>{sk}</h4>
              <div style={{ color: "var(--faint)", fontSize: 12.5, margin: "4px 0 10px" }}>
                {s ? `${s.nInd} independent · ${s.nGuided} guided · ${s.nInc} stalled` : "not started yet"}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <span className="btn btn-primary" style={{ padding: "7px 12px" }}>
                  <Play size={14} /> Practice
                </span>
                <span className="btn" style={{ padding: "7px 12px" }}>
                  <Repeat size={14} /> twin it
                </span>
              </div>
            </Link>
          )
        })}
        <Link className="card hoverable" href="/topics" style={{ borderStyle: "dashed" }}>
          <div className="path-icon">
            <Plus size={17} />
          </div>
          <h4 style={{ margin: 0 }}>Pick from the tree</h4>
          <div style={{ color: "var(--muted)", fontSize: 13.5 }}>Any problem you solve here will start tracking its skill.</div>
        </Link>
      </div>
    </div>
  )
}