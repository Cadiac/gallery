import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url)); // server/src
export const REPO_ROOT = resolve(here, "../..");
export const VAR_DIR = resolve(here, "../var");
export const DB_PATH = resolve(VAR_DIR, "app.db");
export const WEB_DIST = resolve(REPO_ROOT, "web/dist");

// Uploaded artwork images. Gitignored (under server/var) and persisted across
// redeploys. Overridable via UPLOADS_DIR (tests point it at a temp directory).
export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? resolve(process.env.UPLOADS_DIR)
  : resolve(VAR_DIR, "uploads");
export const ORIGINALS_DIR = resolve(UPLOADS_DIR, "originals");
export const DISPLAY_DIR = resolve(UPLOADS_DIR, "display");
export const THUMBS_DIR = resolve(UPLOADS_DIR, "thumbs");
