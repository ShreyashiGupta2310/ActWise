import { analysisJsonSchema } from "./analysisSchema";
import type { ChatMessage } from "./prompt";

export type ChatResult = { ok: true; content: string } | { ok: false; reason: string };

export interface OllamaOptions {
  baseUrl: string;
  model: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

export async function chatJson(
  messages: ChatMessage[],
  opts: OllamaOptions
): Promise<ChatResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const signal = AbortSignal.timeout(opts.timeoutMs);

  let res: Response;
  try {
    res = await fetchImpl(`${opts.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        model: opts.model,
        messages,
        stream: false,
        format: analysisJsonSchema,
        keep_alive: "5m",
        options: { temperature: 0, num_ctx: 4096 },
      }),
    });
  } catch {
    return { ok: false, reason: signal.aborted ? "model_timeout" : "model_unreachable" };
  }

  if (res.status === 404) return { ok: false, reason: "model_missing" };
  if (!res.ok) return { ok: false, reason: `model_http_${res.status}` };

  try {
    const data = (await res.json()) as { message?: { content?: unknown } };
    const content = data?.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
      return { ok: false, reason: "model_empty" };
    }
    return { ok: true, content };
  } catch {
    return { ok: false, reason: "model_bad_reply" };
  }
}