import { analyzePage, type AnalyzePage, type AnalyzeResult } from "../ai/analyze";
import { config } from "../config";
import type { Db } from "../db/database";
import {
  markAnalysisFailed,
  markAnalyzed,
  markFetchFailed,
  markFetched,
  nextPendingAnalysis,
  nextPendingFetch,
} from "../db/itemsRepo";
import { extractPageText } from "../fetching/extractText";
import { safeFetch, type FetchResult } from "../fetching/safeFetch";
import { workerState } from "./workerState";

const MIN_TEXT_CHARS = 40;

export interface WorkerDeps {
  fetchPage?: (url: string) => Promise<FetchResult>;
  analyze?: (page: AnalyzePage) => Promise<AnalyzeResult>;
}

export interface WorkerOptions {
  delayMs: number;
  idlePollMs: number;
  modelRetryMs: number;
}

export type AnalysisOutcome = "idle" | "done" | "model_unavailable";
export type NextOutcome = "fetched" | "analyzed" | "model_unavailable" | "idle";

function defaultAnalyze(page: AnalyzePage): Promise<AnalyzeResult> {
  return analyzePage(page, {
    ollama: {
      baseUrl: config.ollamaUrl,
      model: config.model,
      timeoutMs: config.ollamaTimeoutMs,
    },
    goals: config.goals,
  });
}

export async function processOne(db: Db, deps: WorkerDeps = {}): Promise<boolean> {
  const fetchPage = deps.fetchPage ?? ((url: string) => safeFetch(url));
  const item = nextPendingFetch(db);
  if (!item) return false;

  try {
    const result = await fetchPage(item.url);
    if (!result.ok) {
      markFetchFailed(db, item.id, result.reason);
    } else {
      const { text } = extractPageText(result.html);
      if (text.length < MIN_TEXT_CHARS) {
        markFetchFailed(db, item.id, "no_readable_text");
      } else {
        markFetched(db, item.id, text);
      }
    }
  } catch {
    markFetchFailed(db, item.id, "unexpected_error");
  }

  return true;
}

export async function processOneAnalysis(
  db: Db,
  deps: WorkerDeps = {}
): Promise<AnalysisOutcome> {
  const analyze = deps.analyze ?? defaultAnalyze;
  const item = nextPendingAnalysis(db);
  if (!item) return "idle";

  const started = Date.now();
  try {
    const result = await analyze({
      text: item.pageText,
      title: item.title,
      folderPath: item.folderPath,
      url: item.url,
    });

    if (!result.ok) {
      if (result.unavailable) {
        workerState.modelProblem = result.reason;
        return "model_unavailable";
      }
      workerState.modelProblem = null;
      markAnalysisFailed(db, item.id, result.reason);
    } else {
      workerState.modelProblem = null;
      const ms = Date.now() - started;
      markAnalyzed(
        db,
        item.id,
        JSON.stringify({
          analysis: result.analysis,
          deadline: result.deadline,
          model: config.model,
          attempts: result.attempts,
          ms,
        })
      );
      console.log(
        `Analyzed item ${item.id} in ${Math.round(ms / 1000)}s (${result.attempts} attempt(s))`
      );
    }
  } catch {
    markAnalysisFailed(db, item.id, "unexpected_error");
  }

  return "done";
}

export async function processNext(db: Db, deps: WorkerDeps = {}): Promise<NextOutcome> {
  if (await processOne(db, deps)) return "fetched";
  const outcome = await processOneAnalysis(db, deps);
  return outcome === "done" ? "analyzed" : outcome;
}

export function startWorker(db: Db, options: WorkerOptions, deps: WorkerDeps = {}) {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const tick = async () => {
    if (stopped) return;

    let delay = options.idlePollMs;
    try {
      const outcome = await processNext(db, deps);
      if (outcome === "fetched") delay = options.delayMs;
      else if (outcome === "analyzed") delay = 500;
      else if (outcome === "model_unavailable") delay = options.modelRetryMs;
    } catch (error) {
      console.error("Worker error:", error instanceof Error ? error.message : "unknown");
    }

    if (stopped) return;
    timer = setTimeout(tick, delay);
  };

  timer = setTimeout(tick, 0);

  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}