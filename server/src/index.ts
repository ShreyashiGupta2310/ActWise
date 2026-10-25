import { createApp } from "./app";
import { config } from "./config";
import { openDatabase } from "./db/database";
import { startWorker } from "./worker/worker";

const db = openDatabase(config.dbPath);

createApp(db).listen(config.port, () => {
  console.log(`Actwise server listening on http://localhost:${config.port}`);
});

if (config.workerEnabled) {
  startWorker(db, {
    delayMs: config.workerDelayMs,
    idlePollMs: config.workerIdlePollMs,
  });
  console.log("Background reader is on: it visits your saved links slowly, one at a time.");
} else {
  console.log("Background reader is off.");
}