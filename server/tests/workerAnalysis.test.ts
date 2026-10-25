import { describe, expect, it, vi } from "vitest";
import type { Analysis } from "../src/ai/analysisSchema";
import { openDatabase, type Db } from "../src/db/database";
import { countAnalysisStates, markFetched } from "../src/db/itemsRepo";
import { importBookmarks } from "../src/import/importBookmarks";
import { processNext, processOneAnalysis } from "../src/worker/worker";
import { workerState } from "../src/worker/workerState";
import { loadSampleBookmarks } from "./helpers";

const analysis: Analysis = {
  type: "job",
  summary: "A frontend internship.",
  why_it_may_matter: "Fits an internship goal.",
  requirements: ["React"],
  topics: ["react"],
  deadline_quote: null,
  deadline_date: null,
  next_step: "Read the requirements.",
  unknowns: [],
};

const okResult = {
  ok: true as const,
  analysis,
  deadline: { state: "unknown" as const },
  attempts: 1,
};

function fetchedDb(): Db {
  const db = openDatabase(":memory:");
  importBookmarks(db, loadSampleBookmarks());
  for (let id = 1; id <= 7; id++) {
    markFetched(db, id, "A page about an internship using React.");
  }
  return db;
}

describe("processOneAnalysis", () => {
  it("analyses one item and stores the answer with timing", async () => {
    const db = fetchedDb();
    const analyze = vi.fn(async () => okResult);
    expect(await processOneAnalysis(db, { analyze })).toBe("done");
    expect(countAnalysisStates(db)).toEqual({ pending: 6, done: 1, failed: 0 });

    const row = db
      .prepare("SELECT analysis_json FROM items WHERE analysis_state = 'done'")
      .get() as unknown as { analysis_json: string };
    const stored = JSON.parse(row.analysis_json);
    expect(stored.analysis.type).toBe("job");
    expect(stored.deadline).toEqual({ state: "unknown" });
    expect(typeof stored.ms).toBe("number");
  });

  it("writes down why an answer was unusable and moves on", async () => {
    const db = fetchedDb();
    const analyze = vi.fn(async () => ({
      ok: false as const,
      reason: "invalid_shape",
      unavailable: false,
    }));
    await processOneAnalysis(db, { analyze });
    expect(countAnalysisStates(db)).toEqual({ pending: 6, done: 0, failed: 1 });
    const row = db
      .prepare("SELECT analysis_error FROM items WHERE analysis_state = 'failed'")
      .get() as unknown as { analysis_error: string };
    expect(row.analysis_error).toBe("invalid_shape");
  });

  it("leaves the item waiting when the model itself is unavailable", async () => {
    const db = fetchedDb();
    const analyze = vi.fn(async () => ({
      ok: false as const,
      reason: "model_unreachable",
      unavailable: true,
    }));
    expect(await processOneAnalysis(db, { analyze })).toBe("model_unavailable");
    expect(countAnalysisStates(db)).toEqual({ pending: 7, done: 0, failed: 0 });
    expect(workerState.modelProblem).toBe("model_unreachable");
  });

  it("does not get stuck when the analyser crashes", async () => {
    const db = fetchedDb();
    const analyze = vi.fn(async () => {
      throw new Error("boom");
    });
    await processOneAnalysis(db, { analyze });
    expect(countAnalysisStates(db)).toEqual({ pending: 6, done: 0, failed: 1 });
  });

  it("is idle when no page has been read yet", async () => {
    const db = openDatabase(":memory:");
    importBookmarks(db, loadSampleBookmarks());
    expect(await processOneAnalysis(db, { analyze: vi.fn() })).toBe("idle");
  });
});

describe("processNext", () => {
  it("reads pages before asking the model", async () => {
    const db = openDatabase(":memory:");
    importBookmarks(db, loadSampleBookmarks());
    const analyze = vi.fn();
    const fetchPage = vi.fn(async () => ({
      ok: true as const,
      finalUrl: "https://example.com",
      html: "<html><body>" + "A real page with plenty of readable words. ".repeat(3) + "</body></html>",
    }));
    expect(await processNext(db, { fetchPage, analyze })).toBe("fetched");
    expect(analyze).not.toHaveBeenCalled();
  });
});