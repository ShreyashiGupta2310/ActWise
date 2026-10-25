import { describe, expect, it, vi } from "vitest";
import { chatJson } from "../src/ai/ollamaClient";

const opts = { baseUrl: "http://127.0.0.1:11434", model: "test-model", timeoutMs: 1000 };
const asFetch = (fn: unknown) => fn as typeof fetch;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
const messages = [{ role: "user" as const, content: "hi" }];

describe("chatJson", () => {
  it("sends the form and returns the model text", async () => {
    const fetchImpl = vi.fn(async () => json({ message: { content: '{"a":1}' } }));
    const result = await chatJson(messages, { ...opts, fetchImpl: asFetch(fetchImpl) });
    expect(result).toEqual({ ok: true, content: '{"a":1}' });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://127.0.0.1:11434/api/chat");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("test-model");
    expect(body.stream).toBe(false);
    expect(body.format.type).toBe("object");
  });

  it("reports an unreachable model", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("connection refused");
    });
    expect(await chatJson(messages, { ...opts, fetchImpl: asFetch(fetchImpl) })).toEqual({
      ok: false,
      reason: "model_unreachable",
    });
  });

  it("reports a model that is not installed", async () => {
    const fetchImpl = vi.fn(async () => json({ error: "model not found" }, 404));
    expect(await chatJson(messages, { ...opts, fetchImpl: asFetch(fetchImpl) })).toEqual({
      ok: false,
      reason: "model_missing",
    });
  });

  it("reports other server errors with their code", async () => {
    const fetchImpl = vi.fn(async () => json({ error: "out of memory" }, 500));
    expect(await chatJson(messages, { ...opts, fetchImpl: asFetch(fetchImpl) })).toEqual({
      ok: false,
      reason: "model_http_500",
    });
  });

  it("reports an empty answer", async () => {
    const fetchImpl = vi.fn(async () => json({ message: { content: "  " } }));
    expect(await chatJson(messages, { ...opts, fetchImpl: asFetch(fetchImpl) })).toEqual({
      ok: false,
      reason: "model_empty",
    });
  });

  it("reports a reply that is not json", async () => {
    const fetchImpl = vi.fn(async () => new Response("oops", { status: 200 }));
    expect(await chatJson(messages, { ...opts, fetchImpl: asFetch(fetchImpl) })).toEqual({
      ok: false,
      reason: "model_bad_reply",
    });
  });
});