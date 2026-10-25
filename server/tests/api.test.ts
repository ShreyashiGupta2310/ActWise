import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { openDatabase } from "../src/db/database";
import { loadSampleBookmarks } from "./helpers";

function freshApp() {
  return createApp(openDatabase(":memory:"));
}

describe("API", () => {
  it("health check answers ok", async () => {
    const res = await request(freshApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("imports a bookmarks file, then lists the items", async () => {
    const app = freshApp();

    const imported = await request(app)
      .post("/api/import")
      .set("Content-Type", "text/html")
      .send(loadSampleBookmarks());
    expect(imported.status).toBe(200);
    expect(imported.body).toEqual({ totalLinks: 10, added: 7, duplicates: 1, skipped: 2 });

    const list = await request(app).get("/api/items");
    expect(list.body.total).toBe(7);
    expect(list.body.items[0]).toMatchObject({
      title: "example-org/example-repo: a sample open source project",
      folderPath: "Bookmarks bar > github",
      userStatus: "new",
    });
  });

  it("rejects an empty upload", async () => {
    const res = await request(freshApp())
      .post("/api/import")
      .set("Content-Type", "text/html")
      .send("");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("EMPTY_BODY");
  });

  it("rejects a file with no links in it", async () => {
    const res = await request(freshApp())
      .post("/api/import")
      .set("Content-Type", "text/html")
      .send("<html>hello</html>");
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("NO_BOOKMARKS_FOUND");
  });
});