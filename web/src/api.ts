export interface ImportSummary {
  totalLinks: number;
  added: number;
  duplicates: number;
  skipped: number;
}

export interface Item {
  id: number;
  url: string;
  title: string;
  folderPath: string;
  savedAt: string | null;
  fetchState: string;
  analysisState: string;
  userStatus: string;
}

export interface ItemsResponse {
  total: number;
  items: Item[];
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error?.message ?? "Something went wrong.";
  } catch {
    return "Could not reach the server. Is it running?";
  }
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  throw new Error(await readErrorMessage(res));
}

export async function importBookmarks(html: string): Promise<ImportSummary> {
  const res = await fetch("/api/import", {
    method: "POST",
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: html,
  });
  return parseOrThrow<ImportSummary>(res);
}

export async function fetchItems(): Promise<ItemsResponse> {
  const res = await fetch("/api/items");
  return parseOrThrow<ItemsResponse>(res);
}