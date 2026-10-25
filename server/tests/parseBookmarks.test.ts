import { describe, expect, it } from "vitest";
import { parseBookmarksHtml } from "../src/import/parseBookmarks";
import { loadSampleBookmarks } from "./helpers";

describe("parseBookmarksHtml", () => {
  const { bookmarks, skipped } = parseBookmarksHtml(loadSampleBookmarks());
  const find = (part: string) => bookmarks.find((b) => b.url.includes(part));

  it("keeps web links and skips the rest", () => {
    expect(bookmarks).toHaveLength(8);
    expect(skipped).toBe(2);
  });

  it("remembers the folder path, including subfolders", () => {
    expect(find("example-repo")?.folderPath).toBe("Bookmarks bar > github");
    expect(find("ai-intern")?.folderPath).toBe("Bookmarks bar > inter > job");
    expect(find("diagram-maker")?.folderPath).toBe("Other bookmarks");
  });

  it("decodes html entities in titles", () => {
    expect(find("hackathon")?.title).toBe("Example Hackathon 2026 & Prizes");
  });

  it("converts the saved date, and uses null when it is missing", () => {
    expect(find("example-repo")?.savedAt).toBe("2023-11-14T22:13:20.000Z");
    expect(find("diagram-maker")?.savedAt).toBeNull();
  });

  it("returns nothing for empty or unrelated input", () => {
    expect(parseBookmarksHtml("")).toEqual({ bookmarks: [], skipped: 0 });
    expect(parseBookmarksHtml("<html>hello</html>")).toEqual({ bookmarks: [], skipped: 0 });
  });
});