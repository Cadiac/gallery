import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ArtworkDetail, ArtworkListItem, TagWithCount } from "shared";

// Configure before importing modules that read the env / open the connection.
process.env.DB_FILE = ":memory:";
const UPLOADS = join(tmpdir(), `gallery-test-${process.pid}-${Date.now()}`);
process.env.UPLOADS_DIR = UPLOADS;
process.env.ADMIN_USERNAME = "curator";
process.env.ADMIN_PASSWORD = "let-me-in-123";

const { migrate } = await import("./db");
const { seedAdmin } = await import("./seed");
const { createApp } = await import("./app");
const sharp = (await import("sharp")).default;

const app = createApp();

function cookieFrom(res: Response): string {
  return (res.headers.get("set-cookie") ?? "").split(";")[0];
}

async function pngFile(name: string, w = 1200, h = 800): Promise<File> {
  const buf = await sharp({
    create: { width: w, height: h, channels: 3, background: { r: 180, g: 90, b: 60 } },
  })
    .png()
    .toBuffer();
  return new File([buf], name, { type: "image/png" });
}

describe("gallery API", () => {
  beforeAll(() => {
    migrate();
    seedAdmin();
  });
  afterAll(() => rmSync(UPLOADS, { recursive: true, force: true }));

  it("serves an empty public gallery and blocks anonymous writes", async () => {
    const list = await app.request("/api/artworks");
    expect(list.status).toBe(200);
    expect(await list.json()).toEqual([]);

    const write = await app.request("/api/artworks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Sneaky" }),
    });
    expect(write.status).toBe(401);
  });

  it("logs the admin in, creates a piece, uploads a hero image, and lists it", async () => {
    const login = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "curator", password: "let-me-in-123" }),
    });
    expect(login.status).toBe(200);
    const cookie = cookieFrom(login);
    expect(cookie).toMatch(/^sid=/);

    // create
    const created = await app.request("/api/artworks", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({
        title: "Winter Study",
        description: "A quiet field.",
        year: "2025",
        dimensions: "30×40 cm",
        tags: ["Oil pastel", "Landscape"],
      }),
    });
    expect(created.status).toBe(201);
    const artwork = (await created.json()) as ArtworkDetail;
    expect(artwork.slug).toBe("winter-study");
    expect(artwork.images).toEqual([]);
    expect(artwork.tags.map((t) => t.name).sort()).toEqual(["Landscape", "Oil pastel"]);

    // upload two images — first becomes hero
    const fd = new FormData();
    fd.append("files", await pngFile("a.png"));
    fd.append("files", await pngFile("b.png", 900, 900));
    const uploaded = await app.request(`/api/artworks/${artwork.id}/images`, {
      method: "POST",
      headers: { cookie },
      body: fd,
    });
    expect(uploaded.status).toBe(201);
    const withImages = (await uploaded.json()) as ArtworkDetail;
    expect(withImages.images).toHaveLength(2);
    const heroes = withImages.images.filter((i) => i.isHero);
    expect(heroes).toHaveLength(1);
    expect(heroes[0].thumbUrl).toMatch(/^\/media\/thumbs\/[0-9a-f]+\.webp$/);
    expect(heroes[0].width).toBe(1200);
    expect(heroes[0].height).toBe(800);

    // the original file is kept on disk
    const originalRel = withImages.images[0].originalUrl.replace("/media/", "");
    expect(existsSync(join(UPLOADS, originalRel))).toBe(true);

    // public listing now shows the piece with a hero thumb + tags
    const list = (await (await app.request("/api/artworks")).json()) as ArtworkListItem[];
    expect(list).toHaveLength(1);
    expect(list[0].heroThumbUrl).toMatch(/^\/media\/thumbs\//);
    expect(list[0].tags).toHaveLength(2);

    // tag filter + tag counts
    const filtered = (await (
      await app.request("/api/artworks?tag=oil-pastel")
    ).json()) as ArtworkListItem[];
    expect(filtered).toHaveLength(1);
    const empty = (await (
      await app.request("/api/artworks?tag=nonexistent")
    ).json()) as ArtworkListItem[];
    expect(empty).toHaveLength(0);

    const tags = (await (await app.request("/api/tags")).json()) as TagWithCount[];
    expect(tags.find((t) => t.slug === "oil-pastel")).toMatchObject({ count: 1 });

    // promote the second image to hero
    const second = withImages.images.find((i) => !i.isHero)!;
    const promoted = await app.request(`/api/images/${second.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ isHero: true }),
    });
    expect(promoted.status).toBe(200);
    const repointed = (await promoted.json()) as ArtworkDetail;
    expect(repointed.images.find((i) => i.isHero)!.id).toBe(second.id);

    // delete an image — its files are removed, hero is reassigned
    const del = await app.request(`/api/images/${second.id}`, { method: "DELETE", headers: { cookie } });
    expect(del.status).toBe(200);
    const afterDel = (await del.json()) as ArtworkDetail;
    expect(afterDel.images).toHaveLength(1);
    expect(afterDel.images[0].isHero).toBe(true);
    expect(existsSync(join(UPLOADS, second.thumbUrl.replace("/media/", "")))).toBe(false);

    // delete the artwork — gone from the public listing
    const delArt = await app.request(`/api/artworks/${artwork.id}`, {
      method: "DELETE",
      headers: { cookie },
    });
    expect(delArt.status).toBe(200);
    expect((await (await app.request("/api/artworks")).json()) as ArtworkListItem[]).toEqual([]);
  });

  it("hides pieces from the public but keeps them for the admin", async () => {
    const cookie = cookieFrom(
      await app.request("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "curator", password: "let-me-in-123" }),
      }),
    );

    const created = (await (
      await app.request("/api/artworks", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ title: "Secret Sketch", tags: ["WIP"] }),
      })
    ).json()) as ArtworkDetail;
    expect(created.hidden).toBe(false);

    // hide it
    const patched = (await (
      await app.request(`/api/artworks/${created.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ hidden: true }),
      })
    ).json()) as ArtworkDetail;
    expect(patched.hidden).toBe(true);

    // public: gone from the listing, 404 on the direct link, no leaked tag
    expect((await (await app.request("/api/artworks")).json()) as ArtworkListItem[]).toEqual([]);
    expect((await app.request(`/api/artworks/${created.slug}`)).status).toBe(404);
    const publicTags = (await (await app.request("/api/tags")).json()) as TagWithCount[];
    expect(publicTags.find((t) => t.slug === "wip")).toBeUndefined();

    // admin: still listed (with includeHidden) and loadable by slug
    const adminList = (await (
      await app.request("/api/artworks?includeHidden=1", { headers: { cookie } })
    ).json()) as ArtworkListItem[];
    expect(adminList.map((a) => a.id)).toContain(created.id);
    const adminDetail = await app.request(`/api/artworks/${created.slug}`, { headers: { cookie } });
    expect(adminDetail.status).toBe(200);

    // unhide → back in the public listing
    await app.request(`/api/artworks/${created.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ hidden: false }),
    });
    expect(
      ((await (await app.request("/api/artworks")).json()) as ArtworkListItem[]).map((a) => a.id),
    ).toContain(created.id);

    // clean up so later assertions about an empty gallery elsewhere stay valid
    await app.request(`/api/artworks/${created.id}`, { method: "DELETE", headers: { cookie } });
  });

  it("serves an XML sitemap built from the request origin", async () => {
    const res = await app.request("/sitemap.xml", {
      headers: { host: "gallery.example", "x-forwarded-proto": "https" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("xml");
    const xml = await res.text();
    expect(xml).toContain("<urlset");
    expect(xml).toContain("<loc>https://gallery.example/</loc>");
  });

  it("rejects bad login credentials and unknown artworks", async () => {
    const bad = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "curator", password: "wrong-password" }),
    });
    expect(bad.status).toBe(401);

    const missing = await app.request("/api/artworks/does-not-exist");
    expect(missing.status).toBe(404);
  });
});
