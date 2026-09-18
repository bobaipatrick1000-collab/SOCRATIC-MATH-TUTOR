"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Camera, FileText, Images, ScanLine, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { ITEMS, type ContentItem } from "@/lib/content/catalog"
import { TeX } from "@/components/TeX"

type Stage = "pick" | "scan" | "confirm"

const REGIONS = [
  { key: "q1", item: "quad-1", box: { left: "8%", top: "16%", width: "38%", height: "30%" } },
  { key: "q2", item: "quad-2", box: { left: "54%", top: "16%", width: "38%", height: "30%" } },
  { key: "q3", item: "quad-3", box: { left: "8%", top: "56%", width: "38%", height: "30%" } },
  { key: "q4", item: "fact-1", box: { left: "54%", top: "56%", width: "38%", height: "30%" } },
] as const

function findItem(id: string): ContentItem | undefined {
  return ITEMS.find((i) => i.id === id)
}

export default function UploadPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>("pick")
  const [selected, setSelected] = useState<(typeof REGIONS)[number] | null>(null)
  const [edit, setEdit] = useState("")

  const startScan = () => {
    setStage("scan")
    setSelected(null)
  }

  const pickRegion = (r: (typeof REGIONS)[number]) => {
    const item = findItem(r.item)
    if (!item) return
    setSelected(r)
    setEdit(item.stemTex ?? "")
    setStage("confirm")
  }

  const importIt = () => {
    if (!selected) return
    router.push(`/workspace/${selected.item}?src=photo`)
  }

  return (
    <div>
      <div className="crumb" style={{ marginBottom: 12 }}>
        <Link href="/topics">Topics</Link> · {stage === "pick" ? "bring your own problem" : stage === "scan" ? "scanning" : "confirming"}
      </div>
      <div className="title-bar">
        <div>
          <div className="eyebrow">photograph it · demo</div>
          <h1 className="display" style={{ fontSize: 34, margin: 0 }}>
            Bring a worksheet in
          </h1>
          <p className="lead" style={{ marginTop: 8 }}>
            In production, Aurea calls a paid math-OCR service behind a server proxy and asks you to confirm what it
            read. This demo drives the same flow with a scripted scan, so you can feel the full pipeline today.
          </p>
        </div>
      </div>

      {stage === "pick" ? (
        <div className="stage-grid">
          {[
            { icon: Camera, title: "Take a photo", sub: "The quickest path — point, focus, import." },
            { icon: Images, title: "Upload an image", sub: "A snapshot of a worksheet, neatly lit." },
            { icon: FileText, title: "Scan a PDF page", sub: "Best for books and printouts." },
          ].map((s) => (
            <button key={s.title} className="card stage-card" onClick={startScan}>
              <div className="stage-icon">
                <s.icon size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{s.title}</div>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>{s.sub}</div>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {stage === "scan" || stage === "confirm" ? (
        <>
          <div className="photo-demo">
            <div className="sheet">
              <div className="sheet-title">Week 12 · Quadratic review <span className="sheet-faint">(© demo worksheet)</span></div>
              <div className="sheet-faint" style={{ fontSize: 16, lineHeight: 1.8 }}>
                <div>1. Solve by factorising:&nbsp;&nbsp;x² − 7x + 12 = 0</div>
                <div>2. Solve x² = 49</div>
                <div>3. Solve (x + 3)² = 4</div>
                <div>4. Factor: x² + 6x + 8</div>
              </div>
            </div>
            {stage === "scan" ? <div className="demo-scan"><ScanLine size={14} /> segmenting regions… <span className="low-conf demo">demo</span></div> : null}
          </div>

          {stage === "scan" ? (
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {REGIONS.map((r) => {
                const item = findItem(r.item)
                if (!item) return null
                return (
                  <button key={r.key} className="card" style={{ padding: "11px 14px", cursor: "pointer" }} onClick={() => pickRegion(r)}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className="region-label">{r.key.slice(1)}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div>
                        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{item.stemTex}</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : null}

          {stage === "confirm" && selected ? (
            <div className="paper confirm-card">
              <div className="eyebrow">OCR reading · editable</div>
              <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
                The service read the problem as LaTeX. Confirm or fix the line — then it enters the workspace exactly
                like an authored problem.
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                <span className="low-conf demo">medium confidence</span>
                <span className="line-note-text">double-check the exponent on the first term</span>
              </div>
              <textarea
                className="confirm-latex"
                value={edit}
                onChange={(e) => setEdit(e.target.value)}
                spellCheck={false}
              />
              <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 13 }}>
                Renders as: {edit ? <TeX tex={edit} display={false} /> : null}
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <button className="btn btn-primary" onClick={importIt}>
                  <Sparkles size={15} /> Import into the workspace
                </button>
                <button className="btn btn-quiet" onClick={() => setStage("scan")}>
                  <ArrowLeft size={15} /> Rescan
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {stage !== "pick" ? (
        <button className="btn btn-quiet" style={{ marginTop: 18 }} onClick={() => setStage("pick")}>
          <ArrowLeft size={15} /> Change source
        </button>
      ) : null}
    </div>
  )
}