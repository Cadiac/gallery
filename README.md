# Gallery

A clean, public web gallery for showcasing original artwork — oil pastels,
acrylics, gouache, digital, coloured pencil, charcoal and whatever comes next.
Visitors browse freely; a single admin signs in to add, edit and arrange pieces
and upload photos.

A live instance runs at **gallery.cadi.ac**.

## Features

- **Public gallery** — a responsive masonry grid of hero images, filterable by
  technique tag and searchable by title/description. No login needed to browse.
- **Artwork detail pages** — the hero image with a thumbnail strip for additional
  shots, a lightbox, title, year, dimensions, technique tags, description, and a
  "view full resolution" link to the untouched original.
- **Single-admin management** — sign in to create/edit/delete pieces, add free-form
  technique tags (with autocomplete), and reorder both the gallery and each piece's
  images. Registration is closed; the admin is seeded from the environment.
- **Image handling** — uploads keep the original on disk and generate web-sized
  `.webp` derivatives with [`sharp`](https://sharp.pixelplumbing.com/) (a display
  image and a grid thumbnail; EXIF orientation honoured). One image per piece is
  the "hero" that fronts the grid and leads the detail page.

## Customising the copy

User-facing text (the **gallery title and subtitle**, search/empty-state labels,
the artwork detail and login screens) lives in `web/src/locales/*.json` and is
rendered via `react-i18next`. The default language is **Finnish**
([`fi.json`](web/src/locales/fi.json)); English ([`en.json`](web/src/locales/en.json))
is the fallback. Edit the active language's file and rebuild to retitle the
gallery or reword anything; change the default (or add a language) in
[`web/src/i18n.ts`](web/src/i18n.ts). An empty `site.subtitle` is simply hidden.

## Stack

pnpm workspace monorepo:

| Package | What |
|---------|------|
| `web/` | React + Vite + Tailwind SPA |
| `server/` | Hono API on Node's built-in `node:sqlite`, image processing with `sharp` |
| `shared/` | Zod schemas, types and the slug helper used by both |

Auth is a single admin (username/password, scrypt hashing, session cookies),
seeded from `ADMIN_USERNAME` / `ADMIN_PASSWORD`. Artwork data lives in SQLite and
uploaded images on disk, both under `server/var/` and persisted across redeploys.

## Development

Requires Node ≥ 22.5 (for `node:sqlite`).

```sh
pnpm install
ADMIN_USERNAME=admin ADMIN_PASSWORD=devpassword pnpm dev
# web on http://localhost:5173, API on :3001 (Vite proxies /api and /media)
```

Open `http://localhost:5173` for the gallery and `/login` to sign in as the admin.
Delete `server/var/app.db` to reset; uploaded files live in `server/var/uploads/`.

Other scripts: `pnpm build` + `pnpm start` (single Node process serving the API,
built SPA, and `/media`), `pnpm test`, `pnpm typecheck`.

## Deployment

The production instance runs the single Node process as a systemd service behind
nginx (TLS via Let's Encrypt) on the same host as the pastels app, on port 3001.
See [`deploy/`](deploy/README.md) for one-time setup; to redeploy after pushing to
`main` (on the server, as root):

```sh
bash /opt/gallery/deploy/update.sh   # git pull → pnpm install → build → restart
```

The SQLite database and uploaded images under `server/var/` are preserved across
redeploys.
