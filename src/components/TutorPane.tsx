"use client"

import Link from "next/link"
import { Clock, Eraser, HelpCircle, LifeBuoy, PartyPopper, Sparkles, Undo2 } from "lucide-react"
import type { SessionState } from "@/lib/session/session"

function fmt(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

export function TutorPane({
  state,
  idleMs,
  durationMs,
  canHint,
  hintLevels,
  onHint,
  onStuck,
  onMoreTime,
  onDeleteLast,
  onTwin,
  topicHref,
}: {
  state: SessionState
  idleMs: number
  durationMs: number
  canHint: boolean
  hintLevels: number
  onHint: () => void
  onStuck: () => void
  onMoreTime: () => void
  onDeleteLast: () => void
  onTwin: () => void
  topicHref: string
}) {
  const done = state.status === "done"
  const visible = state.transcripts.slice(-4)

  return (
    <aside className="workspace-pane workspace-right">
      <h2 className="pane-h">
        <Sparkles size={13} /> Tutor
      </h2>

      {done ? (
        <div className="recap">
          <div className="tutor-quiet-head" style={{ fontSize: 15 }}>
            <PartyPopper size={16} className="gold-text" /> That is the whole problem.
          </div>
          <p style={{ color: "var(--muted)", margin: 0 }}>
            {state.item.kind === "simplify"
              ? "You reached the form the problem asked for, and every step in between held."
              : "You named every solution. Nothing contradicted you along the way."}
          </p>
          <div className="recap-rows">
            <div className="recap-stat">
              <b>{state.lines.length}</b>
              <span>lines</span>
            </div>
            <div className="recap-stat">
              <b>{state.hintsGiven}</b>
              <span>hints used</span>
            </div>
            <div className="recap-stat">
              <b>{durationMs / 1000 > 120 ? "long" : "quick"}</b>
              <span>pace</span>
            </div>
          </div>
          <div className="quote">
            “{state.hintsGiven === 0 ? "You carried it yourself." : "The hint opened a door — you walked through it."}”
          </div>
          <button className="btn btn-primary" onClick={onTwin}>
            <Sparkles size={15} /> Twin problem
          </button>
          <Link className="btn btn-quiet" href={topicHref}>
            Back to the topic
          </Link>
        </div>
      ) : (
        <>
          <div className="tutor-quiet">
            <div className="tutor-quiet-head">
              <span className="pulse-dot" /> Watching your work
            </div>
            {state.substantive ? (
              <span>Stay with it. I will not interrupt unless you ask, or go quiet for a long while.</span>
            ) : (
              <span>
                Write your first real line. I read every step you commit, and I stay silent while you think.
              </span>
            )}
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--faint)", fontSize: 12.5 }}>
              <Clock size={12} /> {idleMs > 0 ? `idle ${fmt(idleMs)}` : "just started"} · hint in{" "}
              {fmt(Math.max(0, state.hintStage > 0 ? 0 : idleMs))}
            </span>
          </div>

          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {visible.length === 0 ? (
              <div className="tutor-note-card" style={{ color: "var(--faint)" }}>
                Nothing to say yet. That is the point.
              </div>
            ) : (
              visible.map((t) => (
                <div
                  key={t.id}
                  className={`tutor-note-card ${
                    t.kind === "hint" ? "hint-card" : t.kind === "repair" ? "repair-card" : ""
                  }`}
                >
                  {t.kind === "hint" ? (
                    <b className="gold-text">Hint {t.level}/3 · </b>
                  ) : t.kind === "repair" ? (
                    <b style={{ color: "var(--warn)" }}>Hold on · </b>
                  ) : null}
                  {t.text}
                </div>
              ))
            )}
          </div>

          <div className="tutor-tools">
            <button className="btn btn-primary tutor-hint-btn" onClick={onHint} disabled={!canHint}>
              <HelpCircle size={15} /> Ask for a hint
            </button>
            <button className="btn" onClick={onStuck} title="I am stuck — start me at the first nudge">
              <LifeBuoy size={15} /> I&apos;m stuck
            </button>
            <button className="btn btn-quiet" onClick={onMoreTime} title="Give me more time before the tutor speaks up">
              <Clock size={15} /> More time
            </button>
            <button className="btn btn-quiet" onClick={onDeleteLast} disabled={state.lines.length === 0}>
              <Undo2 size={15} /> Back one line
            </button>
          </div>

          {!canHint && hintLevels < 3 ? (
            <div className="hint-lock">
              {state.hintStage >= 3
                ? "You have seen all three hints on this problem."
                : "Hints unlock once you have written a line of your own."}
            </div>
          ) : null}
          {state.moreTimeCount > 0 ? (
            <div className="hint-lock">
              <Eraser size={11} /> extra time granted ×{state.moreTimeCount}
            </div>
          ) : null}
        </>
      )}
    </aside>
  )
}