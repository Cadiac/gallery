import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { TagPatchSchema } from "shared";
import { listTagsWithCounts, reorderTag, tagExists } from "../store";
import { requireAuth } from "../middleware";
import type { AppEnv } from "../types";

// Public GET drives the gallery filter chips and the admin tag autocomplete;
// the admin PATCH reorders techniques (filter + grouped-view ordering).
export const tags = new Hono<AppEnv>();

tags.get("/", (c) => c.json(listTagsWithCounts()));

tags.patch("/:id", requireAuth, zValidator("json", TagPatchSchema), (c) => {
  const id = Number(c.req.param("id"));
  if (!tagExists(id)) return c.json({ error: "Not found" }, 404);
  reorderTag(id, c.req.valid("json").position);
  return c.json(listTagsWithCounts());
});
