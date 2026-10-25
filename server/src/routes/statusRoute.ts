import { Router } from "express";
import type { Db } from "../db/database";
import { countFetchFailures, countFetchStates, countItems } from "../db/itemsRepo";

export function createStatusRouter(db: Db): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({
      total: countItems(db),
      pages: {
        ...countFetchStates(db),
        failureReasons: countFetchFailures(db),
      },
    });
  });

  return router;
}