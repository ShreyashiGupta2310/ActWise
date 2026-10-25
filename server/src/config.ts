import path from "node:path";

export const config = {
  port: Number(process.env.PORT ?? 3001),
  dbPath:
    process.env.ACTWISE_DB_PATH ??
    path.resolve(__dirname, "..", "data", "actwise.db"),
  maxImportBytes: "10mb",

  workerEnabled: process.env.ACTWISE_WORKER !== "off",
  workerDelayMs: 2000,
  workerIdlePollMs: 5000,
  workerModelRetryMs: 30_000,

  ollamaUrl: process.env.OLLAMA_URL ?? "http://127.0.0.1:11434",
  model: process.env.ACTWISE_MODEL ?? "gemma3:4b",
  ollamaTimeoutMs: 240_000,

  goals: (process.env.ACTWISE_GOALS ??
    "internship,frontend,react,typescript,hackathon,open source")
    .split(",")
    .map((g) => g.trim().toLowerCase())
    .filter(Boolean),
};