import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { DB_PATH, VAR_DIR } from "./paths";

// `node:sqlite` is a node:-only builtin that bundlers (Vite/Vitest) try to
// resolve as a bare package. Loading it via createRequire keeps it a plain
// runtime import that tooling leaves alone, while tsx/node resolve it natively.
const { DatabaseSync }: typeof import("node:sqlite") = createRequire(import.meta.url)("node:sqlite");

// `DB_FILE=:memory:` is used by tests; otherwise persist under server/var/.
const dbFile = process.env.DB_FILE ?? DB_PATH;
if (dbFile !== ":memory:") mkdirSync(VAR_DIR, { recursive: true });

export const db = new DatabaseSync(dbFile);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

const DDL = `
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS artworks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    year        TEXT,
    dimensions  TEXT,
    position    INTEGER NOT NULL DEFAULT 0,
    hidden      INTEGER NOT NULL DEFAULT 0,
    size        INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tags (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT NOT NULL UNIQUE COLLATE NOCASE,
    slug     TEXT NOT NULL UNIQUE,
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS artwork_tags (
    artwork_id INTEGER NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
    tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (artwork_id, tag_id)
  );
  CREATE INDEX IF NOT EXISTS idx_artwork_tags_tag ON artwork_tags (tag_id);

  CREATE TABLE IF NOT EXISTS images (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    artwork_id    INTEGER NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
    position      INTEGER NOT NULL DEFAULT 0,
    is_hero       INTEGER NOT NULL DEFAULT 0,
    original_path TEXT NOT NULL,
    display_path  TEXT NOT NULL,
    thumb_path    TEXT NOT NULL,
    width         INTEGER NOT NULL,
    height        INTEGER NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_images_artwork ON images (artwork_id, position);
`;

/** Create the schema. Safe to run repeatedly (idempotent). */
export function migrate(): void {
  db.exec(DDL);

  // v2: tags gained a manual `position`. Databases created before this lack the
  // column (CREATE TABLE IF NOT EXISTS won't add it), so backfill it here, in
  // the old count-descending order, to preserve the existing visual ordering.
  const tagCols = db.prepare("PRAGMA table_info(tags)").all() as unknown as { name: string }[];
  if (!tagCols.some((col) => col.name === "position")) {
    db.exec("ALTER TABLE tags ADD COLUMN position INTEGER NOT NULL DEFAULT 0");
    const ids = (
      db
        .prepare(
          `SELECT t.id FROM tags t
           LEFT JOIN artwork_tags at ON at.tag_id = t.id
           GROUP BY t.id ORDER BY COUNT(at.artwork_id) DESC, t.id`,
        )
        .all() as unknown as { id: number }[]
    ).map((r) => r.id);
    const upd = db.prepare("UPDATE tags SET position = ? WHERE id = ?");
    ids.forEach((id, i) => upd.run(i, id));
  }

  // v3: artworks gained a `hidden` soft-delete flag.
  const artworkCols = db.prepare("PRAGMA table_info(artworks)").all() as unknown as {
    name: string;
  }[];
  if (!artworkCols.some((col) => col.name === "hidden")) {
    db.exec("ALTER TABLE artworks ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0");
  }

  // v4: artworks gained a `size` (grid column span) for emphasising pieces.
  if (!artworkCols.some((col) => col.name === "size")) {
    db.exec("ALTER TABLE artworks ADD COLUMN size INTEGER NOT NULL DEFAULT 1");
  }

  db.exec("PRAGMA user_version = 4");
}
