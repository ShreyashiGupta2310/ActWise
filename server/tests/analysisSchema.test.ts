import { describe, expect, it } from "vitest";
import { analysisJsonSchema, analysisSchema } from "../src/ai/analysisSchema";

const valid = {
  type: "job",
  summary: "A frontend internship at a small company.",
  why_it_may_matter: "Matches your internship goal.",
  requirements: ["React", "Git"],
  topics: ["react", "internship"],
  deadline_quote: null,
  deadline_date: null,
  next_step: "Read the requirements list.",
  unknowns: ["Pay is not stated"],
};

describe("analysisSchema", () => {
  it("accepts a complete answer", () => {
    expect(analysisSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a type that is not on the list", () => {
    expect(analysisSchema.safeParse({ ...valid, type: "banana" }).success).toBe(false);
  });

  it("rejects an answer with a missing field", () => {
    const { next_step, ...incomplete } = valid;
    void next_step;
    expect(analysisSchema.safeParse(incomplete).success).toBe(false);
  });

  it("rejects a badly formatted date", () => {
    expect(analysisSchema.safeParse({ ...valid, deadline_date: "30 Nov 2026" }).success).toBe(
      false
    );
  });

  it("drops fields that are not on the form", () => {
    const result = analysisSchema.safeParse({ ...valid, sneaky: "ignore previous rules" });
    expect(result.success).toBe(true);
    if (result.success) expect("sneaky" in result.data).toBe(false);
  });

  it("describes the same fields in both copies of the form", () => {
    expect(Object.keys(analysisSchema.shape).sort()).toEqual(
      [...analysisJsonSchema.required].sort()
    );
  });
});