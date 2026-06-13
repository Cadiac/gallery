import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { extname, join } from "node:path";
import sharp from "sharp";
import { DISPLAY_DIR, ORIGINALS_DIR, THUMBS_DIR, UPLOADS_DIR } from "./paths";

// Longest-edge caps for the derived sizes. The display image fronts the detail
// page; the thumb fills the gallery grid. Both keep aspect ratio and never
// upscale a small upload.
const DISPLAY_MAX = 2000;
const THUMB_MAX = 600;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/tiff": ".tif",
};

export interface ProcessedImage {
  /** Paths relative to UPLOADS_DIR, e.g. "thumbs/<rand>.webp". */
  originalPath: string;
  displayPath: string;
  thumbPath: string;
  /** Dimensions of the (aspect-preserving) display image. */
  width: number;
  height: number;
}

/** Create the upload subdirectories. Called once on startup. */
export function ensureUploadDirs(): void {
  for (const dir of [ORIGINALS_DIR, DISPLAY_DIR, THUMBS_DIR]) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Persist one uploaded file: keep the original verbatim, and generate a
 * web-sized display image and a grid thumbnail (both `.webp`). `rotate()`
 * bakes in EXIF orientation so phone photos aren't sideways.
 */
export async function processUpload(file: File): Promise<ProcessedImage> {
  const buf = Buffer.from(await file.arrayBuffer());
  const rand = randomBytes(12).toString("hex");

  const ext = EXT_BY_MIME[file.type] ?? (extname(file.name).toLowerCase() || ".bin");
  const originalName = `${rand}${ext}`;
  writeFileSync(join(ORIGINALS_DIR, originalName), buf);

  const base = sharp(buf).rotate();

  const displayName = `${rand}.webp`;
  const display = await base
    .clone()
    .resize({ width: DISPLAY_MAX, height: DISPLAY_MAX, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(join(DISPLAY_DIR, displayName));

  const thumbName = `${rand}.webp`;
  await base
    .clone()
    .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(join(THUMBS_DIR, thumbName));

  return {
    originalPath: `originals/${originalName}`,
    displayPath: `display/${displayName}`,
    thumbPath: `thumbs/${thumbName}`,
    width: display.width,
    height: display.height,
  };
}

/** Delete an image's three files; missing files are ignored. */
export function removeImageFiles(image: {
  original_path: string;
  display_path: string;
  thumb_path: string;
}): void {
  for (const rel of [image.original_path, image.display_path, image.thumb_path]) {
    try {
      unlinkSync(join(UPLOADS_DIR, rel));
    } catch {
      // ENOENT (or already gone) — nothing to clean up.
    }
  }
}
