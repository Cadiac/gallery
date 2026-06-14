import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ArtworkInputSchema, ArtworkPatchSchema } from "shared";
import {
  addImages,
  artworkExists,
  createArtwork,
  deleteArtwork,
  getArtworkById,
  getArtworkBySlug,
  listArtworks,
  patchArtwork,
} from "../store";
import { processUpload, removeImageFiles, type ProcessedImage } from "../images";
import { requireAuth } from "../middleware";
import type { AppEnv } from "../types";

export const artworks = new Hono<AppEnv>();

// --- public reads -----------------------------------------------------------

artworks.get("/", (c) => {
  const tag = c.req.query("tag") || undefined;
  const q = (c.req.query("q") ?? "").trim() || undefined;
  // Hidden pieces are only included for the authenticated admin, on request.
  const includeHidden = !!c.get("user") && c.req.query("includeHidden") === "1";
  return c.json(listArtworks({ tag, q, includeHidden }));
});

artworks.get("/:slug", (c) => {
  const artwork = getArtworkBySlug(c.req.param("slug"));
  // A hidden piece reads as a 404 to the public; the admin can still load it.
  if (!artwork || (artwork.hidden && !c.get("user"))) return c.json({ error: "Not found" }, 404);
  return c.json(artwork);
});

// --- admin writes -----------------------------------------------------------

artworks.post("/", requireAuth, zValidator("json", ArtworkInputSchema), (c) =>
  c.json(createArtwork(c.req.valid("json")), 201),
);

artworks.patch("/:id", requireAuth, zValidator("json", ArtworkPatchSchema), (c) => {
  const id = Number(c.req.param("id"));
  if (!artworkExists(id)) return c.json({ error: "Not found" }, 404);
  return c.json(patchArtwork(id, c.req.valid("json")));
});

artworks.delete("/:id", requireAuth, (c) => {
  const id = Number(c.req.param("id"));
  if (!artworkExists(id)) return c.json({ error: "Not found" }, 404);
  deleteArtwork(id).forEach(removeImageFiles);
  return c.json({ ok: true });
});

artworks.post("/:id/images", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  if (!artworkExists(id)) return c.json({ error: "Not found" }, 404);

  const body = await c.req.parseBody({ all: true });
  const field = body["files"];
  const candidates = Array.isArray(field) ? field : field ? [field] : [];
  const files = candidates.filter((f): f is File => f instanceof File);
  if (files.length === 0) return c.json({ error: "No image files provided" }, 400);

  const processed: ProcessedImage[] = [];
  for (const file of files) processed.push(await processUpload(file));
  addImages(id, processed);
  return c.json(getArtworkById(id), 201);
});
