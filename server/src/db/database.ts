import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export type Db = DatabaseSync;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS items (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  url                TEXT NOT NULL,
  url_normalized     TEXT NOT NULL UNIQUE,
  title              TEXT NOT NULL,
  folder_path        TEXT NOT NULL DEFAULT '',
  saved_at           TEXT,
  imported_at        TEXT NOT NULL,

  fetch_state        TEXT NOT NULL DEFAULT 'pending'
                       CHECK (fetch_state IN ('pending', 'done', 'failed')),
  fetch_error        TEXT,
  page_text          TEXT,

  analysis_state     TEXT NOT NULL DEFAULT 'pending'
                       CHECK (analysis_state IN ('pending', 'done', 'failed')),
  analysis_json      TEXT,
  analysis_error     TEXT,

  priority_score     REAL,
  priority_breakdown TEXT,

  user_status        TEXT NOT NULL DEFAULT 'new'
                       CHECK (user_status IN ('new', 'doing', 'done', 'later', 'dropped')),
  snooze_until       TEXT
);
`;

export function openDatabase(file: string): Db {
  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA);
  return db;
}