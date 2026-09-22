import { getTopicPack } from "@/lib/server/store/packStore"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Workspace launcher for a Topic Pack practice item.
 *
 * The student-facing pack GET never carries hidden_key. When a student clicks a
 * pack practice card, this route hands the workspace exactly what it needs to
 * grade and hint — the same structured seed the static catalog provides for its
 * own items (roots travel to the client for checking there too; the workspace
 * never prints them). Non-student-visible details (final_result) stay out.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string; iid: string }> }) {
  const { id, iid } = await ctx.params
  const row = getTopicPack(id)
  if (!row) {
    return Response.json({ ok: false, error: "No pack for that topic." }, { status: 404 })
  }
  const pack = Array.isArray(row.pack) ? null : (row.pack as { practice?: unknown[] })
  if (!pack || !Array.isArray(pack.practice)) {
    return Response.json({ ok: false, error: "Malformed cached pack." }, { status: 500 })
  }
  const raw = pack.practice.find((p) => (p as { id?: string })?.id === iid)
  if (!raw) {
    return Response.json({ ok: false, error: "That practice item is not in this pack." }, { status: 404 })
  }
  const item = raw as {
    id: string
    kind: "solve" | "simplify" | "translate"
    stem: string
    stemTex?: string
    init?: string
    target?: string
    roots?: Record<string, string[]>
    difficulty: 1 | 2 | 3
    title?: string
    alt?: string
    calcAllowed?: boolean
    waitMs?: number
    skill?: string
    source_title?: string
    hidden_key?: { final_result?: string; first_stuck_point?: string; level_1_hint?: string }
  }

  const l2 = item.hidden_key?.first_stuck_point?.trim() || "Name the move that feels blocked."
  const l3 = "Write the next line you know is true, then keep going from there."

  return Response.json({
    ok: true,
    item: {
      kind: item.kind,
      title: item.title ?? `Pack practice ${item.id}`,
      stem: item.stem,
      stemTex: item.stemTex,
      skill: item.skill ?? "derived",
      sourceId: `${id}/${item.id}`,
      alt: item.alt ?? "A practice problem from the topic pack.",
      init: item.init,
      target: item.target,
      roots: item.roots,
      waitMs: item.waitMs ?? 16000,
      difficulty: item.difficulty,
      calcAllowed: item.calcAllowed ?? false,
      sourceTitle: item.source_title ?? packTopicOf(row.pack),
      hint: {
        l1: item.hidden_key?.level_1_hint?.trim() || "Start by writing the problem as your first line.",
        l2,
        l3,
      },
    },
  })
}

function packTopicOf(pack: unknown): string {
  const p = pack as { topic?: { title?: string } } | null
  return p?.topic?.title ?? "Topic pack"
}