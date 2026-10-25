import { z } from "zod";

export const OPPORTUNITY_TYPES = ["job", "hackathon", "repo", "learning", "other"] as const;

export const analysisSchema = z.object({
  type: z.enum(OPPORTUNITY_TYPES),
  summary: z.string().trim().min(1).max(400),
  why_it_may_matter: z.string().trim().min(1).max(400),
  requirements: z.array(z.string().trim().min(1).max(200)).max(8),
  topics: z.array(z.string().trim().min(1).max(40)).max(8),
  deadline_quote: z.string().trim().min(1).max(300).nullable(),
  deadline_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  next_step: z.string().trim().min(1).max(300),
  unknowns: z.array(z.string().trim().min(1).max(200)).max(8),
});

export type Analysis = z.infer<typeof analysisSchema>;

export const analysisJsonSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: [...OPPORTUNITY_TYPES] },
    summary: { type: "string" },
    why_it_may_matter: { type: "string" },
    requirements: { type: "array", items: { type: "string" } },
    topics: { type: "array", items: { type: "string" } },
    deadline_quote: { anyOf: [{ type: "string" }, { type: "null" }] },
    deadline_date: { anyOf: [{ type: "string" }, { type: "null" }] },
    next_step: { type: "string" },
    unknowns: { type: "array", items: { type: "string" } },
  },
  required: [
    "type",
    "summary",
    "why_it_may_matter",
    "requirements",
    "topics",
    "deadline_quote",
    "deadline_date",
    "next_step",
    "unknowns",
  ],
};