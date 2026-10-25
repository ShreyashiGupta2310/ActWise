export interface ImportSummary {
  totalLinks: number;
  added: number;
  duplicates: number;
  skipped: number;
}

export type Deadline =
  | { state: "verified"; date: string; quote: string }
  | { state: "mentioned"; quote: string }
  | { state: "unknown" };

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

export interface NeedsLookItem {
  id: number;
  url: string;
  title: string;
  reason: string;
}

export interface TodayResponse {
  items: TodayItem[];
  counts: { total: number; ready: number; waiting: number; needsLook: number };
  needsLook: NeedsLookItem[];
  goals: string[];
  modelProblem: string | null;
}

export type Action = "do" | "done" | "later" | "drop";

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error?.message ?? "Something went wrong.";
  } catch {
    return "Could not reach the server. Is it running?";
  }
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  throw new Error(await readErrorMessage(res));
}

export async function importBookmarks(html: string): Promise<ImportSummary> {
  const res = await fetch("/api/import", {
    method: "POST",
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: html,
  });
  return parseOrThrow<ImportSummary>(res);
}

export async function fetchToday(): Promise<TodayResponse> {
  const res = await fetch("/api/today");
  return parseOrThrow<TodayResponse>(res);
}

export async function sendAction(id: number, action: Action): Promise<void> {
  const res = await fetch(`/api/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
}