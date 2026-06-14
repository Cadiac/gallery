import type { Context } from "hono";
import type { ArtworkDetail } from "shared";
import { getArtworkBySlug, listArtworks } from "./store";

// Crawler-facing site identity. Kept here (not in the web locale files) because
// this is the server-rendered HTML that social scrapers read without running JS.
const SITE_NAME = "Gallery";
const SITE_AUTHOR = "Jaakko Husso";

/** Absolute origin for building canonical/OG URLs. Prefers PUBLIC_URL; otherwise
 * trusts the proxy headers nginx sets (Host + X-Forwarded-Proto). */
export function baseUrl(c: Context): string {
  const env = process.env.PUBLIC_URL;
  if (env) return env.replace(/\/+$/, "");
  const proto = c.req.header("x-forwarded-proto") ?? "https";
  const host = c.req.header("host") ?? "localhost";
  return `${proto}://${host}`;
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function clip(s: string, n = 200): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
}

interface Meta {
  title: string;
  description: string;
  url: string;
  image?: string;
  type: "website" | "article";
}

function renderTags(m: Meta): string {
  const tags = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<meta property="og:type" content="${m.type}" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${esc(m.url)}" />`,
    `<meta name="twitter:card" content="${m.image ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
  ];
  if (m.image) {
    // Note: derivatives are .webp — supported by today's major scrapers (FB/X/
    // Slack/Discord/iMessage). No width/height: we store the original's dims, not
    // the resized derivative's, so advertising them would be wrong.
    tags.push(`<meta property="og:image" content="${esc(m.image)}" />`);
    tags.push(`<meta name="twitter:image" content="${esc(m.image)}" />`);
  }
  return tags.join("\n    ");
}

/** Replace the static <title> and splice OG/Twitter tags in before </head>. */
function inject(html: string, m: Meta): string {
  return html
    .replace(/<title>.*?<\/title>/, "")
    .replace("</head>", `    ${renderTags(m)}\n  </head>`);
}

export function homeHtml(html: string, c: Context): string {
  const base = baseUrl(c);
  // Represent the gallery with the first visible piece's hero display image.
  const first = listArtworks()[0];
  const detail = first ? getArtworkBySlug(first.slug) : null;
  const hero = detail ? (detail.images.find((i) => i.isHero) ?? detail.images[0]) : undefined;
  return inject(html, {
    title: `${SITE_NAME} · ${SITE_AUTHOR}`,
    description: `Artwork by ${SITE_AUTHOR}.`,
    url: `${base}/`,
    image: hero ? base + hero.displayUrl : undefined,
    type: "website",
  });
}

export function artworkHtml(html: string, c: Context, art: ArtworkDetail): string {
  const base = baseUrl(c);
  const hero = art.images.find((i) => i.isHero) ?? art.images[0];
  const description = art.description.trim()
    ? clip(art.description)
    : [art.year, art.dimensions, art.tags.map((t) => t.name).join(", ")]
        .filter(Boolean)
        .join(" · ") || `${art.title} — ${SITE_AUTHOR}`;
  return inject(html, {
    title: `${art.title} · ${SITE_NAME}`,
    description,
    url: `${base}/a/${art.slug}`,
    image: hero ? base + hero.displayUrl : undefined,
    type: "article",
  });
}

/** XML sitemap of the home page + every visible artwork (hidden ones excluded). */
export function sitemap(c: Context): string {
  const base = baseUrl(c);
  const url = (loc: string, lastmod?: string) =>
    `  <url>\n    <loc>${esc(loc)}</loc>${
      lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""
    }\n  </url>`;
  const entries = [
    url(`${base}/`),
    ...listArtworks().map((a) => url(`${base}/a/${a.slug}`, a.updatedAt.split(" ")[0])),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join(
    "\n",
  )}\n</urlset>\n`;
}
