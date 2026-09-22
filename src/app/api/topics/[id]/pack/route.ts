import { getTopicPack, type GeneratePackResult } from "@/lib/ai/pack"
import { stripHiddenKeys, guardPackKeys } from "@/lib/ai/packSchema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function responseOf(result: GeneratePackResult, status = 200) {
  if (!result.ok || !result.pack) {
    return Response.json({ ok: false, error: result.error ?? "No pack available." }, { status: 404 })
  }
  const guarded = guardPackKeys(result.pack)
  const publicPack = stripHiddenKeys(guarded.pack)
  return Response.json({
    ok: true,
    pack: publicPack,
    mode: result.mode,
    cached: result.cached,
    fallback: result.pack.license_flags.fallback || guarded.pack.practice.length !== result.pack.practice.length,
  }, { status })
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const result = await getTopicPack(id)
  return responseOf(result)
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const query = typeof (body as Record<string, unknown>)?.query === "string"
    ? String((body as Record<string, unknown>).query).trim()
    : id
  const result = await getTopicPack(query, { refresh: true })
  return responseOf(result)
}