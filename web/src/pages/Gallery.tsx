import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LayoutGrid, Layers, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ArtworkListItem } from "shared";
import { useAuth } from "../auth/AuthProvider";
import { useArtworks, useTags } from "../api/hooks";
import { ArtworkCard } from "../components/ArtworkCard";
import { TagFilter } from "../components/TagFilter";

// Column count tracks the Tailwind sm/lg breakpoints used below.
function useColumnCount(): number {
  const get = () =>
    typeof window === "undefined"
      ? 3
      : window.innerWidth >= 1024
        ? 3
        : window.innerWidth >= 640
          ? 2
          : 1;
  const [n, setN] = useState(get);
  useEffect(() => {
    const onResize = () => setN(get());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return n;
}

/**
 * Deal items across `n` columns round-robin (0→col0, 1→col1, 2→col2, 3→col0…)
 * so the visual order reads left-to-right, top-to-bottom — while each column
 * stacks independently, keeping the staggered "gallery wall" look.
 */
function intoColumns(items: ArtworkListItem[], n: number): ArtworkListItem[][] {
  const cols: ArtworkListItem[][] = Array.from({ length: n }, () => []);
  items.forEach((item, i) => cols[i % n].push(item));
  return cols;
}

/** The staggered masonry grid, reused by the full view and each technique group. */
function MasonryGrid({ items, columns }: { items: ArtworkListItem[]; columns: number }) {
  return (
    <div className="flex items-start gap-5">
      {intoColumns(items, columns).map((col, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col gap-5">
          {col.map((art) => (
            <ArtworkCard key={art.id} art={art} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Gallery() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tag = searchParams.get("tag");
  // The grouped (by-technique) view is the default at "/"; "?view=list" is the
  // flat alternative, and picking a single tag drops to a filtered flat grid.
  const grouped = searchParams.get("view") !== "list" && !tag;
  const setTag = (slug: string | null) =>
    setSearchParams(slug ? { tag: slug } : {}, { replace: true });
  const toggleGrouped = () =>
    setSearchParams(grouped ? { view: "list" } : {}, { replace: true });
  const [q, setQ] = useState("");
  const { data: artworks, isLoading } = useArtworks({
    tag: grouped ? undefined : tag ?? undefined,
    q: q.trim() || undefined,
  });
  const { data: tags } = useTags();
  const columns = useColumnCount();

  // In grouped view, fan each piece out into every technique it uses (so a
  // multi-technique piece appears under each), ordered like the tag chips, with
  // any untagged pieces gathered into a trailing group.
  const groups = useMemo(() => {
    if (!grouped || !artworks) return [];
    const byTag = (tags ?? [])
      .map((tg) => ({
        key: tg.slug,
        name: tg.name,
        items: artworks.filter((a) => a.tags.some((t) => t.slug === tg.slug)),
      }))
      .filter((g) => g.items.length > 0);
    const untagged = artworks.filter((a) => a.tags.length === 0);
    if (untagged.length > 0) {
      byTag.push({ key: "__untagged__", name: t("gallery.untagged"), items: untagged });
    }
    return byTag;
  }, [grouped, artworks, tags, t]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            {t("site.title")}
          </h1>
        </div>
        {user && (
          <Link
            to="/admin"
            className="shrink-0 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            {t("nav.manage")}
          </Link>
        )}
      </header>

      <div className="mb-8 flex items-start gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <TagFilter tags={tags ?? []} active={tag} onSelect={setTag} />
        </div>
        {/* Compact search, matched to the chip height; hidden on mobile where
            the tag chips are enough to narrow things down. */}
        <div className="relative hidden shrink-0 sm:block">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("gallery.search")}
            className="h-7 w-44 rounded-full border border-stone-300 bg-white pl-8 pr-3 text-sm outline-none transition-[width,border-color] focus:w-56 focus:border-stone-500"
          />
        </div>
        {/* Switch between the single grid and one masonry block per technique.
            Hidden when there are no tags to group by. */}
        {(tags?.length ?? 0) > 0 && (
          <button
            type="button"
            onClick={toggleGrouped}
            title={grouped ? t("gallery.viewGrid") : t("gallery.viewByTechnique")}
            aria-label={grouped ? t("gallery.viewGrid") : t("gallery.viewByTechnique")}
            className="flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-full border border-stone-300 bg-white px-2 text-sm text-stone-600 transition hover:border-stone-500 hover:text-stone-900 sm:px-3"
          >
            {grouped ? <LayoutGrid size={15} /> : <Layers size={15} />}
            <span className="hidden sm:inline">
              {grouped ? t("gallery.viewGrid") : t("gallery.viewByTechnique")}
            </span>
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="py-16 text-center text-sm text-stone-400">{t("gallery.loading")}</p>
      ) : !artworks || artworks.length === 0 ? (
        <p className="py-16 text-center text-stone-400">
          {q || tag ? t("gallery.emptyFiltered") : t("gallery.empty")}
        </p>
      ) : grouped ? (
        <div className="flex animate-rise-in flex-col gap-12">
          {groups.map((g) => (
            <section key={g.key}>
              <div className="mb-5 flex items-baseline gap-2 border-b border-stone-200 pb-2">
                <h2 className="font-display text-2xl font-semibold text-stone-900">{g.name}</h2>
                <span className="text-sm text-stone-400">{g.items.length}</span>
              </div>
              <MasonryGrid items={g.items} columns={columns} />
            </section>
          ))}
        </div>
      ) : (
        <div className="animate-rise-in">
          <MasonryGrid items={artworks} columns={columns} />
        </div>
      )}
    </div>
  );
}
