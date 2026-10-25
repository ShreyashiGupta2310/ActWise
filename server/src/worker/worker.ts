import type { Db } from "../db/database";
import { markFetchFailed, markFetched, nextPendingFetch } from "../db/itemsRepo";
import { extractPageText } from "../fetching/extractText";
import { safeFetch, type FetchResult } from "../fetching/safeFetch";

const MIN_TEXT_CHARS = 40;

export interface WorkerDeps {
  fetchPage?: (url: string) => Promise<FetchResult>;
}

export interface WorkerOptions {
  delayMs: number;
  idlePollMs: number;
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

export function startWorker(db: Db, options: WorkerOptions, deps: WorkerDeps = {}) {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const tick = async () => {
    if (stopped) return;

    let didWork = false;
    try {
      didWork = await processOne(db, deps);
    } catch (error) {
      console.error("Worker error:", error instanceof Error ? error.message : "unknown");
    }

    if (stopped) return;
    timer = setTimeout(tick, didWork ? options.delayMs : options.idlePollMs);
  };

  timer = setTimeout(tick, 0);

  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}