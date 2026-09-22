import type { ReactNode } from "react"
import type { SceneSpec } from "@/lib/ai/schema"

const W = 480
const H = 172
const W2 = W / 2
const H2 = H / 2

type NL = Extract<SceneSpec, { kind: "number-line" }>
type BS = Extract<SceneSpec, { kind: "balance-scale" }>
type FG = Extract<SceneSpec, { kind: "factor-grid" }>
type CX = Extract<SceneSpec, { kind: "coordinate-axes" }>

function NumberLineSVG({ s }: { s: NL }) {
  const y = 92
  const xFor = (n: number) => 26 + ((n - s.from) / (s.to - s.from)) * (W - 52)
  const ticks: number[] = []
  for (let k = s.from; k <= s.to; k++) ticks.push(k)
  const mMap = new Map(s.markers.map((m) => [m.at, m]))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="number line" className="diagram-svg">
      <defs>
        <marker id="nl-arrow" markerWidth={9} markerHeight={9} refX={7} refY={3.5} orient="auto">
          <path d="M0,0 L3,3.5 L0,7 Z" fill="var(--gold)" />
        </marker>
      </defs>
      <line x1={14} y1={y} x2={W - 6} y2={y} stroke="var(--gold)" strokeWidth={2} markerEnd="url(#nl-arrow)" />
      {ticks.map((n) => {
        const x = xFor(n)
        const m = mMap.get(n)
        return (
          <g key={n}>
            <line x1={x} y1={y + 6} x2={x} y2={y - 6} stroke="var(--gold)" strokeWidth={1.4} />
            <text x={x} y={y + 17} textAnchor="middle" fontSize={12.5} fill="var(--text)">
              {m?.label ?? n}
            </text>
            {m ? <circle cx={x} cy={y} r={7.2} fill={m.open ? "none" : "var(--accent)"} stroke="var(--accent)" strokeWidth={2.2} /> : null}
          </g>
        )
      })}
    </svg>
  )
}

function BalanceScaleSVG({ s }: { s: BS }) {
  const drop = 26
  const lDrop = s.leftHeavy ? drop : 8
  const rDrop = s.leftHeavy ? 8 : drop
  const tilt = s.leftHeavy ? 6 : -6
  const beamY = 56
  const Lx = W2 - 168
  const Rx = W2 + 124
  const unknownLeft = s.unknownSide === "left"
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="balance scale" className="diagram-svg">
      <line x1={W2} y1={12} x2={W2} y2={44} stroke="var(--gold)" strokeWidth={4} strokeLinecap="round" />
      <g transform={`rotate(${tilt} ${W2} ${beamY})`}>
        <line x1={W2 - 130} y1={beamY} x2={W2 + 130} y2={beamY} stroke="var(--gold)" strokeWidth={4.4} strokeLinecap="round" />
        <line x1={W2 - 106} y1={beamY} x2={W2 - 146} y2={beamY + lDrop + 22} stroke="var(--gold)" strokeWidth={2.2} strokeLinecap="round" />
        <line x1={W2 + 106} y1={beamY} x2={W2 + 138} y2={beamY + rDrop + 22} stroke="var(--gold)" strokeWidth={2.2} strokeLinecap="round" />
        {unknownLeft ? (
          <rect x={Lx + 4} y={beamY + lDrop + 18} width={44} height={52} rx={8} fill="none" stroke="var(--accent)" strokeWidth={2.4} />
        ) : (
          Array.from({ length: s.count }).map((_, i) => (
            <rect key={i} x={Lx + (i % 2) * 14} y={beamY + lDrop + (Math.floor(i / 2) * 26) + 4} width={12} height={24} rx={3} fill="var(--gold)" />
          ))
        )}
        {!unknownLeft ? (
          <rect x={Rx + 2} y={beamY + rDrop + 18} width={44} height={52} rx={8} fill="none" stroke="var(--accent)" strokeWidth={2.4} />
        ) : (
          Array.from({ length: s.count }).map((_, i) => (
            <rect key={i} x={Rx + (i % 2) * 14} y={beamY + rDrop + (Math.floor(i / 2) * 26) + 4} width={12} height={24} rx={3} fill="var(--gold)" />
          ))
        )}
      </g>
      <text x={W2} y={H - 10} textAnchor="middle" fontSize={12} fill="var(--faint)">
        {s.leftHeavy ? "The side holding the unknown is heavier." : "Both sides balance exactly."}
      </text>
    </svg>
  )
}

function FactorGridSVG({ s }: { s: FG }) {
  const cw = 120
  const ch = 44
  const gx = W2 - cw
  const gy = 26
  const lhs = [s.a, s.b]
  const rhs = [s.c, s.d]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="factor grid" className="diagram-svg">
      {lhs.map((l, r) =>
        rhs.map((rd, c) => (
          <g key={`${r}${c}`}>
            <rect x={gx + c * cw} y={gy + r * ch} width={cw} height={ch} rx={8} fill="var(--gold-soft)" stroke="var(--line)" strokeWidth={1.2} />
            <text x={gx + c * cw + cw / 2} y={gy + r * ch + ch / 2 + 5} textAnchor="middle" fontSize={16} fill="var(--accent)">
              {l}×{rd}
            </text>
          </g>
        )),
      )}
      {lhs.map((l, r) => (
        <text key={`L${r}`} x={gx - 6} y={gy + r * ch + ch / 2 + 5} textAnchor="end" fontSize={12.5} fill="var(--gold)">
          {l}
        </text>
      ))}
      {rhs.map((rd, c) => (
        <text key={`T${c}`} x={gx + c * cw + cw / 2} y={gy - 8} textAnchor="middle" fontSize={12.5} fill="var(--gold)">
          {rd}
        </text>
      ))}
    </svg>
  )
}

function CoordinateSVG({ s }: { s: CX }) {
  const u = 30
  const px = (x: number) => W2 + x * u
  const py = (y: number) => H2 - y * u
  const ticks = [-4, -3, -2, -1, 1, 2, 3, 4]
  const pts: string[] = []
  for (let t = -3.4; t <= 3.4; t += 0.1) {
    const x = Math.round(t * 100) / 100
    const y = s.fn.type === "line" ? s.fn.m * x + s.fn.b : s.fn.a * x * x + s.fn.b * x + s.fn.c
    pts.push(`${px(x).toFixed(1)},${py(y).toFixed(1)}`)
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="coordinate axes" className="diagram-svg">
      <line x1={20} y1={H2} x2={W - 12} y2={H2} stroke="var(--gold)" strokeWidth={1.8} />
      <line x1={W2} y1={H - 14} x2={W2} y2={14} stroke="var(--gold)" strokeWidth={1.8} />
      {ticks.map((n) => (
        <g key={n}>
          <line x1={px(n)} y1={H2 + 5} x2={px(n)} y2={H2 - 5} stroke="var(--line)" strokeWidth={1.1} />
          <line x1={W2 - 5} y1={py(n)} x2={W2 + 5} y2={py(n)} stroke="var(--line)" strokeWidth={1.1} />
          <text x={px(n)} y={H2 + 16} textAnchor="middle" fontSize={10.5} fill="var(--faint)">
            {n}
          </text>
          <text x={W2 - 6} y={py(n) + 3.5} textAnchor="end" fontSize={10.5} fill="var(--faint)">
            {n}
          </text>
        </g>
      ))}
      <polyline points={pts.join(" ")} fill="none" stroke="var(--accent)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DiagramScene({ s }: { s: SceneSpec }) {
  let svg: ReactNode
  if (s.kind === "number-line") svg = <NumberLineSVG s={s as NL} />
  else if (s.kind === "balance-scale") svg = <BalanceScaleSVG s={s as BS} />
  else if (s.kind === "factor-grid") svg = <FactorGridSVG s={s as FG} />
  else svg = <CoordinateSVG s={s as CX} />
  return (
    <div
      className="diagram-scene"
      style={{ margin: "12px 0 16px", overflow: "hidden", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", background: "var(--bg-soft)" }}
    >
      {svg}
    </div>
  )
}
