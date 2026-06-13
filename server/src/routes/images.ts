import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ImagePatchSchema } from "shared";
import { deleteImage, getArtworkById, getImage, reorderImage, setHero } from "../store";
import { previewThumbnail, removeImageFiles } from "../images";
import { requireAuth } from "../middleware";
import type { AppEnv } from "../types";

// All image routes are admin-only.
export const images = new Hono<AppEnv>();
images.use("*", requireAuth);

// Thumbnail a just-picked file (without saving it) so the admin UI can preview
// it — including HEIC, returned as a browser-displayable webp.
images.post("/preview", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!(file instanceof File)) return c.json({ error: "No image file provided" }, 400);
  const thumb = await previewThumbnail(file);
  return new Response(new Uint8Array(thumb), {
    status: 200,
    headers: { "Content-Type": "image/webp", "Cache-Control": "no-store" },
  });
});

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
