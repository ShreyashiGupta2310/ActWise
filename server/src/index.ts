import { createApp } from "./app";
import { config } from "./config";
import { openDatabase } from "./db/database";

const db = openDatabase(config.dbPath);

createApp(db).listen(config.port, () => {
  console.log(`Actwise server listening on http://localhost:${config.port}`);
});