"use client"

import { Trash2 } from "lucide-react"
import type { CommittedLine } from "@/lib/session/session"
import { TeX } from "./TeX"

const MOVE_LABEL: Record<string, string> = {
  expand: "expanded",
  factor: "factored",
  combine: "combined",
  "move-term": "moved term",
  "add-sub-both-sides": "both sides",
  "mult-div-both-sides": "both sides",
  "square-both-sides": "squared both sides",
  "square-root-both-sides": "rooted both sides",
  rewrite: "rewritten",
}

function railClass(status: CommittedLine["status"]): string {
  switch (status) {
    case "verified":
      return "ok"
    case "complete":
      return "gold"
    case "invalid":
      return "err"
    case "note":
      return "warn"
    case "duplicate":
      return "off"
    default:
      return "off"
  }
}

export function LineItem({
  line,
  index,
  onDelete,
}: {
  line: CommittedLine
  index: number
  onDelete?: () => void
}) {
  return (
    <div className="line-item">
      <div className="line-no">{index + 1}</div>
      <div className="line-body">
        <TeX tex={line.latex || line.source} display={false} />
        {line.note ? <div className="line-note-text">{line.note}</div> : null}
      </div>
      <div className="line-rail">
        {line.moveTag ? <span className="line-tag">{MOVE_LABEL[line.moveTag] ?? line.moveTag}</span> : null}
        <span className={`rail-dot ${railClass(line.status)}`} title={line.status} />
        {onDelete ? (
          <button className="icon-btn line-del" onClick={onDelete} title="Delete this line" aria-label="Delete line">
            <Trash2 size={13} />
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function ScratchLine({ line }: { line: CommittedLine }) {
  return (
    <div className="line-item">
      <div className="line-no">·</div>
      <div className="line-body">
        <TeX tex={line.latex || line.source} display={false} />
      </div>
      <span className="line-tag">scratch</span>
    </div>
  )
}