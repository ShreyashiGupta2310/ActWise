import { describe, expect, it } from "vitest";
import type { Analysis } from "../src/ai/analysisSchema";
import type { Deadline } from "../src/ai/verifyDeadline";
import type { AnalyzedRow } from "../src/db/itemsRepo";
import { buildToday } from "../src/today/buildToday";

const DAY = 86_400_000;
const now = new Date("2026-10-25T12:00:00Z");
const goals = ["react", "internship"];

const baseAnalysis: Analysis = {
  type: "job",
  summary: "A frontend internship.",
  why_it_may_matter: "Fits.",
  requirements: ["React"],
  topics: ["react", "internship"],
  deadline_quote: null,
  deadline_date: null,
  next_step: "Read it.",
  unknowns: [],
};

const stored = (over: Partial<Analysis> = {}, deadline: Deadline = { state: "unknown" }) =>
  JSON.stringify({ analysis: { ...baseAnalysis, ...over }, deadline });

const dateIn = (days: number) =>
  new Date(now.getTime() + days * DAY).toISOString().slice(0, 10);

const verified = (days: number): Deadline => ({
  state: "verified",
  date: dateIn(days),
  quote: "Applications close soon",
});

function row(id: number, over: Partial<AnalyzedRow> = {}): AnalyzedRow {
  return {
    id,
    url: `https://example.com/${id}`,
    title: `Item ${id}`,
    folderPath: "",
    savedAt: null,
    analysisJson: stored(),
    userStatus: "new",
    snoozeUntil: null,
    ...over,
  };
}

describe("buildToday", () => {
  it("ranks by score, keeps three, and reports how many were ready", () => {
    const rows = [
      row(1),
      row(2, { analysisJson: stored({}, verified(10)) }),
      row(3, { analysisJson: stored({}, verified(2)) }),
      row(4),
      row(5),
    ];
    const result = buildToday(rows, goals, now);
    expect(result.items).toHaveLength(3);
    expect(result.items.map((i) => i.id).slice(0, 2)).toEqual([3, 2]);
    expect(result.ready).toBe(5);
  });

  it("leaves out items whose verified deadline has passed", () => {
    const result = buildToday([row(1, { analysisJson: stored({}, verified(-1)) })], goals, now);
    expect(result).toEqual({ items: [], ready: 0 });
  });

  it("leaves out items that do not match the goals and have no deadline", () => {
    const off = stored({ summary: "A cooking blog.", topics: ["cooking"], requirements: [] });
    expect(buildToday([row(1, { analysisJson: off })], goals, now).ready).toBe(0);
  });

  it("hides dropped, done and still-snoozed items, and shows snoozes that ended", () => {
    const future = new Date(now.getTime() + DAY).toISOString();
    const past = new Date(now.getTime() - DAY).toISOString();
    const rows = [
      row(1, { userStatus: "dropped" }),
      row(2, { userStatus: "done" }),
      row(3, { userStatus: "later", snoozeUntil: future }),
      row(4, { userStatus: "later", snoozeUntil: past }),
    ];
    expect(buildToday(rows, goals, now).items.map((i) => i.id)).toEqual([4]);
  });

  it("keeps work in progress at the top", () => {
    const rows = [
      row(1, { userStatus: "doing" }),
      row(2, { analysisJson: stored({}, verified(1)) }),
    ];
    expect(buildToday(rows, goals, now).items[0].id).toBe(1);
  });

  it("skips a row whose stored answer is corrupted instead of crashing", () => {
    const rows = [row(1, { analysisJson: "not json" }), row(2)];
    expect(buildToday(rows, goals, now).items.map((i) => i.id)).toEqual([2]);
  });
});