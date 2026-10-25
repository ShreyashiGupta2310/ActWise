import fs from "node:fs";
import path from "node:path";

export function loadSampleBookmarks(): string {
  const file = path.resolve(process.cwd(), "..", "samples", "sample-bookmarks.html");
  return fs.readFileSync(file, "utf8");
}