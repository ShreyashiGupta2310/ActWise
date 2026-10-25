import path from "node:path";

export const config = {
  port: Number(process.env.PORT ?? 3001),
  dbPath:
    process.env.ACTWISE_DB_PATH ??
    path.resolve(__dirname, "..", "data", "actwise.db"),
  maxImportBytes: "10mb",
};