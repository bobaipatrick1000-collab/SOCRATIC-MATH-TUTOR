"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react"
import { itemsByTopic, lessonBySlug, topicBySlug } from "@/lib/content/catalog"
import { catLabel } from "@/lib/content/labels"
import { TeX } from "@/components/TeX"
import { LessonPanel } from "@/components/LessonPanel"

export default function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const topic = topicBySlug(slug)
  if (!topic) {
    return (
      <div className="paper" style={{ padding: 60, textAlign: "center" }}>
        <div className="empty-state">
          <div className="big">?</div>
          No such topic. <Link href="/topics">Back to the tree →</Link>
        </div>
      </div>
    )
  }
  const items = itemsByTopic(slug)
  const lesson = lessonBySlug(slug)

  return (
    <div>
      <div className="crumb" style={{ marginBottom: 12 }}>
        <Link href="/topics">Topics</Link> · {topic.tier === 1 ? "Foundations" : topic.tier === 2 ? "Core algebra" : "Horizon"}
      </div>
      <div className="title-bar">
        <div>
          <div className="eyebrow">topic · tier {topic.tier}</div>
          <h1 className="display" style={{ fontSize: 34, margin: 0 }}>
            {topic.title}
          </h1>
          <p className="lead" style={{ marginTop: 8 }}>
            {topic.blurb}
          </p>
          {topic.skills.length > 0 ? (
            <div className="lesson-chips">
              {topic.skills.map((s) => (
                <span key={s} className="chip">
                  {catLabel(s)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {lesson ? <LessonPanel lesson={lesson} /> : null}

      <div className="section-title">
        <h2>Practice</h2>
        <span>{items.length} problems ready now</span>
      </div>
      <div className="grid-2">
        {items.map((it) => (
          <Link key={it.id} className="card hoverable" href={`/workspace/${it.id}`}>
            <div className="stem-tags" style={{ marginBottom: 6 }}>
              <span className="tag">{it.kind}</span>
              <span className="tag gold">t{it.difficulty}</span>
            </div>
            <h4 style={{ margin: 0 }}>{it.title}</h4>
            {it.stemTex ? (
              <div style={{ marginTop: 6 }}>
                <TeX tex={it.stemTex} />
              </div>
            ) : null}
            <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 13.5 }}>{it.stem}</p>
            <div style={{ marginTop: 12 }}>
              <span className="btn btn-quiet" style={{ padding: 0 }}>
                Solve it <ArrowRight size={14} />
              </span>
            </div>
          </Link>
        ))}
      </div>
      {items.length === 0 ? <div className="empty-state">Problems here are still being written.</div> : null}

      <div style={{ marginTop: 30, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link className="btn" href="/topics">
          <ArrowLeft size={15} /> All topics
        </Link>
        {items[0] ? (
          <Link className="btn btn-primary" href={`/workspace/${items[0].id}`}>
            Start the first problem <ArrowRight size={15} />
          </Link>
        ) : null}
      </div>

      {lesson ? (
        <div style={{ marginTop: 26 }}>
          <div className="section-title">
            <h2>Sources</h2>
            <span>this lesson draws on</span>
          </div>
          <div className="stack">
            {lesson.sources.map((s, i) => (
              <a key={i} className="card hoverable" href={s.url} target="_blank" rel="noreferrer" style={{ padding: "14px 18px", display: "flex", gap: 10, alignItems: "center" }}>
                <ExternalLink size={14} className="gold-text" />
                <div>
                  <div style={{ fontWeight: 600 }}>{s.title}</div>
                  <div style={{ color: "var(--faint)", fontSize: 12.5 }}>{s.license}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}