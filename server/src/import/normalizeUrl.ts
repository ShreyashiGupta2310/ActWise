const TRACKING_PARAM = /^(utm_.+|fbclid|gclid|mc_cid|mc_eid|igshid)$/i;

export function normalizeUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  url.hash = "";

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();

  url.pathname = url.pathname.replace(/\/+$/, "") || "/";

  return url.toString();
}