export interface ParsedBookmark {
  url: string;
  title: string;
  folderPath: string;
  savedAt: string | null;
}

export interface ParseResult {
  bookmarks: ParsedBookmark[];
  skipped: number;
}

const TAG = /<(\/?)(h3|a|dl)\b([^>]*)>([^<]*)/gi;

export function parseBookmarksHtml(html: string): ParseResult {
  const bookmarks: ParsedBookmark[] = [];
  let skipped = 0;
  const openFolders: string[] = [];
  let pendingFolderName = "";

  for (const match of html.matchAll(TAG)) {
    const [, slash, rawTag, attrs, rawText] = match;
    const isClosing = slash === "/";
    const tag = rawTag.toLowerCase();
    const text = decodeEntities(rawText).trim();

    if (tag === "dl") {
      if (isClosing) {
        openFolders.pop();
      } else {
        openFolders.push(pendingFolderName);
        pendingFolderName = "";
      }
    } else if (tag === "h3" && !isClosing) {
      pendingFolderName = text;
    } else if (tag === "a" && !isClosing) {
      const href = getAttr(attrs, "href");
      if (!href || !/^https?:\/\//i.test(href)) {
        skipped++;
        continue;
      }
      bookmarks.push({
        url: href,
        title: text || href,
        folderPath: openFolders.filter(Boolean).join(" > "),
        savedAt: toIsoDate(getAttr(attrs, "add_date")),
      });
    }
  }

  return { bookmarks, skipped };
}

function getAttr(attrs: string, name: string): string | null {
  const match = new RegExp(`\\b${name}="([^"]*)"`, "i").exec(attrs);
  return match ? decodeEntities(match[1]) : null;
}

function toIsoDate(unixSeconds: string | null): string | null {
  if (!unixSeconds) return null;
  const seconds = Number(unixSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return n <= 0x10ffff ? String.fromCodePoint(n) : "";
    })
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}