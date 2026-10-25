import { Router } from "express";
import type { Db } from "../db/database";
import {
  countAnalysisFailures,
  countAnalysisStates,
  countFetchFailures,
  countFetchStates,
  countItems,
} from "../db/itemsRepo";
import { workerState } from "../worker/workerState";

export function createStatusRouter(db: Db): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({
      total: countItems(db),
      pages: { ...countFetchStates(db), failureReasons: countFetchFailures(db) },
      analysis: { ...countAnalysisStates(db), failureReasons: countAnalysisFailures(db) },
      modelProblem: workerState.modelProblem,
    });
  });

  return router;
}