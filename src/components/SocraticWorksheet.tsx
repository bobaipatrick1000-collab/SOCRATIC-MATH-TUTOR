"use client"

import { useMemo, useRef, useState } from "react"
import { NotebookPen } from "lucide-react"
import { MathInput } from "@/components/MathInput"
import { TeX } from "@/components/TeX"
import { SocraticEngine, type SocraticItem } from "@/lib/ai/socraticCheck"

interface StepRow {
  id: string
  source: string
  latex: string
}

let stepNonce = 0
function stepId(): string {
  stepNonce++
  return `s${stepNonce}-${Date.now().toString(36)}`
}

export function SocraticWorksheet({
  item,
  title,
  stemTex,
  stem,
}: {
  item: SocraticItem
  title: string
  stemTex?: string
  stem: string
}) {
  const engineRef = useRef<SocraticEngine | null>(null)
  if (!engineRef.current) engineRef.current = new SocraticEngine(item)
  const engine = engineRef.current

  const [draft, setDraft] = useState("")
  const [steps, setSteps] = useState<StepRow[]>([])
  const [scratch, setScratch] = useState("")
  const [misTally, setMisTally] = useState(0)
  const [lastLatency, setLastLatency] = useState<number | null>(null)

  const commit = (raw: string) => {
    const decision = engine.submit(raw)
    setLastLatency(decision.latencyMs)
    if (decision.accepted) {
      setSteps((prev) => [
        ...prev,
        { id: stepId(), source: raw, latex: decision.latex ?? raw },
      ])
      setDraft("")
    } else {
      setMisTally(engine.misLog.length)
      setDraft("")
    }
  }

  const cleared = draft.trim() === ""

  const problemHeader = useMemo(
    () =>
      stemTex ? (
        <TeX tex={stemTex} display={false} />
      ) : (
        <p className="practice-stem">{stem}</p>
      ),
    [stemTex, stem]
  )

  return (
    <div className="card socratic-worksheet" style={{ padding: 18 }}>
      <h2 className="display" style={{ fontSize: 18, margin: "0 0 6px" }}>
        {title}
      </h2>
      <div className="stem socratic-stem" style={{ marginBottom: 10 }}>
        {problemHeader}
      </div>

      <div className="lines-pane socratic-steps" style={{ marginBottom: 10 }}>
        {steps.length === 0 ? (
          <div className="empty-state">
            <div className="big">✍</div>
            The board is empty. Write a first line from the problem.
          </div>
        ) : (
          steps.map((l, i) => (
            <div key={l.id} className="socratic-step">
              <span className="step-no">{i + 1}.</span>
              <TeX tex={l.latex} display={false} />
            </div>
          ))
        )}
      </div>

      <div className="editor-wrap">
        <MathInput
          value={draft}
          onChange={setDraft}
          onCommit={commit}
          autofocus={steps.length === 0}
          placeholder="Enter your next line"
        />
      </div>

      <div className="socratic-quiet-note" style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>
        {engine.done
          ? "Solved — every kept line verified equivalent."
          : lastLatency !== null
            ? `last check ${lastLatency < 1 ? "<1" : lastLatency.toFixed(1)} ms — quiet pass, nothing flagged.`
            : "wrong or unstable lines are never flagged here."}
        {engine.done && lastLatency !== null ? ` · last check ${lastLatency.toFixed(2)} ms` : null}
      </div>

      <div className="scratch-pad" style={{ marginTop: 14, borderTop: "1px dashed var(--line)", paddingTop: 10 }}>
        <div className="scratch-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <NotebookPen size={14} /> Scratch pad
          <span style={{ fontWeight: 400, opacity: 0.55 }}>(not part of your steps)</span>
        </div>
        <textarea
          className="scratch-box"
          value={scratch}
          onChange={(e) => setScratch(e.target.value)}
          placeholder="Scratch work, jottings, hunches — never checked, never added to your official steps."
          rows={4}
          spellCheck={false}
        />
      </div>
    </div>
  )
}