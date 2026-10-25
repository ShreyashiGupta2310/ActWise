import express, { type ErrorRequestHandler } from "express";
import type { Db } from "./db/database";
import { createImportRouter } from "./routes/importRoute";
import { createItemsRouter } from "./routes/itemsRoute";
import { createStatusRouter } from "./routes/statusRoute";

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err?.type === "entity.too.large") {
    res.status(413).json({
      error: { code: "TOO_LARGE", message: "That file is too large to import." },
    });
    return;
  }
  console.error("Unexpected error:", err instanceof Error ? err.message : "unknown");
  res.status(500).json({
    error: { code: "INTERNAL", message: "Something went wrong on the server." },
  });
};

export function createApp(db: Db) {
  const app = express();

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/api/import", createImportRouter(db));
  app.use("/api/items", createItemsRouter(db));
  app.use("/api/status", createStatusRouter(db));
  app.use(errorHandler);

  return app;
}