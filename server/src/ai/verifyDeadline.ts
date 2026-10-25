import type { Analysis } from "./analysisSchema";

export type Deadline =
  | { state: "verified"; date: string; quote: string }
  | { state: "mentioned"; quote: string }
  | { state: "unknown" };

const MIN_QUOTE_CHARS = 8;

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const MONTH_PATTERN = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join("|");

function squash(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function toValidYmd(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!real) return null;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function parseDatesInText(text: string): string[] {
  const found = new Set<string>();
  const add = (year: number, month: number, day: number) => {
    const ymd = toValidYmd(year, month, day);
    if (ymd) found.add(ymd);
  };

  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    add(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  const dayFirst = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_PATTERN})\\.?,?\\s+(\\d{4})\\b`,
    "gi"
  );
  for (const m of text.matchAll(dayFirst)) {
    add(Number(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]));
  }

  const monthFirst = new RegExp(
    `\\b(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`,
    "gi"
  );
  for (const m of text.matchAll(monthFirst)) {
    add(Number(m[3]), MONTHS[m[1].toLowerCase()], Number(m[2]));
  }

  return [...found];
}

export function verifyDeadline(
  analysis: Pick<Analysis, "deadline_quote" | "deadline_date">,
  pageText: string
): Deadline {
  const quote = analysis.deadline_quote?.trim();
  if (!quote || quote.length < MIN_QUOTE_CHARS) return { state: "unknown" };

  if (!squash(pageText).includes(squash(quote))) return { state: "unknown" };

  const dates = parseDatesInText(quote);
  if (dates.length === 1 && dates[0] === analysis.deadline_date) {
    return { state: "verified", date: dates[0], quote };
  }

  return { state: "mentioned", quote };
}