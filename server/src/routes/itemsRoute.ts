import { Router } from "express";
import type { Db } from "../db/database";
import { countItems, listItems } from "../db/itemsRepo";

export function createItemsRouter(db: Db): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({ total: countItems(db), items: listItems(db, 100) });
  });

  return router;
}