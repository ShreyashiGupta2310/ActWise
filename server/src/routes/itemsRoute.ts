import express, { Router } from "express";
import type { Db } from "../db/database";
import { countItems, listItems, updateUserStatus } from "../db/itemsRepo";

const ACTIONS = { do: "doing", done: "done", later: "later", drop: "dropped" } as const;
const SNOOZE_DAYS = 3;

export function createItemsRouter(db: Db): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({ total: countItems(db), items: listItems(db, 100) });
  });

  router.patch("/:id", express.json({ limit: "1kb" }), (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: { code: "BAD_ID", message: "That item id is not valid." } });
      return;
    }

    const action = req.body?.action;
    if (typeof action !== "string" || !Object.hasOwn(ACTIONS, action)) {
      res.status(400).json({
        error: { code: "BAD_ACTION", message: "Action must be one of: do, done, later, drop." },
      });
      return;
    }

    const status = ACTIONS[action as keyof typeof ACTIONS];
    const snoozeUntil =
      action === "later"
        ? new Date(Date.now() + SNOOZE_DAYS * 86_400_000).toISOString()
        : null;

    if (!updateUserStatus(db, id, status, snoozeUntil)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "No item with that id." } });
      return;
    }

    res.json({ ok: true, status });
  });

  return router;
}