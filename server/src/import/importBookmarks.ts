import type { Db } from "../db/database";
import { insertItems, type NewItem } from "../db/itemsRepo";
import { normalizeUrl } from "./normalizeUrl";
import { parseBookmarksHtml } from "./parseBookmarks";

export interface ImportSummary {
  totalLinks: number;
  added: number;
  duplicates: number;
  skipped: number;
}

export function importBookmarks(db: Db, html: string): ImportSummary {
  const parsed = parseBookmarksHtml(html);
  const items: NewItem[] = [];
  let skipped = parsed.skipped;

  for (const bookmark of parsed.bookmarks) {
    const urlNormalized = normalizeUrl(bookmark.url);
    if (!urlNormalized) {
      skipped++;
      continue;
    }
    items.push({
      url: bookmark.url,
      urlNormalized,
      title: bookmark.title,
      folderPath: bookmark.folderPath,
      savedAt: bookmark.savedAt,
    });
  }

  const added = insertItems(db, items);

  return {
    totalLinks: parsed.bookmarks.length + parsed.skipped,
    added,
    duplicates: items.length - added,
    skipped,
  };
}