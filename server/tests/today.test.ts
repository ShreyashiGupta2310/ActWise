import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { openDatabase, type Db } from "../src/db/database";
import { markAnalyzed, markFetchFailed, markFetched } from "../src/db/itemsRepo";
import { importBookmarks } from "../src/import/importBookmarks";
import { loadSampleBookmarks } from "./helpers";

const analysis = {
  type: "job",
  summary: "A frontend internship using React.",
  why_it_may_matter: "Fits your goals.",
  requirements: ["React"],
  topics: ["react", "internship"],
  deadline_quote: null,
  deadline_date: null,
  next_step: "Read the requirements.",
  unknowns: [],
};

function setup() {
  const db = openDatabase(":memory:");
  importBookmarks(db, loadSampleBookmarks());
  return { db, app: createApp(db) };
}

function analyzeItem(db: Db, id: number) {
  markFetched(db, id, "page text");
  markAnalyzed(db, id, JSON.stringify({ analysis, deadline: { state: "unknown" } }));
}

describe("GET /api/today", () => {
  it("lists an analysed item with its checks and the counts", async () => {
    const { db, app } = setup();
    analyzeItem(db, 1);

    const res = await request(app).get("/api/today");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      id: 1,
      type: "job",
      status: "new",
      deadline: { state: "unknown" },
    });
    expect(res.body.items[0].reasons.length).toBeGreaterThan(0);
    expect(res.body.counts).toEqual({ total: 7, ready: 1, waiting: 6, needsLook: 0 });
    expect(res.body.modelProblem).toBeNull();
  });

  it("lists pages that could not be read under needs a look", async () => {
    const { db, app } = setup();
    markFetchFailed(db, 2, "http_404");

    const res = await request(app).get("/api/today");
    expect(res.body.counts.needsLook).toBe(1);
    expect(res.body.needsLook[0]).toMatchObject({ id: 2, reason: "http_404" });
  });
});

describe("PATCH /api/items/:id", () => {
  it("drops an item so it leaves today", async () => {
    const { db, app } = setup();
    analyzeItem(db, 1);

    const patch = await request(app).patch("/api/items/1").send({ action: "drop" });
    expect(patch.status).toBe(200);
    expect(patch.body).toEqual({ ok: true, status: "dropped" });

    const today = await request(app).get("/api/today");
    expect(today.body.items).toHaveLength(0);
  });

  it("hides an item for a few days when told later", async () => {
    const { db, app } = setup();
    analyzeItem(db, 1);

    await request(app).patch("/api/items/1").send({ action: "later" });
    const today = await request(app).get("/api/today");
    expect(today.body.items).toHaveLength(0);
  });

  it("rejects an action it does not know", async () => {
    const { app } = setup();
    const bad = await request(app).patch("/api/items/1").send({ action: "explode" });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("BAD_ACTION");

    const empty = await request(app).patch("/api/items/1").send({});
    expect(empty.status).toBe(400);

    const sneaky = await request(app).patch("/api/items/1").send({ action: "toString" });
    expect(sneaky.status).toBe(400);
  });

  it("rejects an id that is not a number", async () => {
    const { app } = setup();
    const res = await request(app).patch("/api/items/abc").send({ action: "drop" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_ID");
  });

  it("says not found for an id that does not exist", async () => {
    const { app } = setup();
    const res = await request(app).patch("/api/items/999").send({ action: "drop" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});