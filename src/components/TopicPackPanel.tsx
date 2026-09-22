"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, BookOpen, ExternalLink, Lightbulb, RefreshCw, Target, TextQuote } from "lucide-react"
import type { PublicTopicPack } from "@/lib/ai/packSchema"
import { TeX } from "./TeX"

interface PackState {
  status: "loading" | "error" | "ready"
  pack: PublicTopicPack | null
  mode: string
  fallback: boolean
  error?: string
}

const LEVEL_COLOR: Record<string, string> = {
  beginner: "silver",
  intermediate: "steady",
  challenge: "gold",
}

const LEVEL_LABEL: Record<string, string> = {
  beginner: "beginner",
  intermediate: "intermediate",
  challenge: "challenge",
}

export function TopicPackPanel({ slug }: { slug: string }) {
  const [state, setState] = useState<PackState>({ status: "loading", pack: null, mode: "", fallback: false })
  const [rebuilding, setRebuilding] = useState(false)

  const fetchPack = useCallback(
    async (refresh: boolean): Promise<PackState> => {
      try {
        const res = await fetch(`/api/topics/${encodeURIComponent(slug)}/pack`, {
          method: refresh ? "POST" : "GET",
          headers: refresh ? { "Content-Type": "application/json" } : undefined,
          body: refresh ? JSON.stringify({}) : undefined,
        })
        const json = (await res.json()) as {
          ok: boolean
          error?: string
          pack?: PublicTopicPack
          mode?: string
          fallback?: boolean
        }
        if (!json.ok || !json.pack) {
          return { status: "error", pack: null, mode: "", fallback: false, error: json.error ?? "No pack available." }
        }
        return { status: "ready", pack: json.pack, mode: json.mode ?? "", fallback: json.fallback === true }
      } catch {
        return { status: "error", pack: null, mode: "", fallback: false, error: "Could not reach the pack service." }
      }
    },
    [slug],
  )

  useEffect(() => {
    let cancelled = false
    void fetchPack(false).then((next) => {
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [fetchPack])

  const rebuild = useCallback(async () => {
    setRebuilding(true)
    try {
      setState(await fetchPack(true))
    } finally {
      setRebuilding(false)
    }
  }, [fetchPack])

  if (state.status === "loading") {
    return (
      <section>
        <div className="section-title">
          <h2>Topic pack</h2>
          <span>assembling the map…</span>
        </div>
        <div className="card empty-state">Building the pack from open sources (first visit is slow).</div>
      </section>
    )
  }

  if (state.status === "error" || !state.pack) {
    return (
      <section>
        <div className="section-title">
          <h2>Topic pack</h2>
          <span>not ready yet</span>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div className="empty-state" style={{ fontSize: 13.5 }}>
            {state.error ?? "No pack available for this topic yet."}
          </div>
        </div>
      </section>
    )
  }

  const p = state.pack
  const objectiveByLevel = (level: string) => p.objectives.filter((o) => o.level === level)

  return (
    <section>
      <div className="section-title" style={{ marginTop: 28 }}>
        <h2>Topic pack</h2>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {p.worked_examples.length} worked · {p.practice.length} practice
          <button className="btn btn-quiet" style={{ padding: "4px 10px" }} onClick={() => void rebuild()} disabled={rebuilding}>
            <RefreshCw size={13} /> {rebuilding ? "rebuilding…" : "rebuild"}
          </button>
        </span>
      </div>

      {state.fallback ? (
        <div className="card" style={{ borderColor: "var(--gold)", padding: 14, marginBottom: 14 }}>
          <div style={{ color: "var(--gold-hi)", fontWeight: 600, fontSize: 13.5 }}>
            No open source reached this run — using the internal lesson plus closest open sources.
          </div>
          <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 4 }}>
            The maths is still engine-checked; try Rebuild to re-fetch from the web.
          </div>
        </div>
      ) : null}

      <div className="card block-card" style={{ padding: 18 }}>
        <div className="eyebrow">what this is</div>
        <p style={{ margin: "6px 0 0" }}>{p.description}</p>
      </div>

      <div className="card block-card" style={{ padding: 18, marginTop: 12 }}>
        <div className="eyebrow">where it sits</div>
        <p style={{ margin: "6px 0 0" }}>{p.context}</p>
      </div>

      <div className="card" style={{ padding: 18, marginTop: 12 }}>
        <div className="eyebrow">objectives</div>
        <ul style={{ margin: "8px 0 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          {(["beginner", "intermediate", "challenge"] as const).flatMap((lv) =>
            objectiveByLevel(lv).map((o) => (
              <li key={o.text}>
                <span className={`chip ${LEVEL_COLOR[lv]}`} style={{ marginRight: 8 }}>
                  {LEVEL_LABEL[lv]}
                </span>
                {o.text}
              </li>
            )),
          )}
        </ul>
      </div>

      {p.worked_examples.length > 0 ? (
        <div className="card" style={{ padding: 18, marginTop: 12 }}>
          <div className="eyebrow">worked examples</div>
          <div className="stack" style={{ marginTop: 8 }}>
            {p.worked_examples.map((ex, i) => (
              <details key={i} open={i < 2} className="practice-details">
                <summary>
                  <strong style={{ marginRight: 10 }}>Example {i + 1}</strong>
                  {ex.title} — {ex.prompt}
                </summary>
                <div style={{ padding: "10px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>
                    <Lightbulb size={12} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                    {ex.method}
                  </div>
                  <ol style={{ margin: "4px 0 0", paddingLeft: 22 }}>
                    {ex.steps.map((s, j) => (
                      <li key={j} style={{ marginBottom: 4 }}>
                        <TeX tex={s} display={false} />
                      </li>
                    ))}
                  </ol>
                  <div className="line-note-text">
                    <TextQuote size={12} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                    {ex.checkpoint}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card" style={{ padding: 18, marginTop: 12 }}>
        <div className="eyebrow">practice</div>
        <div className="grid-2" style={{ marginTop: 8 }}>
          {p.practice.map((it) => (
            <Link
              key={it.id}
              className="card hoverable"
              href={`/workspace/pk:${encodeURIComponent(p.topic.slug)}:${encodeURIComponent(it.id)}?src=pack`}
              style={{ padding: 14 }}
            >
              <div className="stem-tags" style={{ marginBottom: 6 }}>
                <span className="tag">{it.kind}</span>
                <span className={`tag ${it.difficulty >= 3 ? "gold" : "silver"}`}>t{it.difficulty}</span>
              </div>
              <h4 style={{ margin: 0, fontSize: 15 }}>{it.title ?? it.stem}</h4>
              {it.stemTex ? (
                <div style={{ marginTop: 6 }}>
                  <TeX tex={it.stemTex} />
                </div>
              ) : (
                <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 13 }}>{it.stem}</p>
              )}
              <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--faint)" }}>{it.source_title}</div>
              <div style={{ marginTop: 8 }}>
                <span className="btn btn-quiet" style={{ padding: 0 }}>
                  Solve it in the workspace <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {p.citations.length > 0 ? (
        <div className="card" style={{ padding: 18, marginTop: 12 }}>
          <div className="eyebrow">
            <BookOpen size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            sources
          </div>
          <div className="stack" style={{ marginTop: 6 }}>
            {p.citations.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <ExternalLink size={13} className="gold-text" style={{ marginTop: 3, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                    {c.url ? (
                      <a href={c.url} target="_blank" rel="noreferrer">
                        {c.title}
                      </a>
                    ) : (
                      c.title
                    )}
                  </div>
                  <div style={{ color: "var(--faint)", fontSize: 12 }}>{c.license}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 10, color: "var(--faint)", fontSize: 12 }}>
        <Target size={11} style={{ verticalAlign: "-2px", marginRight: 4 }} />
        Query: “{p.query}” · sources {p.license_flags.allowlisted ? "allowlisted" : "internal"}
      </div>
    </section>
  )
}