import { describe, expect, it } from "vitest";
import type { Analysis } from "../src/ai/analysisSchema";
import type { Deadline } from "../src/ai/verifyDeadline";
import { matchGoals, scoreItem } from "../src/scoring/priority";

const DAY = 86_400_000;
const now = new Date("2026-10-25T12:00:00Z");
const goals = ["internship", "react", "hackathon"];

const base: Analysis = {
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

const unknown: Deadline = { state: "unknown" };
const verifiedIn = (days: number): Deadline => ({
  state: "verified",
  date: new Date(now.getTime() + days * DAY).toISOString().slice(0, 10),
  quote: "Applications close soon",
});

const score = (over: Partial<Analysis> = {}, deadline: Deadline = unknown, savedAt: string | null = null) =>
  scoreItem({ analysis: { ...base, ...over }, deadline, savedAt, goals, now });

describe("scoreItem", () => {
  it("counts matched goals, and two matches is full relevance", () => {
    const result = score();
    expect(result.matchedGoals).toEqual(["internship", "react"]);
    expect(result.relevance).toBe(1);
  });

  it("gives half relevance for one match", () => {
    expect(score({ summary: "A job.", topics: ["react"], requirements: [] }).relevance).toBe(0.5);
  });

  it("scores a verified deadline in 14 days", () => {
    const result = score({}, verifiedIn(14));
    expect(result.daysLeft).toBe(14);
    expect(result.urgency).toBe(0.5);
    expect(result.effort).toBe(0.4);
    expect(result.expired).toBe(false);
    expect(result.score).toBeGreaterThan(60);
    expect(result.score).toBeLessThan(75);
  });

  it("gives no urgency to a deadline that was only mentioned", () => {
    const result = score({}, { state: "mentioned", quote: "deadline tomorrow" });
    expect(result.urgency).toBe(0);
    expect(result.reasons.join(" ")).toContain("could not be confirmed");
  });

  it("gives no urgency when there is no deadline", () => {
    const result = score({}, unknown);
    expect(result.urgency).toBe(0);
    expect(result.reasons.join(" ")).toContain("No deadline found");
  });

  it("marks a passed deadline as expired", () => {
    const result = score({}, verifiedIn(-1));
    expect(result.expired).toBe(true);
    expect(result.urgency).toBe(0);
  });

  it("gives zero relevance when no goal matches", () => {
    const result = score({ summary: "A cooking blog.", topics: ["cooking"], requirements: [] });
    expect(result.relevance).toBe(0);
    expect(result.matchedGoals).toEqual([]);
  });

  it("ignores the model's own why-it-may-matter text when matching goals", () => {
    const result = scoreItem({
      analysis: {
        ...base,
        summary: "A cooking blog.",
        topics: [],
        requirements: [],
        why_it_may_matter: "Great react internship hackathon!",
      },
      deadline: unknown,
      savedAt: null,
      goals,
      now,
    });
    expect(matchGoals(goals, { ...base, summary: "A cooking blog.", topics: [], requirements: [] })).toEqual([]);
    expect(result.relevance).toBe(0);
  });

  it("adds a gentle boost for items saved a long time ago", () => {
    const saved = new Date(now.getTime() - 90 * DAY).toISOString();
    expect(score({}, unknown, saved).age).toBe(0.5);
    expect(score({}, unknown, null).age).toBe(0);
  });

  it("follows the urgency table", () => {
    const table: [number, number][] = [
      [0, 1],
      [3, 1],
      [4, 0.8],
      [7, 0.8],
      [8, 0.5],
      [14, 0.5],
      [15, 0.25],
      [30, 0.25],
      [31, 0.1],
    ];
    for (const [days, expected] of table) {
      expect(score({}, verifiedIn(days)).urgency).toBe(expected);
    }
  });
});