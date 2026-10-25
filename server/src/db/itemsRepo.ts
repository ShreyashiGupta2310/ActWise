import type { Db } from "./database";

export interface NewItem {
  url: string;
  urlNormalized: string;
  title: string;
  folderPath: string;
  savedAt: string | null;
}

export interface ItemRow {
  id: number;
  url: string;
  title: string;
  folderPath: string;
  savedAt: string | null;
  fetchState: string;
  analysisState: string;
  userStatus: string;
}

export function insertItems(
  db: Db,
  items: NewItem[],
  now: string = new Date().toISOString()
): number {
  const insert = db.prepare(`
    INSERT INTO items (url, url_normalized, title, folder_path, saved_at, imported_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(url_normalized) DO NOTHING
  `);

  let added = 0;
  db.exec("BEGIN");
  try {
    for (const item of items) {
      const result = insert.run(
        item.url,
        item.urlNormalized,
        item.title,
        item.folderPath,
        item.savedAt,
        now
      );
      added += Number(result.changes);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return added;
}

export function listItems(db: Db, limit: number): ItemRow[] {
  return db
    .prepare(
      `SELECT id, url, title,
              folder_path AS folderPath,
              saved_at AS savedAt,
              fetch_state AS fetchState,
              analysis_state AS analysisState,
              user_status AS userStatus
       FROM items
       ORDER BY id
       LIMIT ?`
    )
        .all(limit) as unknown as ItemRow[];
}

export function countItems(db: Db): number {
  const row = db.prepare("SELECT COUNT(*) AS n FROM items").get() as unknown as { n: number };
  return row.n;
}
export interface PendingFetch {
  id: number;
  url: string;
}

export function nextPendingFetch(db: Db): PendingFetch | undefined {
  const row = db
    .prepare("SELECT id, url FROM items WHERE fetch_state = 'pending' ORDER BY id LIMIT 1")
    .get() as unknown as PendingFetch | undefined;
  return row ? { id: Number(row.id), url: String(row.url) } : undefined;
}

export function markFetched(db: Db, id: number, pageText: string): void {
  db.prepare(
    "UPDATE items SET fetch_state = 'done', page_text = ?, fetch_error = NULL WHERE id = ?"
  ).run(pageText, id);
}

export function markFetchFailed(db: Db, id: number, reason: string): void {
  db.prepare("UPDATE items SET fetch_state = 'failed', fetch_error = ? WHERE id = ?").run(
    reason,
    id
  );
}

export interface StateCounts {
  pending: number;
  done: number;
  failed: number;
}

export function countFetchStates(db: Db): StateCounts {
  const rows = db
    .prepare("SELECT fetch_state AS state, COUNT(*) AS n FROM items GROUP BY fetch_state")
    .all() as unknown as { state: string; n: number }[];
  const counts: StateCounts = { pending: 0, done: 0, failed: 0 };
  for (const row of rows) {
    if (row.state === "pending" || row.state === "done" || row.state === "failed") {
      counts[row.state] = Number(row.n);
    }
  }
  return counts;
}

export function countFetchFailures(db: Db): Record<string, number> {
  const rows = db
    .prepare(
      `SELECT fetch_error AS reason, COUNT(*) AS n
       FROM items WHERE fetch_state = 'failed' GROUP BY fetch_error`
    )
    .all() as unknown as { reason: string | null; n: number }[];
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.reason ?? "unknown"] = Number(row.n);
  }
  return result;
}