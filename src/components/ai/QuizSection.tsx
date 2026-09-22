"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, HelpCircle, ChevronDown, Trophy, RotateCcw, Lightbulb } from "lucide-react"
import type { GeneratedTestItem, TestOption } from "@/lib/ai/schema"
import { TeX } from "@/components/TeX"

export function QuizSection({
  items,
  passMark = 0.7,
}: {
  items: GeneratedTestItem[]
  passMark?: number
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => items.map(() => null))
  const [revealed, setRevealed] = useState(false)
  const [showHints, setShowHints] = useState<Record<number, boolean>>({})

  const answeredAll = answers.every((a) => a !== null)

  const correct = answers.reduce<number>((acc, a, i) => {
    if (a === null) return acc
    const q = items[i]
    if (q.kind === "mc") return acc + (a === q.correctIndex ? 1 : 0)
    return acc + (a === 0 ? 1 : 0)
  }, 0)

  const passed = revealed && correct / items.length >= passMark

  return (
    <div className="quiz-section">
      <div className="card quiz-card">
        <div className="quiz-item-head">
          <div className="quiz-meta">
            <span className="quiz-chip">{items.length} questions</span>
            <span className="quiz-chip">{Math.round(passMark * 100)}% to pass</span>
          </div>
          {!revealed ? (
            <button
              className={`btn btn-primary btn-sm ${answeredAll ? "" : "btn-disabled"}`}
              disabled={!answeredAll}
              onClick={() => {
                setRevealed(true)
                setShowHints({})
              }}
            >
              Check my answers
            </button>
          ) : (
            <div className={`quiz-grade ${passed ? "grade-pass" : "grade-fail"}`}>
              {passed ? (
                <>
                  <Trophy size={14} /> Passed
                </>
              ) : (
                <>
                  <XCircle size={14} /> Not yet — retry when ready
                </>
              )}
            </div>
          )}
        </div>
        <div className="quiz-stack">
          {items.map((q, i) => (
            <QuizStep
              key={q.id}
              q={q}
              i={i}
              revealed={revealed}
              answer={answers[i]}
              onAnswer={(j) => {
                if (revealed) return
                setAnswers((prev) => prev.map((a, k) => (k === i ? j : a)))
              }}
              showHints={showHints}
              setShowHints={setShowHints}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function QuizStep({
  q,
  i,
  revealed,
  answer,
  onAnswer,
  showHints,
  setShowHints,
}: {
  q: GeneratedTestItem
  i: number
  revealed: boolean
  answer: number | null
  onAnswer: (j: number) => void
  showHints: Record<number, boolean>
  setShowHints: (f: (h: Record<number, boolean>) => Record<number, boolean>) => void
}) {
  const isMC = q.kind === "mc"
  const isCorrect =
    revealed && answer !== null && (isMC ? answer === q.correctIndex : answer === 0)
  const isWrong = revealed && answer !== null && !isCorrect

  return (
    <div className={`card quiz-step ${isCorrect ? "quiz-right" : ""} ${isWrong ? "quiz-wrong" : ""}`}>
      <div className="quiz-step-head">
        <span className="quiz-n">Q{i + 1}</span>
        <div className="quiz-prompt">
          {q.prompt} {q.promptTex ? <TeX tex={q.promptTex} display={false} /> : null}
        </div>
      </div>

      {isMC ? (
        <div className="quiz-options">
          {q.options.map((o, j) => (
            <button
              key={j}
              disabled={revealed}
              className={`quiz-option ${answer === j ? "quiz-selected" : ""} ${
                revealed && j === q.correctIndex ? "quiz-right" : ""
              }`}
              onClick={() => onAnswer(j)}
            >
              <span className="quiz-key">{String.fromCharCode(65 + j)}</span>
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="quiz-input-row">
          <input
            className="math-input"
            disabled={revealed}
            value={answer === null ? "" : String(answer)}
            onChange={(e) => {
              if (revealed) return
              const v = e.target.value.trim()
              onAnswer(v === "" ? -1 : Number(v) || -2)
            }}
            placeholder="your answer, in math"
          />
          {!revealed ? (
            <button
              className="btn btn-quiet btn-sm"
              title="hint"
              onClick={() =>
                setShowHints((h) => ({ ...h, [i]: !h[i] }))
              }
            >
              <HelpCircle size={13} />
            </button>
          ) : null}
        </div>
      )}

      {showHints[i] && q.kind === "short" ? (
        <div className="quiz-hint">
          <HelpCircle size={13} /> {q.explanation.length > 0 ? q.explanation : "Show what you tried and we'll spot the move."}
        </div>
      ) : null}

      {revealed ? (
        <div className="quiz-explain">
          {isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          <span>
            {q.explanation}
          </span>
        </div>
      ) : null}
    </div>
  )
}
