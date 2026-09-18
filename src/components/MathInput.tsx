"use client"

import { useMemo, useRef, useState } from "react"
import { Check, CornerDownLeft } from "lucide-react"
import { parse } from "@/lib/math/ast"
import { toLatex } from "@/lib/math/format"
import { TeX } from "./TeX"

const PALETTE: { label: string; insert: string }[] = [
  { label: "x", insert: "x" },
  { label: "y", insert: "y" },
  { label: "x²", insert: "x^2" },
  { label: "√", insert: "sqrt(" },
  { label: "a/b", insert: "(..)/(..)" },
  { label: "( )", insert: "(..)" },
  { label: "π", insert: "pi" },
  { label: "=", insert: "=" },
  { label: "+", insert: "+" },
  { label: "−", insert: "-(..)" },
]

export function MathInput({
  value,
  onChange,
  onCommit,
  placeholder,
  disabled,
  autofocus,
  prompt,
}: {
  value: string
  onChange: (v: string) => void
  onCommit: (v: string) => void
  placeholder?: string
  disabled?: boolean
  autofocus?: boolean
  prompt?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [caret, setCaret] = useState<number | null>(null)
  const empty = value.trim() === ""

  const parsed = useMemo(() => {
    if (empty) return null
    try {
      const m = parse(value.replace(/\s/g, ""))
      return { ok: true as const, latex: toLatex(m) }
    } catch {
      return { ok: false as const, latex: value }
    }
  }, [value, empty])

  const insert = (token: string) => {
    const el = ref.current
    const start = el?.selectionStart ?? caret ?? value.length
    const end = el?.selectionEnd ?? start
    const sel = value.slice(start, end)
    const body = sel || "x"
    let text: string
    if (token === "(..)/(..)") {
      const b = sel || "1"
      text = `${b}/${b}`
    } else if (token.includes("..")) {
      text = token.replace("..", body)
    } else {
      text = token
    }
    const next = value.slice(0, start) + text + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      const pos = start + text.length
      if (el) {
        el.focus()
        el.setSelectionRange(pos, pos)
      }
      setCaret(pos)
    })
  }

  return (
    <div className="math-input">
      <div className={`preview${empty ? " empty" : parsed && !parsed.ok ? " raw-warn" : ""}`}>
        {empty ? (
          placeholder ?? "Type a line…"
        ) : parsed && parsed.ok ? (
          <TeX tex={parsed.latex} display={false} />
        ) : (
          value
        )}
      </div>
      <input
        ref={ref}
        className="editor-line"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setCaret(e.target.selectionStart)
        }}
        onKeyUp={(e) => setCaret((e.target as HTMLInputElement).selectionStart)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            const v = value.replace(/\s/g, "")
            if (v) onCommit(v)
          }
        }}
        placeholder="Enter your next line"
        disabled={disabled}
        autoFocus={autofocus}
        spellCheck={false}
      />
      <div className="palette" role="toolbar" aria-label="Expression palette">
        {PALETTE.map((p) => (
          <button key={p.label} type="button" onClick={() => insert(p.insert)} title={p.insert}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="editor-actions">
        <span className="editor-hint">Palette inserts at the cursor</span>
        <button
          className="btn btn-primary"
          disabled={disabled || empty}
          onClick={() => {
            const v = value.replace(/\s/g, "")
            if (v) onCommit(v)
          }}
        >
          <Check size={15} />
          Commit
        </button>
        <span className="editor-hint" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
          <CornerDownLeft size={13} /> Enter
        </span>
      </div>
      {prompt ? (
        <div className="line-note-text" style={{ padding: "0 14px 12px" }}>
          {prompt}
        </div>
      ) : null}
    </div>
  )
}