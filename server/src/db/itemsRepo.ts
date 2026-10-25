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