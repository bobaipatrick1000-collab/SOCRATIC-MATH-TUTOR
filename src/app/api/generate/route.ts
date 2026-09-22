import { generateLesson } from "@/lib/ai/generate"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, error: "Expected a JSON body." }, { status: 400 })
  }
  const topic = (body as Record<string, unknown>)?.topic
  if (typeof topic !== "string" || topic.trim().length === 0) {
    return Response.json(
      { ok: false, error: "Give me a math topic, like “factorising quadratics”." },
      { status: 400 },
    )
  }
  const refresh = (body as Record<string, unknown>)?.refresh === true
  const result = await generateLesson(topic, { refresh })
  if (result.ok) {
    return Response.json({
      ok: true,
      lesson: result.lesson,
      mode: result.mode,
      cached: result.cached,
    })
  }
  return Response.json(
    { ok: false, error: result.error, notMath: result.notMath === true },
    { status: 422 },
  )
}