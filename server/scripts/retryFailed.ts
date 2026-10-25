import { DatabaseSync } from "node:sqlite";
import { config } from "../src/config";

const db = new DatabaseSync(config.dbPath);

const analysis = db
  .prepare(
    "UPDATE items SET analysis_state = 'pending', analysis_error = NULL WHERE analysis_state = 'failed'"
  )
  .run();
console.log("Analysis failures put back in the queue:", Number(analysis.changes));

if (process.argv.includes("--fetch")) {
  const fetch = db
    .prepare(
      "UPDATE items SET fetch_state = 'pending', fetch_error = NULL WHERE fetch_state = 'failed'"
    )
    .run();
  console.log("Page-reading failures put back in the queue:", Number(fetch.changes));
}