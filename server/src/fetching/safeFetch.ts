import dns from "node:dns";
import net from "node:net";

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;

export type FetchResult =
  | { ok: true; finalUrl: string; html: string }
  | { ok: false; reason: string };

export interface FetchDeps {
  fetchImpl?: typeof fetch;
  lookupImpl?: (hostname: string) => Promise<string[]>;
}

function isBlockedIPv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isBlockedIPv6(ip: string): boolean {
  const x = ip.toLowerCase();
  if (x === "::" || x === "::1") return true;
  if (x.startsWith("::ffff:")) {
    const v4 = x.slice(7);
    return net.isIPv4(v4) ? isBlockedIPv4(v4) : true;
  }
  return /^(fc|fd|fe[89ab])/.test(x);
}

export function isBlockedAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return isBlockedIPv4(ip);
  if (net.isIPv6(ip)) return isBlockedIPv6(ip);
  return true;
}

async function defaultLookup(hostname: string): Promise<string[]> {
  const results = await dns.promises.lookup(hostname, { all: true });
  return results.map((r) => r.address);
}

async function readLimited(res: Response): Promise<string | null> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

export async function safeFetch(rawUrl: string, deps: FetchDeps = {}): Promise<FetchResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const lookup = deps.lookupImpl ?? defaultLookup;
  const deadline = AbortSignal.timeout(TIMEOUT_MS);

  let current: URL;
  try {
    current = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (current.protocol !== "http:" && current.protocol !== "https:") {
      return { ok: false, reason: "unsupported_protocol" };
    }

    const host = current.hostname.replace(/^\[|\]$/g, "");
    let addresses: string[];
    try {
      addresses = net.isIP(host) ? [host] : await lookup(host);
    } catch {
      return { ok: false, reason: "dns_failed" };
    }
    if (addresses.length === 0 || addresses.some(isBlockedAddress)) {
      return { ok: false, reason: "blocked_address" };
    }

    let res: Response;
    try {
      res = await fetchImpl(current, {
        redirect: "manual",
        signal: deadline,
        headers: {
          "User-Agent": "ActwiseBot/0.1 (personal bookmark reader)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch {
      return { ok: false, reason: deadline.aborted ? "timeout" : "network_error" };
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      await res.body?.cancel();
      if (!location) return { ok: false, reason: "bad_redirect" };
      try {
        current = new URL(location, current);
      } catch {
        return { ok: false, reason: "bad_redirect" };
      }
      continue;
    }

    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, reason: `http_${res.status}` };
    }

    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml\+xml/i.test(type)) {
      await res.body?.cancel();
      return { ok: false, reason: "not_html" };
    }

    let html: string | null;
    try {
      html = await readLimited(res);
    } catch {
      return { ok: false, reason: deadline.aborted ? "timeout" : "network_error" };
    }
    if (html === null) return { ok: false, reason: "too_large" };

    return { ok: true, finalUrl: current.toString(), html };
  }

  return { ok: false, reason: "too_many_redirects" };
}