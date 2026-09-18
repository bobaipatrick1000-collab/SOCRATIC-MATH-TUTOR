"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { itemsByTopic, TOPICS, type TopicNode } from "@/lib/content/catalog"
import { catLabel } from "@/lib/content/labels"

export default function TopicsPage() {
  const byTier = (tier: 1 | 2 | 3): TopicNode[] => TOPICS.filter((t) => t.tier === tier)
  const kids = (t: TopicNode): TopicNode[] => TOPICS.filter((k) => k.parent === t.slug)

  const column = (tier: 1 | 2 | 3, title: string, note: string) => (
    <div>
      <div className="section-title" style={{ marginTop: 30 }}>
        <h2 style={{ fontSize: 20 }}>{title}</h2>
        <span>{note}</span>
      </div>
      <div className="grid-2">
        {byTier(tier).map((t) => {
          const n = itemsByTopic(t.slug).length
          const skillChips = t.skills.slice(0, 2).map(catLabel)
          return (
            <a key={t.slug} className="card hoverable" href={`/topics/${t.slug}`}>
              <div className="stem-tags" style={{ marginBottom: 6 }}>
                <span className="tier-chip">t{t.tier}</span>
                {n > 0 ? <span className="tag gold">{n} problems</span> : null}
              </div>
              <h4 style={{ margin: 0 }}>{t.title}</h4>
              <p style={{ margin: "6px 0 10px", color: "var(--muted)", fontSize: 13.5 }}>{t.blurb}</p>
              <div className="lesson-chips" style={{ marginBottom: 0 }}>
                {skillChips.map((s) => (
                  <span key={s} className="chip">
                    {s}
                  </span>
                ))}
                {kids(t).map((k) => (
                  <span key={k.slug} className="chip">
                    → {k.title}
                  </span>
                ))}
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )

  return (
    <div>
      <div className="title-bar">
        <div>
          <div className="eyebrow">curriculum</div>
          <h1 className="display" style={{ fontSize: 34, margin: 0 }}>
            The topic tree
          </h1>
          <p className="lead" style={{ marginTop: 8 }}>
            Every topic carries a short lesson and a set of working problems. Lessons cite the open-licensed or
            public-domain source they draw on.
          </p>
        </div>
      </div>
      {column(1, "Foundations", "master first")}
      {column(2, "Core algebra", "grow steadily")}
      {column(3, "Horizon", "move when ready")}
      <div style={{ marginTop: 26 }}>
        <Link className="btn btn-primary" href="/workspace/line-1">
          Skip ahead to a problem <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )
}