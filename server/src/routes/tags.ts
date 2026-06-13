import { Hono } from "hono";
import { listTagsWithCounts } from "../store";
import type { AppEnv } from "../types";

// Public: drives the gallery filter chips and the admin tag autocomplete.
export const tags = new Hono<AppEnv>();

tags.get("/", (c) => c.json(listTagsWithCounts()));
