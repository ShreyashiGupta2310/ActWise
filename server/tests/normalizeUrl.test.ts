import { describe, expect, it } from "vitest";
import { normalizeUrl } from "../src/import/normalizeUrl";

describe("normalizeUrl", () => {
  it("lowercases the host, drops fragment, tracking and trailing slash, sorts params", () => {
    expect(normalizeUrl("https://Example.com/Jobs/?utm_source=x&b=2&a=1#top")).toBe(
      "https://example.com/Jobs?a=1&b=2"
    );
  });

  it("treats two spellings of the same page as equal", () => {
    expect(normalizeUrl("https://example.com/careers/frontend-intern")).toBe(
      normalizeUrl("https://EXAMPLE.com/careers/frontend-intern/#apply")
    );
  });

  it("rejects anything that is not a web link", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("chrome://settings/")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
  });

  it("keeps the slash on a bare domain", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com/");
  });
});