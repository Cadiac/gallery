import type {
  Artwork,
  ArtworkDetail,
  ArtworkInput,
  ArtworkListItem,
  ArtworkPatch,
  Image,
  Tag,
  TagWithCount,
} from "shared";
import { uniqueSlug } from "shared";
import { db } from "./db";
import type { ProcessedImage } from "./images";

interface ArtworkRow {
  id: number;
  slug: string;
  title: string;
  description: string;
  year: string | null;
  dimensions: string | null;
  position: number;
  hidden: number;
  created_at: string;
  updated_at: string;
}

export interface ImageRow {
  id: number;
  artwork_id: number;
  position: number;
  is_hero: number;
  original_path: string;
  display_path: string;
  thumb_path: string;
  width: number;
  height: number;
}

interface TagRow {
  id: number;
  name: string;
  slug: string;
}

const mediaUrl = (relPath: string) => `/media/${relPath}`;

function mapArtwork(r: ArtworkRow): Artwork {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    year: r.year,
    dimensions: r.dimensions,
    position: r.position,
    hidden: !!r.hidden,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapImage(r: ImageRow): Image {
  return {
    id: r.id,
    artworkId: r.artwork_id,
    position: r.position,
    isHero: !!r.is_hero,
    thumbUrl: mediaUrl(r.thumb_path),
    displayUrl: mediaUrl(r.display_path),
    originalUrl: mediaUrl(r.original_path),
    width: r.width,
    height: r.height,
  };
}

const mapTag = (r: TagRow): Tag => ({ id: r.id, name: r.name, slug: r.slug });

function tagsFor(artworkId: number): Tag[] {
  const rows = db
    .prepare(
      `SELECT t.id, t.name, t.slug FROM tags t
       JOIN artwork_tags at ON at.tag_id = t.id
       WHERE at.artwork_id = ? ORDER BY t.name`,
    )
    .all(artworkId) as unknown as TagRow[];
  return rows.map(mapTag);
}

function imagesFor(artworkId: number): Image[] {
  const rows = db
    .prepare("SELECT * FROM images WHERE artwork_id = ? ORDER BY position, id")
    .all(artworkId) as unknown as ImageRow[];
  return rows.map(mapImage);
}

function buildDetail(r: ArtworkRow): ArtworkDetail {
  return { ...mapArtwork(r), tags: tagsFor(r.id), images: imagesFor(r.id) };
}

// --- reads ------------------------------------------------------------------

export function listArtworks(
  opts: { tag?: string; q?: string; includeHidden?: boolean } = {},
): ArtworkListItem[] {
  const where: string[] = [];
  const params: Record<string, string> = {};
  // Public callers only ever see visible pieces; the admin opts into hidden ones.
  if (!opts.includeHidden) where.push("a.hidden = 0");
  if (opts.tag) {
    where.push(
      `a.id IN (SELECT at.artwork_id FROM artwork_tags at
                JOIN tags t ON t.id = at.tag_id WHERE t.slug = @tag)`,
    );
    params.tag = opts.tag;
  }
  if (opts.q) {
    where.push("(a.title LIKE @q OR a.description LIKE @q)");
    params.q = `%${opts.q}%`;
  }
  const sql = `SELECT * FROM artworks a ${
    where.length ? `WHERE ${where.join(" AND ")}` : ""
  } ORDER BY a.position, a.id`;
  const stmt = db.prepare(sql);
  const rows = (Object.keys(params).length ? stmt.all(params) : stmt.all()) as unknown as ArtworkRow[];

  return rows.map((r) => {
    const hero =
      (db
        .prepare("SELECT * FROM images WHERE artwork_id = ? AND is_hero = 1 LIMIT 1")
        .get(r.id) as unknown as ImageRow | undefined) ??
      (db
        .prepare("SELECT * FROM images WHERE artwork_id = ? ORDER BY position, id LIMIT 1")
        .get(r.id) as unknown as ImageRow | undefined);
    return {
      ...mapArtwork(r),
      tags: tagsFor(r.id),
      heroThumbUrl: hero ? mediaUrl(hero.thumb_path) : null,
      heroWidth: hero ? hero.width : null,
      heroHeight: hero ? hero.height : null,
    };
  });
}

export function getArtworkBySlug(slug: string): ArtworkDetail | null {
  const r = db.prepare("SELECT * FROM artworks WHERE slug = ?").get(slug) as unknown as
    | ArtworkRow
    | undefined;
  return r ? buildDetail(r) : null;
}

export function getArtworkById(id: number): ArtworkDetail | null {
  const r = db.prepare("SELECT * FROM artworks WHERE id = ?").get(id) as unknown as
    | ArtworkRow
    | undefined;
  return r ? buildDetail(r) : null;
}

export function artworkExists(id: number): boolean {
  return !!db.prepare("SELECT 1 FROM artworks WHERE id = ?").get(id);
}

export function listTagsWithCounts(): TagWithCount[] {
  return db
    .prepare(
      // Count only visible artworks, so hidden pieces don't inflate the chips;
      // a tag left with no visible artworks drops out (INNER JOIN).
      `SELECT t.id, t.name, t.slug, t.position, COUNT(a.id) AS count
       FROM tags t
       JOIN artwork_tags at ON at.tag_id = t.id
       JOIN artworks a ON a.id = at.artwork_id AND a.hidden = 0
       GROUP BY t.id ORDER BY t.position, t.id`,
    )
    .all() as unknown as TagWithCount[];
}

export function tagExists(id: number): boolean {
  return !!db.prepare("SELECT 1 FROM tags WHERE id = ?").get(id);
}

/** Move a tag to a new zero-based index in the manual technique order. */
export function reorderTag(id: number, newIndex: number): void {
  const ids = (
    db.prepare("SELECT id FROM tags ORDER BY position, id").all() as unknown as { id: number }[]
  ).map((r) => r.id);
  resequence("tags", ids, id, newIndex);
}

// --- tags -------------------------------------------------------------------

function upsertTag(name: string): number {
  const existing = db.prepare("SELECT id FROM tags WHERE name = ?").get(name) as unknown as
    | { id: number }
    | undefined;
  if (existing) return existing.id;
  const slug = uniqueSlug(name, (s) => !!db.prepare("SELECT 1 FROM tags WHERE slug = ?").get(s));
  // New techniques append to the end of the manual order.
  const { m: maxPos } = db
    .prepare("SELECT COALESCE(MAX(position), -1) AS m FROM tags")
    .get() as unknown as { m: number };
  const info = db
    .prepare("INSERT INTO tags (name, slug, position) VALUES (?, ?, ?)")
    .run(name, slug, maxPos + 1);
  return Number(info.lastInsertRowid);
}

function pruneOrphanTags(): void {
  db.prepare("DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM artwork_tags)").run();
}

/** Replace an artwork's tags from a free-form name list (trimmed, deduped). */
export function setArtworkTags(artworkId: number, names: string[]): void {
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push(name);
  }
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM artwork_tags WHERE artwork_id = ?").run(artworkId);
    const link = db.prepare("INSERT OR IGNORE INTO artwork_tags (artwork_id, tag_id) VALUES (?, ?)");
    for (const name of clean) link.run(artworkId, upsertTag(name));
    pruneOrphanTags();
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

// --- artwork writes ---------------------------------------------------------

export function createArtwork(input: ArtworkInput): ArtworkDetail {
  const slug = uniqueSlug(
    input.title,
    (s) => !!db.prepare("SELECT 1 FROM artworks WHERE slug = ?").get(s),
  );
  const { m: maxPos } = db
    .prepare("SELECT COALESCE(MAX(position), -1) AS m FROM artworks")
    .get() as unknown as { m: number };
  const info = db
    .prepare(
      `INSERT INTO artworks (slug, title, description, year, dimensions, position)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(slug, input.title, input.description, input.year, input.dimensions, maxPos + 1);
  const id = Number(info.lastInsertRowid);
  setArtworkTags(id, input.tags);
  return getArtworkById(id)!;
}

export function patchArtwork(id: number, patch: ArtworkPatch): ArtworkDetail | null {
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  if (patch.title !== undefined) (sets.push("title = ?"), vals.push(patch.title));
  if (patch.description !== undefined) (sets.push("description = ?"), vals.push(patch.description));
  if (patch.year !== undefined) (sets.push("year = ?"), vals.push(patch.year));
  if (patch.dimensions !== undefined) (sets.push("dimensions = ?"), vals.push(patch.dimensions));
  if (patch.hidden !== undefined) (sets.push("hidden = ?"), vals.push(patch.hidden ? 1 : 0));
  if (sets.length) {
    sets.push("updated_at = datetime('now')");
    db.prepare(`UPDATE artworks SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
  }
  if (patch.tags !== undefined) setArtworkTags(id, patch.tags);
  if (patch.position !== undefined) reorderArtwork(id, patch.position);
  return getArtworkById(id);
}

/** Delete an artwork (cascades images + tag links). Returns its image rows so
 * the caller can unlink the files. */
export function deleteArtwork(id: number): ImageRow[] {
  const imgs = db
    .prepare("SELECT * FROM images WHERE artwork_id = ?")
    .all(id) as unknown as ImageRow[];
  db.prepare("DELETE FROM artworks WHERE id = ?").run(id);
  pruneOrphanTags();
  return imgs;
}

/** Move an artwork to a new zero-based index in the global gallery order. */
export function reorderArtwork(id: number, newIndex: number): void {
  const ids = (
    db.prepare("SELECT id FROM artworks ORDER BY position, id").all() as unknown as {
      id: number;
    }[]
  ).map((r) => r.id);
  resequence("artworks", ids, id, newIndex);
}

// --- image writes -----------------------------------------------------------

export function getImage(id: number): ImageRow | undefined {
  return db.prepare("SELECT * FROM images WHERE id = ?").get(id) as unknown as ImageRow | undefined;
}

/** Append processed images. The first image of an empty artwork becomes hero. */
export function addImages(artworkId: number, processed: ProcessedImage[]): void {
  const { n, m } = db
    .prepare("SELECT COUNT(*) AS n, COALESCE(MAX(position), -1) AS m FROM images WHERE artwork_id = ?")
    .get(artworkId) as unknown as { n: number; m: number };
  const insert = db.prepare(
    `INSERT INTO images (artwork_id, position, is_hero, original_path, display_path, thumb_path, width, height)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  db.exec("BEGIN");
  try {
    processed.forEach((p, i) => {
      const isHero = n === 0 && i === 0 ? 1 : 0;
      insert.run(artworkId, m + 1 + i, isHero, p.originalPath, p.displayPath, p.thumbPath, p.width, p.height);
    });
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/** Make one image the artwork's hero (clearing the flag on its siblings). */
export function setHero(imageId: number): number | null {
  const img = getImage(imageId);
  if (!img) return null;
  db.exec("BEGIN");
  try {
    db.prepare("UPDATE images SET is_hero = 0 WHERE artwork_id = ?").run(img.artwork_id);
    db.prepare("UPDATE images SET is_hero = 1 WHERE id = ?").run(imageId);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return img.artwork_id;
}

/** Move an image to a new zero-based index within its artwork. */
export function reorderImage(artworkId: number, imageId: number, newIndex: number): void {
  const ids = (
    db
      .prepare("SELECT id FROM images WHERE artwork_id = ? ORDER BY position, id")
      .all(artworkId) as unknown as { id: number }[]
  ).map((r) => r.id);
  resequence("images", ids, imageId, newIndex);
}

/** Delete an image. If it was the hero, promote the next image. Returns the
 * deleted row so the caller can unlink files. */
export function deleteImage(id: number): ImageRow | null {
  const img = getImage(id);
  if (!img) return null;
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM images WHERE id = ?").run(id);
    if (img.is_hero) {
      const next = db
        .prepare("SELECT id FROM images WHERE artwork_id = ? ORDER BY position, id LIMIT 1")
        .get(img.artwork_id) as unknown as { id: number } | undefined;
      if (next) db.prepare("UPDATE images SET is_hero = 1 WHERE id = ?").run(next.id);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return img;
}

/** Splice `movedId` to `newIndex` within `ids` and rewrite positions 0..n-1. */
function resequence(
  table: "artworks" | "images" | "tags",
  ids: number[],
  movedId: number,
  newIndex: number,
): void {
  const from = ids.indexOf(movedId);
  if (from === -1) return;
  ids.splice(from, 1);
  const at = Math.max(0, Math.min(newIndex, ids.length));
  ids.splice(at, 0, movedId);
  const upd = db.prepare(`UPDATE ${table} SET position = ? WHERE id = ?`);
  db.exec("BEGIN");
  try {
    ids.forEach((rowId, i) => upd.run(i, rowId));
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
