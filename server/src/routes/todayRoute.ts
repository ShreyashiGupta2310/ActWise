import { Router } from "express";
import { config } from "../config";
import type { Db } from "../db/database";
import { countItems, countWaiting, listAnalyzed, listNeedsLook } from "../db/itemsRepo";
import { buildToday } from "../today/buildToday";
import { workerState } from "../worker/workerState";

export interface TodayOptions {
  goals?: string[];
  now?: () => Date;
}

export function createTodayRouter(db: Db, options: TodayOptions = {}): Router {
  const router = Router();
  const goals = options.goals ?? config.goals;
  const clock = options.now ?? (() => new Date());

  router.get("/", (_req, res) => {
    const { items, ready } = buildToday(listAnalyzed(db), goals, clock());
    const needsLook = listNeedsLook(db, 15);

    res.json({
      items,
      counts: {
        total: countItems(db),
        ready,
        waiting: countWaiting(db),
        needsLook: needsLook.total,
      },
      needsLook: needsLook.items,
      goals,
      modelProblem: workerState.modelProblem,
    });
  });

  return router;
}