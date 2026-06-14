import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { sessionMiddleware } from "./middleware";
import { ensureUploadDirs } from "./images";
import { auth } from "./routes/auth";
import { artworks } from "./routes/artworks";
import { images } from "./routes/images";
import { tags } from "./routes/tags";
import { getArtworkBySlug } from "./store";
import { artworkHtml, homeHtml, sitemap } from "./meta";
import { UPLOADS_DIR, WEB_DIST } from "./paths";
import type { AppEnv } from "./types";

/** Build the Hono app (no DB migration, no listener — callers handle those). */
export function createApp() {
  ensureUploadDirs();

  const app = new Hono<AppEnv>();
  app.use("*", sessionMiddleware);

  app.route("/api/auth", auth);
  app.route("/api/artworks", artworks);
  app.route("/api/images", images);
  app.route("/api/tags", tags);

  // Uploaded media: /media/<bucket>/<file> → server/var/uploads/<bucket>/<file>
  const uploadsRoot = relative(process.cwd(), UPLOADS_DIR) || ".";
  app.use(
    "/media/*",
    serveStatic({
      root: uploadsRoot,
      rewriteRequestPath: (p) => p.replace(/^\/media\//, "/"),
      // Filenames are content-random and never rewritten in place, so a media
      // URL's bytes never change — cache them hard (a year, immutable).
      onFound: (_path, c) => c.header("Cache-Control", "public, max-age=31536000, immutable"),
    }),
  );
  // A missing media file is a genuine 404 — don't let it fall through to the
  // SPA fallback below (which would answer with index.html and a 200).
  app.get("/media/*", (c) => c.json({ error: "Not found" }, 404));

  // Dynamic sitemap of the home page + every visible artwork.
  app.get("/sitemap.xml", (c) =>
    c.body(sitemap(c), 200, { "Content-Type": "application/xml; charset=utf-8" }),
  );

  // In production, serve the built SPA with a history-API fallback.
  if (process.env.NODE_ENV === "production" && existsSync(WEB_DIST)) {
    const webRoot = relative(process.cwd(), WEB_DIST) || ".";
    // Social scrapers don't run JS, so inject per-page OG/Twitter tags + <title>
    // into the HTML for the public routes. These must precede the static SPA
    // serving below so they win over the raw index.html.
    const indexHtml = readFileSync(join(WEB_DIST, "index.html"), "utf8");
    app.get("/", (c) => c.html(homeHtml(indexHtml, c)));
    app.get("/a/:slug", (c) => {
      const art = getArtworkBySlug(c.req.param("slug"));
      return c.html(art && !art.hidden ? artworkHtml(indexHtml, c, art) : homeHtml(indexHtml, c));
    });

    app.use("/*", serveStatic({ root: webRoot }));
    app.get("*", serveStatic({ path: `${webRoot}/index.html` }));
  }

  return app;
}
