"use client"

import { useState } from "react"
import { Lightbulb, CheckCircle2, RotateCcw, Calculator, Gauge, Timer } from "lucide-react"
import type { GeneratedPracticeItem } from "@/lib/ai/schema"
import { TeX } from "@/components/TeX"

export function PracticeSection({ items, passMark }: { items: GeneratedPracticeItem[]; passMark: number }) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null)

  return (
    <div className="practice-section">
      <div className="practice-summary">
        {items.length} practice runs {items.length >= 6 ? "· modest rep" : "· light rep"}
        {passMark ? ` · aim for ${Math.round(passMark * 100)}%` : null}
      </div>
      <div className="practice-stack">
        {items.map((p) => (
          <PracticeCard key={p.id} p={p} open={open === p.id} onOpen={() => setOpen(open === p.id ? null : p.id)} />
        ))}
      </div>
    </div>
  )
}

function PracticeCard({ p, open, onOpen }: { p: GeneratedPracticeItem; open: boolean; onOpen: () => void }) {
  const [hint, setHint] = useState<0 | 1 | 2 | 3>(0)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)

  const ladder = [p.hint.l1, p.hint.l2, p.hint.l3]
  const grade = p.difficulty >= 3 ? "gold" : p.difficulty === 2 ? "" : "silver"

  return (
    <div className={`card practice-card ${open ? "is-open" : ""}`}>
      <button className="practice-card-head" onClick={onOpen}>
        <span className={`chip ${grade}`}>{pSkill(p.skill)}</span>
        <span className="practice-card-title">{p.title}</span>
        <span className="practice-card-toggle">{open ? "hide" : "work it"}</span>
      </button>

      {open ? (
        <div className="practice-card-body">
          {p.stemTex ? <TeX tex={p.stemTex} display={false} /> : <p className="practice-stem">{p.stem}</p>}

          {p.init ? (
            <div className="practice-state">
              <span className="practice-state-label">start</span>
              <TeX tex={p.init} display={false} />
            </div>
          ) : null}
          {p.target ? (
            <div className="practice-state">
              <span className="practice-state-label">target</span>
              <TeX tex={p.target} display={false} />
            </div>
          ) : null}

          <div className="practice-meta">
            {p.calcAllowed ? (
              <span className="meta-chip">
                <Calculator size={12} /> calc ok
              </span>
            ) : (
              <span className="meta-chip">no calc</span>
            )}
            <span className="meta-chip">
              <Gauge size={12} /> {["", "steady", "stretch"][p.difficulty]}
            </span>
            <span className="meta-chip">
              <Timer size={12} /> ~{Math.round(p.waitMs / 1000)}s
            </span>
          </div>

          <div className="pithint">
            {hint < 3 ? (
              <button className="btn btn-quiet btn-sm" onClick={() => setHint((h) => Math.min(3, h + 1))}>
                <Lightbulb size={13} /> hint {hint === 0 ? "?" : hint === 1 ? "2" : "3"}
              </button>
            ) : (
              <span className="pithint-all">
                <Lightbulb size={13} /> hints exhausted — try your last idea
              </span>
            )}
            {hint > 0 ? (
              <div className="pithint-reveal">
                {ladder.slice(0, hint).map((t, i) => (
                  <div key={i} className={`pithint-step l${i + 1}`}>
                    <strong>{["", "first thought", "nudge", "next move"][i + 1]}:</strong> {t}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="practice-actions" style={{ marginTop: 16 }}>
            {!revealed ? (
              <button className="btn btn-primary btn-sm" onClick={() => setRevealed(true)}>
                Reveal the method
              </button>
            ) : null}
            {done ? <span className="practice-done">Nice — same idea, many places</span> : null}
          </div>

          {revealed ? (
            <div className="card practice-solution" style={{ marginTop: 12 }}>
              <ol className="solution-steps">
                {p.solution.steps.map((s, i) => (
                  <li key={i}>
                    <TeX tex={s.tex} display={false} />
                    {s.note ? <span className="solution-note">{s.note}</span> : null}
                  </li>
                ))}
              </ol>
              <div className="solution-answer">
                <CheckCircle2 size={15} /> <TeX tex={p.solution.answerTex} display={false} />
              </div>
            </div>
          ) : null}

          {p.alt ? <p className="practice-alt">alternate: {p.alt}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

function pSkill(s: string): string {
  return s
    .split("-")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ")
}
