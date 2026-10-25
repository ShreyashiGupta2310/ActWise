import { describe, expect, it, vi } from "vitest";
import { isBlockedAddress, safeFetch } from "../src/fetching/safeFetch";

const publicLookup = async () => ["93.184.216.34"];
const asFetch = (fn: unknown) => fn as typeof fetch;

const page = (body: string) =>
  new Response(body, { status: 200, headers: { "content-type": "text/html" } });
const redirect = (to: string) =>
  new Response(null, { status: 302, headers: { location: to } });

describe("isBlockedAddress", () => {
  it("blocks local and private addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "192.168.0.5",
      "172.16.0.1",
      "169.254.169.254",
      "::1",
      "fd00::1",
      "::ffff:127.0.0.1",
    ]) {
      expect(isBlockedAddress(ip)).toBe(true);
    }
  });

  it("allows normal public addresses", () => {
    for (const ip of ["93.184.216.34", "8.8.8.8", "2606:4700:4700::1111"]) {
      expect(isBlockedAddress(ip)).toBe(false);
    }
  });
});

describe("safeFetch", () => {
  it("returns the page for a normal link", async () => {
    const result = await safeFetch("https://example.com/a", {
      lookupImpl: publicLookup,
      fetchImpl: asFetch(async () => page("<html>hi</html>")),
    });
    expect(result).toEqual({
      ok: true,
      finalUrl: "https://example.com/a",
      html: "<html>hi</html>",
    });
  });

  it("refuses a site that points to a private address, without calling fetch", async () => {
    const fetchImpl = vi.fn();
    const result = await safeFetch("https://sneaky.example.com", {
      lookupImpl: async () => ["127.0.0.1"],
      fetchImpl: asFetch(fetchImpl),
    });
    expect(result).toEqual({ ok: false, reason: "blocked_address" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuses an address typed directly as numbers", async () => {
    const fetchImpl = vi.fn();
    const result = await safeFetch("http://169.254.169.254/latest/meta-data", {
      lookupImpl: publicLookup,
      fetchImpl: asFetch(fetchImpl),
    });
    expect(result).toEqual({ ok: false, reason: "blocked_address" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuses a redirect that leads to a private address", async () => {
    const result = await safeFetch("https://example.com/start", {
      lookupImpl: async (host) => (host === "intranet.local" ? ["10.0.0.5"] : ["93.184.216.34"]),
      fetchImpl: asFetch(vi.fn().mockResolvedValueOnce(redirect("http://intranet.local/"))),
    });
    expect(result).toEqual({ ok: false, reason: "blocked_address" });
  });

  it("follows a safe redirect", async () => {
    const result = await safeFetch("https://example.com/start", {
      lookupImpl: publicLookup,
      fetchImpl: asFetch(
        vi
          .fn()
          .mockResolvedValueOnce(redirect("/next"))
          .mockResolvedValueOnce(page("<html>arrived</html>"))
      ),
    });
    expect(result).toEqual({
      ok: true,
      finalUrl: "https://example.com/next",
      html: "<html>arrived</html>",
    });
  });

  it("gives up after too many redirects", async () => {
    const result = await safeFetch("https://example.com/loop", {
      lookupImpl: publicLookup,
      fetchImpl: asFetch(vi.fn(async () => redirect("https://example.com/loop"))),
    });
    expect(result).toEqual({ ok: false, reason: "too_many_redirects" });
  });

  it("refuses things that are not web pages", async () => {
    const result = await safeFetch("https://example.com/file.pdf", {
      lookupImpl: publicLookup,
      fetchImpl: asFetch(
        async () =>
          new Response("%PDF", { status: 200, headers: { "content-type": "application/pdf" } })
      ),
    });
    expect(result).toEqual({ ok: false, reason: "not_html" });
  });

  it("reports http errors", async () => {
    const result = await safeFetch("https://example.com/missing", {
      lookupImpl: publicLookup,
      fetchImpl: asFetch(async () => new Response("nope", { status: 404 })),
    });
    expect(result).toEqual({ ok: false, reason: "http_404" });
  });

  it("refuses pages that are too big", async () => {
    const result = await safeFetch("https://example.com/huge", {
      lookupImpl: publicLookup,
      fetchImpl: asFetch(async () => page("a".repeat(1_000_001))),
    });
    expect(result).toEqual({ ok: false, reason: "too_large" });
  });

  it("refuses links that are not http or https", async () => {
    for (const url of ["ftp://example.com/x", "file:///etc/passwd"]) {
      const result = await safeFetch(url, { lookupImpl: publicLookup });
      expect(result).toEqual({ ok: false, reason: "unsupported_protocol" });
    }
  });

  it("reports a failed name lookup", async () => {
    const result = await safeFetch("https://no-such-site.example", {
      lookupImpl: async () => {
        throw new Error("not found");
      },
    });
    expect(result).toEqual({ ok: false, reason: "dns_failed" });
  });
});