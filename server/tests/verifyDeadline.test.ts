import { describe, expect, it } from "vitest";
import { parseDatesInText, verifyDeadline } from "../src/ai/verifyDeadline";

const page =
  "Frontend Intern. Applications close on 30 Nov 2026 at midnight. Apply soon, deadline tomorrow! Stipend: unknown.";

describe("parseDatesInText", () => {
  it("reads the clear date styles", () => {
    for (const text of [
      "2026-11-30",
      "30 Nov 2026",
      "30th November, 2026",
      "Nov 30, 2026",
      "November 30th 2026",
    ]) {
      expect(parseDatesInText(text)).toEqual(["2026-11-30"]);
    }
  });

  it("ignores dates that could be read two ways", () => {
    expect(parseDatesInText("03/04/2026")).toEqual([]);
  });

  it("ignores dates that do not exist", () => {
    expect(parseDatesInText("31 Feb 2026")).toEqual([]);
  });
});

describe("verifyDeadline", () => {
  it("verifies a real quote with a matching date", () => {
    expect(
      verifyDeadline(
        { deadline_quote: "Applications close on 30 Nov 2026", deadline_date: "2026-11-30" },
        page
      )
    ).toEqual({
      state: "verified",
      date: "2026-11-30",
      quote: "Applications close on 30 Nov 2026",
    });
  });

  it("says unknown when the quote is not on the page (made up)", () => {
    expect(
      verifyDeadline(
        { deadline_quote: "Applications close on 5 Dec 2026", deadline_date: "2026-12-05" },
        page
      )
    ).toEqual({ state: "unknown" });
  });

  it("says unknown when there is no quote", () => {
    expect(verifyDeadline({ deadline_quote: null, deadline_date: null }, page)).toEqual({
      state: "unknown",
    });
  });

  it("only mentions the quote when the date does not match it", () => {
    expect(
      verifyDeadline(
        { deadline_quote: "Applications close on 30 Nov 2026", deadline_date: "2026-12-01" },
        page
      )
    ).toEqual({ state: "mentioned", quote: "Applications close on 30 Nov 2026" });
  });

  it("only mentions a quote with no real date in it", () => {
    expect(
      verifyDeadline({ deadline_quote: "deadline tomorrow", deadline_date: "2026-10-26" }, page)
    ).toEqual({ state: "mentioned", quote: "deadline tomorrow" });
  });

  it("only mentions a quote that holds two dates", () => {
    const text = "Opens 1 Oct 2026 and closes 30 Nov 2026 for all students.";
    expect(
      verifyDeadline(
        { deadline_quote: "Opens 1 Oct 2026 and closes 30 Nov 2026", deadline_date: "2026-11-30" },
        text
      )
    ).toEqual({ state: "mentioned", quote: "Opens 1 Oct 2026 and closes 30 Nov 2026" });
  });

  it("ignores capital letters and extra spaces when matching", () => {
    expect(
      verifyDeadline(
        { deadline_quote: "APPLICATIONS   close on 30 nov 2026", deadline_date: "2026-11-30" },
        page
      ).state
    ).toBe("verified");
  });

  it("says unknown for a very short quote", () => {
    expect(verifyDeadline({ deadline_quote: "2026", deadline_date: "2026-11-30" }, page)).toEqual({
      state: "unknown",
    });
  });
});