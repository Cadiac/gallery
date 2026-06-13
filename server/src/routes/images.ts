import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ImagePatchSchema } from "shared";
import { deleteImage, getArtworkById, getImage, reorderImage, setHero } from "../store";
import { removeImageFiles } from "../images";
import { requireAuth } from "../middleware";
import type { AppEnv } from "../types";

// All image mutations are admin-only.
export const images = new Hono<AppEnv>();
images.use("*", requireAuth);

images.patch("/:id", zValidator("json", ImagePatchSchema), (c) => {
  const id = Number(c.req.param("id"));
  const img = getImage(id);
  if (!img) return c.json({ error: "Not found" }, 404);

  const { isHero, position } = c.req.valid("json");
  if (isHero) setHero(id);
  if (position !== undefined) reorderImage(img.artwork_id, id, position);
  return c.json(getArtworkById(img.artwork_id));
});

images.delete("/:id", (c) => {
  const id = Number(c.req.param("id"));
  const img = getImage(id);
  if (!img) return c.json({ error: "Not found" }, 404);

  deleteImage(id);
  removeImageFiles(img);
  return c.json(getArtworkById(img.artwork_id));
});
