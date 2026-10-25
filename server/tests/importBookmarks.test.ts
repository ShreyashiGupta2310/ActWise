import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type Db } from "../src/db/database";
import { countItems } from "../src/db/itemsRepo";
import { importBookmarks } from "../src/import/importBookmarks";
import { loadSampleBookmarks } from "./helpers";

describe("importBookmarks", () => {
  let db: Db;

  beforeEach(() => {
    db = openDatabase(":memory:");
  });

  it("saves new bookmarks and reports what happened", () => {
    const summary = importBookmarks(db, loadSampleBookmarks());
    expect(summary).toEqual({ totalLinks: 10, added: 7, duplicates: 1, skipped: 2 });
    expect(countItems(db)).toBe(7);
  });

  it("importing the same file twice adds nothing new", () => {
    importBookmarks(db, loadSampleBookmarks());
    const second = importBookmarks(db, loadSampleBookmarks());
    expect(second.added).toBe(0);
    expect(second.duplicates).toBe(8);
    expect(countItems(db)).toBe(7);
  });

  it("keeps the first copy when the same page appears twice", () => {
    importBookmarks(db, loadSampleBookmarks());
    const rows = db
      .prepare("SELECT title FROM items WHERE url_normalized = ?")
      .all("https://example.com/careers/frontend-intern");
    expect(rows.map((r) => ({ ...r }))).toEqual([{ title: "Frontend Intern - Example Co" }]);
  });

  it("starts every new item as pending and new", () => {
    importBookmarks(db, loadSampleBookmarks());
    const row = db
      .prepare("SELECT fetch_state, analysis_state, user_status FROM items LIMIT 1")
      .get();
    expect({ ...row }).toEqual({
      fetch_state: "pending",
      analysis_state: "pending",
      user_status: "new",
    });
  });

  it("makes the database itself refuse an invalid status", () => {
    importBookmarks(db, loadSampleBookmarks());
    expect(() => db.prepare("UPDATE items SET user_status = 'banana'").run()).toThrow();
  });
});