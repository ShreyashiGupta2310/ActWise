import { decodeEntities } from "../util/decodeEntities";

export interface ExtractedPage {
  title: string;
  text: string;
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function metaContent(html: string, name: string): string {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const key = /(?:name|property)\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1]?.toLowerCase();
    if (key === name) {
      const match = /content\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);
      return match?.[1] ?? match?.[2] ?? "";
    }
  }
  return "";
}

export function extractPageText(html: string, maxChars = 4000): ExtractedPage {
  const title = collapse(
    decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "")
  );

  const description = metaContent(html, "description") || metaContent(html, "og:description");

  const body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  const text = collapse(decodeEntities(`${description} ${body}`));

  return { title, text: text.slice(0, maxChars) };
}