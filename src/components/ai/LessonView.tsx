"use client"

import { useState } from "react"
import { Target, ListOrdered, Lightbulb, CheckCircle2, BookOpen, Sparkles } from "lucide-react"
import type { GeneratedLesson, SceneSpec } from "@/lib/ai/schema"
import { TeX } from "@/components/TeX"
import { DiagramScene } from "./DiagramScene"
import { PracticeSection } from "./PracticeSection"
import { QuizSection } from "./QuizSection"

export function LessonView({ lesson }: { lesson: GeneratedLesson }) {
  const [tab, setTab] = useState<"practice" | "quiz">("practice")
  const objectives = Object.entries(
    lesson.objectives.reduce<Record<string, string[]>>((acc, o) => {
      ;(acc[o.skill] ??= []).push(o.text)
      return acc
    }, {}),
  )

  return (
    <div className="lesson-view">
      <div className="card lesson-hero">
        <div className="eyebrow">{lesson.topic.title}</div>
        <h1 className="display" style={{ margin: "4px 0 8px", fontSize: 26 }}>
          {lesson.title}
        </h1>
        <p className="lead" style={{ margin: 0 }}>
          {lesson.intro}
        </p>
        {lesson.introScene ? (
          <div style={{ position: "relative" }}>
            <DiagramScene s={lesson.introScene as SceneSpec} />
          </div>
        ) : null}
      </div>

      <div className="section-title" style={{ marginTop: 32 }}>
        <h2>
          <Target size={17} /> What you'll be able to do
        </h2>
        <span>the objectives of this lesson</span>
      </div>
      <div className="objectives">
        {objectives.map(([skill, texts]) => (
          <div key={skill} className="card objective">
            <div className="objective-skill">{skill}</div>
            <ul className="objective-points">
              {texts.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {lesson.outline.length > 0 ? (
        <>
          <div className="section-title" style={{ marginTop: 32 }}>
            <h2>
              <ListOrdered size={17} /> The shape of the lesson
            </h2>
            <span>what we'll build, step by step</span>
          </div>
          <div className="outline">
            {lesson.outline.map((s, i) => (
              <div key={i} className="outline-block">
                <div className="outline-heading">{s.heading}</div>
                <ul className="outline-points">
                  {s.points.map((p, j) => (
                    <li key={j}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {lesson.workedExamples.length > 0 ? (
        <>
          <div className="section-title" style={{ marginTop: 32 }}>
            <h2>
              <Lightbulb size={17} /> Worked examples
            </h2>
            <span>watch the method, one move at a time</span>
          </div>
          <div className="worked-column">
            {lesson.workedExamples.map((ex, i) => (
              <div key={i} className="card worked-example">
                <div className="worked-example-head">
                  <span className="chip gold">Example {i + 1}</span>
                  {ex.stem ? <span className="worked-example-stem">{ex.stem}</span> : null}
                  {ex.stemTex ? <TeX tex={ex.stemTex} display={false} /> : null}
                </div>
                <ol className="worked-steps">
                  {ex.steps.map((st, j) => (
                    <li key={j} className="worked-step">
                      <TeX tex={st.tex} display={false} />
                      {st.note ? <span className="worked-step-note">{st.note}</span> : null}
                    </li>
                  ))}
                </ol>
                <div className="worked-answer">
                  <CheckCircle2 size={15} /> <TeX tex={ex.finalAnswerTex} display={false} />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {lesson.diagrams.length > 0 ? (
        <>
          <div className="section-title" style={{ marginTop: 32 }}>
            <h2>
              <Sparkles size={17} /> See it
            </h2>
            <span>the scene behind the symbols</span>
          </div>
          <div className="diagram-column">
            {lesson.diagrams.map((s, i) => (
              <DiagramScene key={i} s={s} />
            ))}
          </div>
        </>
      ) : null}

      <div className="section-tabs" style={{ marginTop: 36 }}>
        <button className={`btn ${tab === "practice" ? "btn-primary" : "btn-quiet"}`} onClick={() => setTab("practice")}>
          Practice
        </button>
        <button className={`btn ${tab === "quiz" ? "btn-primary" : "btn-quiet"}`} onClick={() => setTab("quiz")}>
          Test yourself
        </button>
      </div>

      {tab === "practice" ? (
        <PracticeSection items={lesson.practice} passMark={lesson.passMark} />
      ) : (
        <QuizSection items={lesson.testItems} />
      )}

      <div className="card sources" style={{ marginTop: 30 }}>
        <div className="section-title" style={{ margin: 0 }}>
          <h2>
            <BookOpen size={15} /> Sources
          </h2>
          <span>this lesson is generated, but it stands on real content</span>
        </div>
        <ul className="source-list">
          {lesson.sources.map((s, i) => (
            <li key={i}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title}
              </a>
              {s.license ? <span className="source-license">{s.license}</span> : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
