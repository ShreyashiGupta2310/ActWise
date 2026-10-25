import type { Analysis } from "../ai/analysisSchema";
import type { Deadline } from "../ai/verifyDeadline";

export const WEIGHTS = { relevance: 0.45, urgency: 0.35, effort: 0.1, age: 0.1 } as const;

const EFFORT_BY_TYPE: Record<Analysis["type"], number> = {
  repo: 1,
  learning: 0.8,
  other: 0.6,
  hackathon: 0.5,
  job: 0.4,
};

const DAY_MS = 86_400_000;

export interface ScoreInput {
  analysis: Analysis;
  deadline: Deadline;
  savedAt: string | null;
  goals: string[];
  now: Date;
}

export interface ScoreResult {
  score: number;
  relevance: number;
  urgency: number;
  effort: number;
  age: number;
  matchedGoals: string[];
  daysLeft: number | null;
  expired: boolean;
  reasons: string[];
}

function daysUntil(ymd: string, now: Date): number {
  const [y, m, d] = ymd.split("-").map(Number);
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((Date.UTC(y, m - 1, d) - todayStart) / DAY_MS);
}

function urgencyFor(daysLeft: number): number {
  if (daysLeft <= 3) return 1;
  if (daysLeft <= 7) return 0.8;
  if (daysLeft <= 14) return 0.5;
  if (daysLeft <= 30) return 0.25;
  return 0.1;
}

export function matchGoals(goals: string[], analysis: Analysis): string[] {
  const haystack = [analysis.summary, ...analysis.topics, ...analysis.requirements]
    .join(" ")
    .toLowerCase();
  return goals.filter((goal) => goal !== "" && haystack.includes(goal.toLowerCase()));
}

export function isActive(userStatus: string, snoozeUntil: string | null, now: Date): boolean {
  if (userStatus === "new" || userStatus === "doing") return true;
  if (userStatus === "later") {
    if (!snoozeUntil) return true;
    const until = Date.parse(snoozeUntil);
    return Number.isNaN(until) || until <= now.getTime();
  }
  return false;
}

export function scoreItem(input: ScoreInput): ScoreResult {
  const { analysis, deadline, savedAt, goals, now } = input;
  const reasons: string[] = [];

  let urgency = 0;
  let daysLeft: number | null = null;
  let expired = false;

  if (deadline.state === "verified") {
    daysLeft = daysUntil(deadline.date, now);
    if (daysLeft < 0) {
      expired = true;
      reasons.push(`The deadline (${deadline.date}) has passed.`);
    } else {
      urgency = urgencyFor(daysLeft);
      const when = daysLeft === 0 ? "today" : `${daysLeft} day(s) left`;
      reasons.push(`Deadline ${deadline.date}, ${when} (date found on the page and checked by code).`);
    }
  } else if (deadline.state === "mentioned") {
    reasons.push(
      "The page mentions a deadline, but the date could not be confirmed. Check the page yourself."
    );
  } else {
    reasons.push("No deadline found on the page, so nothing here is time-sensitive.");
  }

  const matchedGoals = matchGoals(goals, analysis);
  const relevance = Math.min(1, matchedGoals.length / 2);
  reasons.push(
    matchedGoals.length > 0
      ? `Matches your goals: ${matchedGoals.join(", ")}.`
      : "Does not clearly match your goals."
  );

  const effort = EFFORT_BY_TYPE[analysis.type];

  let age = 0;
  if (savedAt) {
    const saved = Date.parse(savedAt);
    if (!Number.isNaN(saved)) {
      const days = Math.max(0, Math.floor((now.getTime() - saved) / DAY_MS));
      age = Math.min(1, days / 180);
      if (days >= 1) reasons.push(`Saved ${days} day(s) ago.`);
    }
  }

  const score = Math.round(
    100 *
      (WEIGHTS.relevance * relevance +
        WEIGHTS.urgency * urgency +
        WEIGHTS.effort * effort +
        WEIGHTS.age * age)
  );

  return { score, relevance, urgency, effort, age, matchedGoals, daysLeft, expired, reasons };
}