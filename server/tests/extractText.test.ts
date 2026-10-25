import { describe, expect, it } from "vitest";
import { extractPageText } from "../src/fetching/extractText";

describe("extractPageText", () => {
  const html = `<html><head>
    <title>Frontend Intern &amp; Co</title>
    <meta name="description" content="Join us. Don't wait.">
    <style>body{color:red}</style>
  </head><body>
    <script>alert(1)</script>
    <h1>Frontend Intern</h1>
    <p>Apply by 30 Nov 2026.</p>
  </body></html>`;

  it("keeps the readable words, with the description first", () => {
    const page = extractPageText(html);
    expect(page.title).toBe("Frontend Intern & Co");
    expect(page.text.startsWith("Join us. Don't wait.")).toBe(true);
    expect(page.text).toContain("Apply by 30 Nov 2026.");
  });

  it("drops scripts and styles", () => {
    const page = extractPageText(html);
    expect(page.text).not.toContain("alert");
    expect(page.text).not.toContain("color:red");
  });

  it("cuts very long pages to the limit", () => {
    const page = extractPageText("<p>" + "a".repeat(10000) + "</p>", 100);
    expect(page.text.length).toBe(100);
  });

  it("copes with empty input", () => {
    expect(extractPageText("")).toEqual({ title: "", text: "" });
  });
});