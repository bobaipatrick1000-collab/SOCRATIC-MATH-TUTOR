"use client"

import { Quote } from "lucide-react"
import type { Lesson } from "@/lib/content/catalog"
import { TeX } from "./TeX"

const BLOCK_H: Record<string, string> = {
  def: "Definition",
  why: "Why it works",
  note: "Note",
  steps: "The steps",
  tip: "Tip",
}

export function LessonPanel({ lesson }: { lesson: Lesson }) {
  return (
    <section>
      <div className="section-title">
        <h2>Lesson</h2>
        <span>{lesson.goal}</span>
      </div>
      <div className="lesson-blocks">
        {lesson.blocks.map((b, i) => (
          <div key={i} className="card block-card block">
            <div className="eyebrow">{BLOCK_H[b.t] ?? b.t}</div>
            <div className="block-text">
              <p>{b.text}</p>
              {b.tex ? (
                <div style={{ padding: "6px 0" }}>
                  <TeX tex={b.tex} />
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {lesson.workedPattern ? (
          <div className="card" style={{ borderColor: "color-mix(in srgb, var(--gold) 35%, var(--line))" }}>
            <div className="eyebrow">worked example</div>
            <h4 style={{ margin: "8px 0 12px", fontFamily: "var(--font-display)" }}>
              <TeX tex={lesson.workedPattern.stem} display={false} />
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lesson.workedPattern.steps.map((s, i) => {
                const hidden = i === lesson.workedPattern!.fillStep
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "baseline",
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: hidden ? "var(--gold-soft)" : "var(--bg-soft)",
                      border: hidden ? "1px dashed color-mix(in srgb, var(--gold) 55%, transparent)" : "1px solid var(--line)",
                    }}
                  >
                    <span style={{ color: "var(--faint)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                    <span style={{ flex: 1 }}>
                      {hidden ? (
                        <TeX tex={s.replace(/\[hide\]/, "")} display={false} />
                      ) : s.startsWith("[hide]") ? (
                        <TeX tex={s.slice(6)} display={false} />
                      ) : (
                        s.includes("  (") ? (
                          <span>
                            <TeX tex={s.split("  (")[0]} display={false} />
                            <span style={{ color: "var(--muted)", fontSize: 13 }}> ({s.split("  (")[1].slice(0, -1)})</span>
                          </span>
                        ) : (
                          <TeX tex={s} display={false} />
                        )
                      )}
                    </span>
                    {hidden ? <span className="low-conf">you fill</span> : null}
                  </div>
                )
              })}
            </div>
            <div className="line-note-text" style={{ marginTop: 10 }}>
              Cover <b>step {lesson.workedPattern.fillStep + 1}</b> and see if the pattern holds.
            </div>
          </div>
        ) : null}

        {lesson.prerequisites.length > 0 ? (
          <div className="quote">
            <Quote size={14} style={{ marginRight: 6, display: "inline" }} />
            Requires a little: {lesson.prerequisites.join(", ")}.
          </div>
        ) : null}
      </div>
    </section>
  )
}