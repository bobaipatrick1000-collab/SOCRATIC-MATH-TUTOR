/**
 * Server-only OpenAI-compatible chat client.
 * Never imported from client components or the browser bundle.
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export type AiKind = "lesson" | "scheme"

export interface AiCallOptions {
  kind: AiKind
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AUREA_AI_API_KEY is not set; generate runs in fixture mode.")
  }
}

export class AiCallError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function aiConfig(): { base: string; key: string | undefined; model: string } {
  return {
    base: (process.env.AUREA_AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, ""),
    key: process.env.AUREA_AI_API_KEY,
    model: process.env.AUREA_AI_MODEL ?? "gpt-4o-mini",
  }
}

export function aiEnabled(): boolean {
  return Boolean(aiConfig().key)
}

export async function chatJson(
  messages: ChatMessage[],
  opts: AiCallOptions,
): Promise<string> {
  const cfg = aiConfig()
  if (!cfg.key) throw new AiNotConfiguredError()
  const controller = new AbortController()
  const outer = opts.signal
  if (outer) {
    if (outer.aborted) throw new Error("aborted")
    outer.addEventListener("abort", () => controller.abort(), { once: true })
  }
  const timeoutMs = Math.max(60_000, opts.maxTokens ? opts.maxTokens * 40 : 120_000)
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${cfg.base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 2400,
        response_format: { type: "json_object" },
        stream: false,
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new AiCallError(res.status, `AI provider returned ${res.status}: ${text.slice(0, 200)}`)
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = json.choices?.[0]?.message?.content
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new AiCallError(502, "AI provider returned an empty completion")
    }
    return content
  } finally {
    clearTimeout(timer)
  }
}