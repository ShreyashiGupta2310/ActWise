import { DatabaseSync } from "node:sqlite";
import { config } from "../src/config";

const db = new DatabaseSync(config.dbPath);
const rows = db
  .prepare("SELECT fetch_state, analysis_state, analysis_json FROM items")
  .all() as unknown as {
  fetch_state: string;
  analysis_state: string;
  analysis_json: string | null;
}[];

let analysed = 0;
let retries = 0;
let totalMs = 0;
const deadlines: Record<string, number> = {};
const types: Record<string, number> = {};

for (const row of rows) {
  if (!row.analysis_json) continue;
  try {
    const stored = JSON.parse(row.analysis_json);
    analysed++;
    totalMs += Number(stored.ms) || 0;
    if (Number(stored.attempts) > 1) retries++;
    deadlines[stored.deadline?.state ?? "unknown"] =
      (deadlines[stored.deadline?.state ?? "unknown"] ?? 0) + 1;
    types[stored.analysis?.type ?? "other"] = (types[stored.analysis?.type ?? "other"] ?? 0) + 1;
  } catch {
    // ignore a damaged row
  }
}

const count = (key: "fetch_state" | "analysis_state", value: string) =>
  rows.filter((r) => r[key] === value).length;

console.log("Items:", rows.length);
console.log("Pages read:", count("fetch_state", "done"), "failed:", count("fetch_state", "failed"));
console.log("Analysed:", analysed, "failed:", count("analysis_state", "failed"));
console.log("Needed a second attempt:", retries);
console.log(
  "Average seconds per analysis:",
  analysed > 0 ? (totalMs / analysed / 1000).toFixed(1) : "n/a"
);
console.log("Deadline states:", deadlines);
console.log("Types:", types);
console.log("Model used:", config.model);