import { describe, expect, it, vi } from "vitest";
import { analyzePage } from "../src/ai/analyze";

const cfg = {
  ollama: { baseUrl: "http://127.0.0.1:11434", model: "test", timeoutMs: 1000 },
  goals: ["react"],
};

const page = {
  text: "Frontend Intern. Applications close on 30 Nov 2026 at midnight.",
  title: "Frontend Intern",
  folderPath: "Bookmarks bar",
  url: "https://example.com/job",
};

const good = {
  type: "job",
  summary: "A frontend internship.",
  why_it_may_matter: "Fits an internship goal.",
  requirements: ["React"],
  topics: ["react"],
  deadline_quote: "Applications close on 30 Nov 2026",
  deadline_date: "2026-11-30",
  next_step: "Read the requirements.",
  unknowns: [],
};

const reply = (content: string) => ({ ok: true as const, content });
const fence = "\x60".repeat(3);

describe("analyzePage", () => {
  it("accepts a good answer and verifies the deadline", async () => {
    const chat = vi.fn().mockResolvedValue(reply(JSON.stringify(good)));
    const result = await analyzePage(page, cfg, { chat });
    expect(result).toMatchObject({
      ok: true,
      attempts: 1,
      deadline: { state: "verified", date: "2026-11-30" },
    });
  });

  it("accepts an answer wrapped in a code fence", async () => {
    const chat = vi
      .fn()
      .mockResolvedValue(reply(fence + "json\n" + JSON.stringify(good) + "\n" + fence));
    const result = await analyzePage(page, cfg, { chat });
    expect(result).toMatchObject({ ok: true, attempts: 1 });
  });

  it("gets one second chance after broken json, with feedback", async () => {
    const chat = vi
      .fn()
      .mockResolvedValueOnce(reply("not json at all"))
      .mockResolvedValueOnce(reply(JSON.stringify(good)));
    const result = await analyzePage(page, cfg, { chat });
    expect(result).toMatchObject({ ok: true, attempts: 2 });
    expect(chat).toHaveBeenCalledTimes(2);
    expect(chat.mock.calls[1][0].length).toBeGreaterThan(chat.mock.calls[0][0].length);
  });

  it("gives up after two broken answers", async () => {
    const chat = vi.fn().mockResolvedValue(reply("still not json"));
    const result = await analyzePage(page, cfg, { chat });
    expect(result).toEqual({ ok: false, reason: "invalid_json", unavailable: false });
    expect(chat).toHaveBeenCalledTimes(2);
  });

  it("rejects answers that do not fit the form", async () => {
    const chat = vi.fn().mockResolvedValue(reply(JSON.stringify({ ...good, type: "banana" })));
    const result = await analyzePage(page, cfg, { chat });
    expect(result).toEqual({ ok: false, reason: "invalid_shape", unavailable: false });
  });

  it("flags a missing model as unavailable and does not retry", async () => {
    const chat = vi.fn().mockResolvedValue({ ok: false, reason: "model_unreachable" });
    const result = await analyzePage(page, cfg, { chat });
    expect(result).toEqual({ ok: false, reason: "model_unreachable", unavailable: true });
    expect(chat).toHaveBeenCalledTimes(1);
  });

  it("does not believe a deadline that is not on the page", async () => {
    const fake = { ...good, deadline_quote: "Apply by tomorrow or lose it", deadline_date: "2026-10-26" };
    const chat = vi.fn().mockResolvedValue(reply(JSON.stringify(fake)));
    const result = await analyzePage(page, cfg, { chat });
    expect(result).toMatchObject({ ok: true, deadline: { state: "unknown" } });
  });
});