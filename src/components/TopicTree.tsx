"use client"

import { useMemo, useState, type ReactNode } from "react"
import { ChevronRight, FolderTree, Search } from "lucide-react"
import { TOPICS, itemsByTopic, type TopicNode } from "@/lib/content/catalog"

function buildTree(): { roots: TopicNode[]; children: Record<string, TopicNode[]> } {
  const children: Record<string, TopicNode[]> = {}
  const roots: TopicNode[] = []
  for (const t of TOPICS) {
    if (t.parent) {
      ;(children[t.parent] ??= []).push(t)
    } else {
      roots.push(t)
    }
  }
  return { roots, children }
}

export function TopicTree({
  activeSlug,
  activeItemId,
  onPickTopic,
  onPickItem,
}: {
  activeSlug?: string
  activeItemId?: string
  onPickTopic: (slug: string) => void
  onPickItem?: (id: string) => void
}) {
  const { roots, children } = useMemo(() => buildTree(), [])
  const [q, setQ] = useState("")
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({ algebra: true, arithmetic: true }))

  const matches = (n: TopicNode) => n.title.toLowerCase().includes(q.toLowerCase()) || n.slug.includes(q.toLowerCase())

  const renderNode = (n: TopicNode, depth: number): ReactNode => {
    const kids = children[n.slug] ?? []
    const items = itemsByTopic(n.slug)
    const isOpen = open[n.slug] ?? activeSlug === n.slug
    const active = activeSlug === n.slug
    const dim = q.length > 0 && !matches(n)
    return (
      <div key={n.slug}>
        <div
          className={`tree-node${active ? " active" : ""}${dim ? " dim" : ""}`}
          style={{ paddingLeft: 10 + depth * 4 }}
          onClick={() => onPickTopic(n.slug)}
        >
          {kids.length > 0 ? (
            <span
              className={`tree-chevron${isOpen ? " open" : ""}`}
              onClick={(e) => {
                e.stopPropagation()
                setOpen((o) => ({ ...o, [n.slug]: !isOpen }))
              }}
            >
              <ChevronRight size={14} />
            </span>
          ) : (
            <span className="tree-chevron" />
          )}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</span>
          <span className="tree-meta">
            <span className="tier-chip">t{n.tier}</span>
            {items.length > 0 ? <span>{items.length}</span> : null}
          </span>
        </div>
        {isOpen && onPickItem
          ? items.map((it) => (
              <div
                key={it.id}
                className={`tree-node${activeItemId === it.id ? " active" : ""}`}
                style={{ paddingLeft: 28 + depth * 4, fontSize: 12.5 }}
                onClick={() => onPickItem(it.id)}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</span>
                <span className="tree-meta">{it.difficulty}</span>
              </div>
            ))
          : null}
        {isOpen && !onPickItem && kids.length > 0
          ? kids.map((k) => renderNode(k, depth + 1))
          : kids.length > 0 && onPickItem
            ? kids.map((k) => renderNode(k, depth + 1))
            : null}
      </div>
    )
  }

  return (
    <div>
      <h2 className="pane-h">
        <FolderTree size={13} /> Topics
      </h2>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <Search
          size={13}
          style={{ position: "absolute", left: 10, top: 9, color: "var(--faint)" }}
        />
        <input
          className="small-input"
          style={{ paddingLeft: 30 }}
          placeholder="Search topics…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="topic-tree">{roots.map((r) => renderNode(r, 0))}</div>
    </div>
  )
}