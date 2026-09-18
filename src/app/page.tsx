"use client"

import Link from "next/link"
import { ArrowRight, BookOpen, GraduationCap, Sparkles, Wand2 } from "lucide-react"
import { ITEMS, TOPICS } from "@/lib/content/catalog"

export default function HomePage() {
  const featured = ITEMS[0]
  return (
    <div>
      <section className="hero">
        <div className="eyebrow">a patient mathematics tutor</div>
        <h1 className="display hero-title">
          Aurea watches your work <span className="gold-text">line by line</span>.
        </h1>
        <p className="lead">
          It stays silent while you think, reads every step you commit, and when you are stuck it asks{" "}
          <em>one good question</em> — never the answer. Progress is kept locally, on your device.
        </p>
        <div className="hero-cta">
          <Link className="btn btn-primary" href={`/workspace/${featured.id}`}>
            <Sparkles size={16} /> Solve your first problem
          </Link>
          <Link className="btn" href="/topics">
            Browse the topic tree <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <div className="section-title">
        <h2>How it works</h2>
        <span>three movements, one habit</span>
      </div>
      <div className="path-grid">
        <div className="card hoverable">
          <div className="path-icon">
            <Wand2 size={18} />
          </div>
          <h4 style={{ margin: "0 0 6px" }}>Think quietly</h4>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
            The tutor watchers your screen, not your shoulder. Nothing appears until you ask — or go quiet too long.
          </p>
        </div>
        <div className="card hoverable">
          <div className="path-icon">
            <BookOpen size={18} />
          </div>
          <h4 style={{ margin: "0 0 6px" }}>Write one line at a time</h4>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
            Each committed line is checked for math, never for speed. Wrong? You get a nudge about the move, not a mark.
          </p>
        </div>
        <div className="card hoverable">
          <div className="path-icon">
            <GraduationCap size={18} />
          </div>
          <h4 style={{ margin: "0 0 6px" }}>Prove it to yourself</h4>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
            When you name an answer, you write the check. A twin problem then proves the skill is really yours.
          </p>
        </div>
      </div>

      <div className="section-title">
        <h2>Start a path</h2>
        <span>{TOPICS.length} topics in the tree · {ITEMS.length} problems in the vault</span>
      </div>
      <div className="path-grid">
        {ITEMS.slice(0, 6).map((it) => (
          <Link key={it.id} className="card hoverable" href={`/workspace/${it.id}`}>
            <div className="stem-tags" style={{ marginBottom: 8 }}>
              <span className="tag">{it.kind}</span>
              <span className="tag gold">t{it.difficulty}</span>
            </div>
            <h4 style={{ margin: 0 }}>{it.title}</h4>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 14 }}>{it.stem}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}