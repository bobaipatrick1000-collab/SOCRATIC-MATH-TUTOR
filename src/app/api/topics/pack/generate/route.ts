import { getTopicPack } from "@/lib/ai/pack"
import { stripHiddenKeys, guardPackKeys } from "@/lib/ai/packSchema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, error: "Expected a JSON body." }, { status: 400 })
  }
  const query = (body as Record<string, unknown>)?.query
  if (typeof query !== "string" || query.trim().length === 0) {
    return Response.json(
      { ok: false, error: "Give me a math topic to pack, like “linear equations with variables on both sides”." },
      { status: 400 },
    )
  }
  const refresh = (body as Record<string, unknown>)?.refresh === true
  const result = await getTopicPack(query, { refresh })
  if (!result.ok || !result.pack) {
    return Response.json(
      { ok: false, error: result.error, notMath: result.notMath === true },
      { status: 422 },
    )
  }
  const guarded = guardPackKeys(result.pack)
  return Response.json({
    ok: true,
    pack: stripHiddenKeys(guarded.pack),
    mode: result.mode,
    cached: result.cached,
    fallback: result.pack.license_flags.fallback || guarded.pack.practice.length !== result.pack.practice.length,
  })
}