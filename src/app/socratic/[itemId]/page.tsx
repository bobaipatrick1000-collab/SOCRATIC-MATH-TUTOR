"use client"

import { use } from "react"
import { Suspense } from "react"
import { itemById } from "@/lib/content/catalog"
import { SocraticWorksheet } from "@/components/SocraticWorksheet"
import type { SocraticItem } from "@/lib/ai/socraticCheck"

function Inner({ itemId }: { itemId: string }) {
  const item = itemById(itemId)
  if (!item) {
    return (
      <div className="paper" style={{ padding: 60 }}>
        Problem not found — pick a topic from the tree.
      </div>
    )
  }
  const socratic: SocraticItem = {
    kind: item.kind,
    init: item.init,
    target: item.target,
    roots: item.roots,
  }
  return (
    <div className="workspace">
      <div className="paper" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <span className="crumb">Socratic · one problem, one line at a time</span>
        </div>
        <div className="stem-tags" style={{ marginBottom: 10 }}>
          <span className="tag">{item.kind}</span>
          <span className="tag gold">engine-verified · {item.sourceId}</span>
        </div>
        <SocraticWorksheet
          item={socratic}
          title={item.title}
          stemTex={item.stemTex}
          stem={item.stem}
        />
      </div>
    </div>
  )
}

export default function SocraticPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = use(params)
  return (
    <Suspense fallback={<div className="paper" style={{ padding: 60 }}>Loading Socratic workspace…</div>}>
      <Inner itemId={itemId} />
    </Suspense>
  )
}