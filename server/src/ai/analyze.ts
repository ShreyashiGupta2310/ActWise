import type { ZodError } from "zod";
import { analysisSchema, type Analysis } from "./analysisSchema";
import { chatJson, type ChatResult, type OllamaOptions } from "./ollamaClient";
import { buildMessages, type ChatMessage, type PromptMeta } from "./prompt";
import { verifyDeadline, type Deadline } from "./verifyDeadline";

export type AnalyzePage = PromptMeta & { text: string };

export type AnalyzeResult =
  | { ok: true; analysis: Analysis; deadline: Deadline; attempts: number }
  | { ok: false; reason: string; unavailable: boolean };

export interface AnalyzeConfig {
  ollama: OllamaOptions;
  goals: string[];
}

export interface AnalyzeDeps {
  chat?: (messages: ChatMessage[]) => Promise<ChatResult>;
}

const UNAVAILABLE = new Set(["model_unreachable", "model_missing"]);

function parseModelJson(content: string): unknown {
  const cleaned = content
    .trim()
    .replace(/^\x60{3}(?:json)?\s*/i, "")
    .replace(/\s*\x60{3}$/, "");
  return JSON.parse(cleaned);
}

function describeProblems(error: ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.map(String).join(".") || "answer"}: ${issue.message}`)
    .join("; ");
}

export async function analyzePage(
  page: AnalyzePage,
  cfg: AnalyzeConfig,
  deps: AnalyzeDeps = {}
): Promise<AnalyzeResult> {
  const chat = deps.chat ?? ((messages: ChatMessage[]) => chatJson(messages, cfg.ollama));
  const base = buildMessages(page.text, page, cfg.goals);
  let messages = base;
  let lastProblem = "invalid_json";

  for (let attempt = 1; attempt <= 2; attempt++) {
    const reply = await chat(messages);
    if (!reply.ok) {
      return { ok: false, reason: reply.reason, unavailable: UNAVAILABLE.has(reply.reason) };
    }

    const echoed: ChatMessage = { role: "assistant", content: reply.content.slice(0, 1500) };

    let parsed: unknown;
    try {
      parsed = parseModelJson(reply.content);
    } catch {
      lastProblem = "invalid_json";
      messages = [
        ...base,
        echoed,
        { role: "user", content: "That was not valid JSON. Answer again with only the JSON form." },
      ];
      continue;
    }

    const checked = analysisSchema.safeParse(parsed);
    if (checked.success) {
      return {
        ok: true,
        analysis: checked.data,
        deadline: verifyDeadline(checked.data, page.text),
        attempts: attempt,
      };
    }

    lastProblem = "invalid_shape";
    messages = [
      ...base,
      echoed,
      {
        role: "user",
        content: `That answer did not fit the form (${describeProblems(checked.error)}). Answer again with only the corrected JSON.`,
      },
    ];
  }

  return { ok: false, reason: lastProblem, unavailable: false };
}
