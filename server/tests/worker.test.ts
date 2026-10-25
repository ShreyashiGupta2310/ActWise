import { beforeEach, describe, expect, it, vi } from "vitest";
import { openDatabase, type Db } from "../src/db/database";
import { countFetchStates } from "../src/db/itemsRepo";
import { importBookmarks } from "../src/import/importBookmarks";
import { processOne } from "../src/worker/worker";
import { loadSampleBookmarks } from "./helpers";

const goodPage = {
  ok: true as const,
  finalUrl: "https://example.com",
  html: "<html><body>" + "A real opportunity description. ".repeat(5) + "</body></html>",
};

function onlyRow(db: Db, sql: string): Record<string, unknown> {
  return { ...(db.prepare(sql).get() as object) };
}

describe("processOne", () => {
  let db: Db;

  beforeEach(() => {
    db = openDatabase(":memory:");
    importBookmarks(db, loadSampleBookmarks());
  });

  it("reads one pending page and saves its text", async () => {
    const fetchPage = vi.fn(async () => goodPage);
    expect(await processOne(db, { fetchPage })).toBe(true);
    expect(countFetchStates(db)).toEqual({ pending: 6, done: 1, failed: 0 });
    const row = onlyRow(db, "SELECT page_text FROM items WHERE fetch_state = 'done'");
    expect(String(row.page_text)).toContain("A real opportunity description.");
  });

  it("writes down why a page failed and moves on", async () => {
    await processOne(db, {
      fetchPage: async () => ({ ok: false as const, reason: "http_404" }),
    });
    expect(countFetchStates(db)).toEqual({ pending: 6, done: 0, failed: 1 });
    const row = onlyRow(db, "SELECT fetch_error FROM items WHERE fetch_state = 'failed'");
    expect(row.fetch_error).toBe("http_404");
  });

  it("treats a page with almost no text as unreadable", async () => {
    await processOne(db, {
      fetchPage: async () => ({
        ok: true as const,
        finalUrl: "https://example.com",
        html: "<html><body>Loading...</body></html>",
      }),
    });
    const row = onlyRow(db, "SELECT fetch_error FROM items WHERE fetch_state = 'failed'");
    expect(row.fetch_error).toBe("no_readable_text");
  });

  it("does not get stuck when the reader crashes", async () => {
    await processOne(db, {
      fetchPage: async () => {
        throw new Error("boom");
      },
    });
    expect(countFetchStates(db)).toEqual({ pending: 6, done: 0, failed: 1 });
    const row = onlyRow(db, "SELECT fetch_error FROM items WHERE fetch_state = 'failed'");
    expect(row.fetch_error).toBe("unexpected_error");
  });

  it("says so when nothing is waiting", async () => {
    const empty = openDatabase(":memory:");
    expect(await processOne(empty, { fetchPage: vi.fn() })).toBe(false);
  });

  it("works through the whole pile, one item per round", async () => {
    const fetchPage = vi.fn(async () => goodPage);
    let rounds = 0;
    while (await processOne(db, { fetchPage })) rounds++;
    expect(rounds).toBe(7);
    expect(countFetchStates(db)).toEqual({ pending: 0, done: 7, failed: 0 });
  });
});