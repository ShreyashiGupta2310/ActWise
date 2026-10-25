import express, { Router } from "express";
import { config } from "../config";
import type { Db } from "../db/database";
import { importBookmarks } from "../import/importBookmarks";

export function createImportRouter(db: Db): Router {
  const router = Router();

  router.post(
    "/",
    express.text({ type: "*/*", limit: config.maxImportBytes }),
    (req, res) => {
      const html = req.body;

      if (typeof html !== "string" || html.trim() === "") {
        res.status(400).json({
          error: {
            code: "EMPTY_BODY",
            message: "Send the contents of your bookmarks.html file as the request body.",
          },
        });
        return;
      }

      const summary = importBookmarks(db, html);

      if (summary.totalLinks === 0) {
        res.status(422).json({
          error: {
            code: "NO_BOOKMARKS_FOUND",
            message: "No links found. Is this a Chrome bookmarks export (bookmarks.html)?",
          },
        });
        return;
      }

      res.json(summary);
    }
  );

  return router;
}