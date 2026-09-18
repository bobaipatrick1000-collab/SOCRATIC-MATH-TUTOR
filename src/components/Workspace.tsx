"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import {
  itemById,
  topicBySlug,
  type ContentItem,
  type HintLadder,
  type ItemKind,
} from "@/lib/content/catalog"
import { buildTwin } from "@/lib/content/twin"
import {
  parseToLine,
  verifyLine,
  lineHasProducts,
  checkJustification,
} from "@/lib/math/verify"
import { safeHint } from "@/lib/tutor/guard"
import { rootFromRat } from "@/lib/tutor/policy"
import {
  itemOfContent,
  itemOfTwin,
  useSession,
  type CommittedLine,
  type SessionState,
  type WorkspaceItem,
} from "@/lib/session/session"
import { loadSkills, recordOutcome, saveSkills } from "@/lib/skills/warmth"
import { TopicTree } from "./TopicTree"
import { LineItem, ScratchLine } from "./LineItem"
import { MathInput } from "./MathInput"
import { TutorPane } from "./TutorPane"
import { TeX } from "./TeX"

let lineNonce = 0
function lineId(): string {
  lineNonce++
  return `l${lineNonce}-${Date.now().toString(36)}`
}

interface Run {
  key: string
  isTwin: boolean
  origin: ContentItem
  item: WorkspaceItem
  sourceId: string
  seed: { roots?: Record<string, string[]>; init?: string; target?: string; origin?: string }
  baseWait: number
  ladder: HintLadder
}

function makeRun(itemId: string, origin: string, nonce: number): Run | null {
  const item = itemById(itemId)
  if (!item) return null
  return {
    key: `${item.id}:${nonce}`,
    isTwin: false,
    origin: item,
    item: itemOfContent(item),
    sourceId: item.id,
    seed: { roots: item.roots, init: item.init, target: item.target, origin },
    baseWait: item.waitMs,
    ladder: item.hint,
  }
}

function makeTwinRun(src: ContentItem, nonce: number): Run | null {
  const twin = buildTwin(src.tpl, Date.now() + nonce * 1013, new Set())
  if (!twin) return null
  return {
    key: `${src.id}:${nonce}`,
    isTwin: true,
    origin: src,
    item: itemOfTwin(twin),
    sourceId: src.id,
    seed: { roots: twin.roots, init: twin.init, target: twin.target, origin: "twin" },
    baseWait: src.waitMs,
    ladder: twin.hint,
  }
}

function leakTokens(s: SessionState): string[] {
  const out: string[] = []
  for (const [v, vals] of Object.entries(s.rootsAsStrings ?? {})) {
    for (const val of vals) out.push(`${v} = ${val}`, `${v}=${val}`)
  }
  return out
}

function waitMsOf(s: SessionState, base: number): number {
  const raw = base * s.p
  return Math.round(Math.min(45000, Math.max(6000, raw)))
}

function needsCheck(kind: ItemKind): boolean {
  return kind === "solve" || kind === "translate"
}

export function Workspace({
  itemId,
  origin = "practice",
  initialNonce = 0,
}: {
  itemId: string
  origin?: string
  initialNonce?: number
}) {
  const router = useRouter()
  const [run, setRun] = useState<Run | null>(() => makeRun(itemId, origin, initialNonce))
  const [draft, setDraft] = useState("")
  const [justError, setJustError] = useState<string | null>(null)
  const [justified, setJustified] = useState(false)
  const [now, setNow] = useState(0)
  const stalledRef = useRef(false)
  const recordedRef = useRef(false)
  const firstSourceRef = useRef<string | null>(null)

  const [state, dispatch] = useSession(
    run?.key ?? "empty",
    run?.item ?? dummyItem(),
    run?.seed ?? { origin }
  )

  const [justifiedKey, setJustifiedKey] = useState(state.key)
  if (justifiedKey !== state.key) {
    setJustifiedKey(state.key)
    setJustified(false)
  }

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const timingKey = `${state.key}|${state.hintStage}|${state.lines.length}`
  const baseWait = run?.baseWait ?? 12000

  useEffect(() => {
    stalledRef.current = false
    if (state.status !== "active" || state.hintStage >= 3 || !run) return
    const id = window.setInterval(() => {
      const idle = Date.now() - state.lastActionAt
      if (idle >= waitMsOf(state, baseWait) && !stalledRef.current) {
        stalledRef.current = true
        dispatch({
          type: "stuck",
          text: safeHint(run.ladder.l1, "Name the move you are stuck on — I will meet you there.", leakTokens(state)),
        })
      }
    }, 1000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timingKey, state.status])

  useEffect(() => {
    if (state.status === "done" && !recordedRef.current && run) {
      recordedRef.current = true
      const outcome = state.hintsGiven > 0 ? ("guided" as const) : ("independent" as const)
      saveSkills(recordOutcome(loadSkills(), state.item.skill || "derived", outcome))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.key])

  const idleMs = state.status === "active" ? Math.max(0, now - state.lastActionAt) : 0
  const durationMs = Math.max(0, (state.endedAt ?? now) - state.startedAt)
  const canHint = state.substantive && state.hintStage < 3 && state.status === "active"
  const solving = state.status === "active"
  const justifying = state.status === "done" && needsCheck(state.item.kind) && !justified

  if (!run) {
    return (
      <div className="paper" style={{ padding: 60, textAlign: "center" }}>
        <div className="empty-state">
          <div className="big">?</div>
          That problem is not in the vault yet.{" "}
          <Link href="/topics" style={{ color: "var(--gold-hi)" }}>
            Browse topics →
          </Link>
        </div>
      </div>
    )
  }

  const commit = (src: string) => {
    if (justifying) {
      const numerals = state.claimedRoots.flatMap((c) => (c.includes(":") ? [c.slice(2)] : []))
      const res = checkJustification(src, numerals)
      if (res.ok) {
        setJustified(true)
        setJustError(null)
        dispatch({ type: "commit", line: mkLine(src, "verified", "rewrite"), key: "" })
      } else {
        setJustError(res.reason ?? "Not quite — try the substitution again.")
      }
      return
    }
    if (!solving) return
    const goal = {
      kind: state.item.kind,
      roots: toRatMap(state.rootsAsStrings),
      target: state.target ? parseToLine(state.target)?.model : undefined,
      translateEquation: state.init ? parseToLine(state.init)?.model : undefined,
    }
    const prev =
      state.lines.length > 0 ? parseToLine(state.lines[state.lines.length - 1].source) ?? undefined : undefined
    const res = verifyLine(src, { prev, goal })

    let status = res.status
    let noteTxt = res.note
    if (goal.kind === "simplify" && status === "complete") {
      const tLine = state.target ? parseToLine(state.target) ?? null : null
      const curProd = lineHasProducts(res.line)
      const targetProd = tLine ? lineHasProducts(tLine) : false
      if (targetProd && !curProd) {
        status = "note"
        noteTxt = "That value is right — now write it as a product of brackets."
      } else if (!targetProd && curProd) {
        status = "note"
        noteTxt = "Expand it fully to the form the problem asked for."
      } else if (firstSourceRef.current === src) {
        status = "note"
        noteTxt = "That is the goal already — show at least one move."
      }
    }
    if (firstSourceRef.current === null && status !== "unreadable") firstSourceRef.current = src

    const claimed = res.rootClaimed
      ? { var: res.rootClaimed.var, value: rootFromRat(res.rootClaimed.value) }
      : undefined
    dispatch({ type: "commit", line: mkLine(src, status, res.moveTag, res.errorKey, claimed, noteTxt), key: res.line.canonicalKey })
    setDraft("")
    setJustError(null)
  }

  const askHint = () => {
    const level = state.hintStage + 1
    const text = level === 1 ? run.ladder.l1 : level === 2 ? run.ladder.l2 : run.ladder.l3
    dispatch({
      type: "hint",
      level: level as 1 | 2 | 3,
      text: safeHint(text, "Take a step back and name what you are trying to undo.", leakTokens(state)),
    })
  }

  const askStuck = () => {
    dispatch({
      type: "stuck",
      text: safeHint(run.ladder.l1, "Start by naming the move you are stuck on.", leakTokens(state)),
    })
  }

  const moreTime = () => dispatch({ type: "more-time" })
  const deleteLast = () => dispatch({ type: "delete-last" })

  const makeTwin = () => {
    if (run.isTwin) return
    const next = makeTwinRun(run.origin, state.twinCount + 1)
    if (!next) return
    recordedRef.current = false
    firstSourceRef.current = null
    stalledRef.current = false
    setJustified(false)
    setJustError(null)
    setDraft("")
    setRun(next)
    router.replace(`/workspace/${run.sourceId}?tw=${state.twinCount + 1}`)
  }

  return (
    <div className="workspace">
      <div className="workspace-pane workspace-left">
        <TopicTree
          activeSlug={run.isTwin ? undefined : run.origin.topic}
          activeItemId={run.isTwin ? undefined : run.sourceId}
          onPickTopic={(slug) => router.push(`/topics/${slug}`)}
          onPickItem={(id) => router.push(`/workspace/${id}`)}
        />
      </div>

      <div className="paper" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <span className="crumb">
            <Link href="/topics">Topics</Link> · {run.isTwin ? "twin problem" : topicBySlug(run.origin.topic)?.title ?? "practice"}
          </span>
          {state.twinCount > 0 ? <span className="chip">twin {state.twinCount}</span> : null}
        </div>
        <h1 className="display" style={{ fontSize: 24, margin: "2px 0 10px" }}>
          {state.item.title}
        </h1>
        <div className="stem-tags">
          <span className="tag">{state.item.kind}</span>
          <span className="tag gold">source · {state.item.sourceId}</span>
        </div>
        <div className="stem">
          {state.item.stemTex ? <TeX tex={state.item.stemTex} /> : null}
          <div>{state.item.stem}</div>
          {state.item.alt ? <div className="stem-note">{state.item.alt}</div> : null}
        </div>

        <div className="lines-pane">
          {state.lines.length === 0 ? (
            <div className="empty-state">
              <div className="big">✍</div>
              The board is empty. Write a first line from the problem.
            </div>
          ) : (
            state.lines.map((l, i) => (
              <LineItem
                key={l.id}
                line={l}
                index={i}
                onDelete={i === state.lines.length - 1 && solving ? deleteLast : undefined}
              />
            ))
          )}
        </div>

        {state.scratch.length > 0 ? (
          <div style={{ marginTop: 10, borderTop: "1px dashed var(--line)", paddingTop: 8 }}>
            {state.scratch.map((l) => (
              <ScratchLine key={l.id} line={l} />
            ))}
          </div>
        ) : null}

        {solving ? (
          <div className="editor-wrap">
            <MathInput value={draft} onChange={setDraft} onCommit={commit} autofocus={state.lines.length === 0} placeholder="Enter your next line" />
          </div>
        ) : justifying ? (
          <div className="editor-wrap">
            <div className="tutor-note-card hint-card" style={{ marginBottom: 10 }}>
              <b className="gold-text">Your answer is in. Now the check comes from you.</b> Write one line that
              substitutes your answer back into the problem — for a linear equation, something like{" "}
              <span style={{ fontFamily: "var(--font-geist-mono)" }}>2(4)+3 = 11</span>.
            </div>
            {justError ? (
              <div className="tutor-note-card repair-card" style={{ marginBottom: 10 }}>
                {justError}
              </div>
            ) : null}
            <MathInput
              value={draft}
              onChange={setDraft}
              onCommit={commit}
              autofocus
              placeholder="Write the substitution check, e.g. 2(4)+3 = 11"
            />
          </div>
        ) : state.status === "done" ? (
          <div className="tutor-note-card hint-card" style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <Check size={15} className="gold-text" /> Checked — your answer survives a substitution.
          </div>
        ) : null}
      </div>

      <TutorPane
        state={state}
        idleMs={solving ? idleMs : 0}
        durationMs={durationMs}
        canHint={canHint}
        hintLevels={state.hintStage}
        onHint={askHint}
        onStuck={askStuck}
        onMoreTime={moreTime}
        onDeleteLast={deleteLast}
        onTwin={makeTwin}
        topicHref={run.isTwin ? "/topics" : `/topics/${run.origin.topic}`}
      />
    </div>
  )
}

function dummyItem(): WorkspaceItem {
  return { kind: "solve", title: "", stem: "", stemTex: undefined, skill: "", sourceId: "", alt: "" }
}

function toRatMap(rs?: Record<string, string[]>): Record<string, { n: bigint; d: bigint }[]> | undefined {
  if (!rs) return undefined
  const out: Record<string, { n: bigint; d: bigint }[]> = {}
  for (const [v, arr] of Object.entries(rs)) {
    out[v] = arr.map((s) => {
      const [n, d] = s.split("/")
      return { n: BigInt(n), d: d ? BigInt(d) : 1n }
    })
  }
  return out
}

function mkLine(
  source: string,
  status: CommittedLine["status"],
  moveTag?: CommittedLine["moveTag"],
  errorKey?: CommittedLine["errorKey"],
  rootClaimed?: CommittedLine["rootClaimed"],
  note?: string
): CommittedLine {
  const parsed = parseToLine(source)
  return {
    id: lineId(),
    source,
    latex: parsed?.latex ?? source,
    status,
    moveTag,
    errorKey,
    rootClaimed,
    note,
    t: Date.now(),
  }
}