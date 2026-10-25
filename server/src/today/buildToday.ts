import { z } from "zod";
import { analysisSchema } from "../ai/analysisSchema";
import type { Deadline } from "../ai/verifyDeadline";
import type { AnalyzedRow } from "../db/itemsRepo";
import { isActive, scoreItem } from "../scoring/priority";

export const TODAY_SIZE = 3;

export interface TodayItem {
  id: number;
  url: string;
  title: string;
  folderPath: string;
  savedAt: string | null;
  status: string;
  type: string;
  summary: string;
  whyItMayMatter: string;
  requirements: string[];
  nextStep: string;
  unknowns: string[];
  deadline: Deadline;
  score: number;
  reasons: string[];
}

const deadlineSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("verified"), date: z.string(), quote: z.string() }),
  z.object({ state: z.literal("mentioned"), quote: z.string() }),
  z.object({ state: z.literal("unknown") }),
]);

const storedSchema = z.object({ analysis: analysisSchema, deadline: deadlineSchema });

function parseStored(json: string) {
  try {
    const result = storedSchema.safeParse(JSON.parse(json));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

interface Candidate {
  item: TodayItem;
  doing: boolean;
  savedMs: number;
}

export function buildToday(
  rows: AnalyzedRow[],
  goals: string[],
  now: Date
): { items: TodayItem[]; ready: number } {
  const candidates: Candidate[] = [];

  for (const row of rows) {
    if (!isActive(row.userStatus, row.snoozeUntil, now)) continue;

    const stored = parseStored(row.analysisJson);
    if (!stored) continue;

    const result = scoreItem({
      analysis: stored.analysis,
      deadline: stored.deadline,
      savedAt: row.savedAt,
      goals,
      now,
    });
    if (result.expired) continue;
    if (result.relevance === 0 && result.urgency === 0) continue;

    const saved = row.savedAt ? Date.parse(row.savedAt) : NaN;
    candidates.push({
      doing: row.userStatus === "doing",
      savedMs: Number.isNaN(saved) ? Number.MAX_SAFE_INTEGER : saved,
      item: {
        id: row.id,
        url: row.url,
        title: row.title,
        folderPath: row.folderPath,
        savedAt: row.savedAt,
        status: row.userStatus,
        type: stored.analysis.type,
        summary: stored.analysis.summary,
        whyItMayMatter: stored.analysis.why_it_may_matter,
        requirements: stored.analysis.requirements,
        nextStep: stored.analysis.next_step,
        unknowns: stored.analysis.unknowns,
        deadline: stored.deadline,
        score: result.score,
        reasons: result.reasons,
      },
    });
  }

  candidates.sort(
    (a, b) =>
      Number(b.doing) - Number(a.doing) ||
      b.item.score - a.item.score ||
      a.savedMs - b.savedMs ||
      a.item.id - b.item.id
  );

  return { items: candidates.slice(0, TODAY_SIZE).map((c) => c.item), ready: candidates.length };
}