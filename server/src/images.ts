import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { extname, join } from "node:path";
import sharp from "sharp";
import heicConvert from "heic-convert";
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
 * Read a File into a buffer, converting iPhone HEIC/HEIF to JPEG (sharp's
 * prebuilt binary can't decode it, and most browsers can't display it). Returns
 * the buffer plus the extension the original should keep.
 */
async function decodeUpload(file: File): Promise<{ buf: Buffer; ext: string }> {
  const raw = Buffer.from(await file.arrayBuffer());
  if (/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
    const buf = Buffer.from(await heicConvert({ buffer: raw, format: "JPEG", quality: 0.92 }));
    return { buf, ext: ".jpg" };
  }
  return { buf: raw, ext: EXT_BY_MIME[file.type] ?? (extname(file.name).toLowerCase() || ".bin") };
}

/**
 * Generate a thumbnail `.webp` for an uploaded file without persisting anything.
 * Lets the admin UI preview a just-picked image (incl. HEIC, which it returns as
 * a browser-displayable webp) before the artwork is saved.
 */
export async function previewThumbnail(file: File): Promise<Buffer> {
  const { buf } = await decodeUpload(file);
  return sharp(buf)
    .rotate()
    .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

/**
 * Persist one uploaded file: keep the original verbatim, and generate a
 * web-sized display image and a grid thumbnail (both `.webp`). `rotate()`
 * bakes in EXIF orientation so phone photos aren't sideways.
 */
export async function processUpload(file: File): Promise<ProcessedImage> {
  // HEIC is converted to JPEG and kept as the served "original".
  const { buf, ext } = await decodeUpload(file);
  const rand = randomBytes(12).toString("hex");
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
