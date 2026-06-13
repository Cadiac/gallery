import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
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

export function Gallery() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tag = searchParams.get("tag");
  const setTag = (slug: string | null) =>
    setSearchParams(slug ? { tag: slug } : {}, { replace: true });
  const [q, setQ] = useState("");
  const { data: artworks, isLoading } = useArtworks({
    tag: tag ?? undefined,
    q: q.trim() || undefined,
  });
  const { data: tags } = useTags();
  const columns = useColumnCount();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            {t("site.title")}
          </h1>
          {t("site.subtitle") && <p className="mt-1 text-stone-500">{t("site.subtitle")}</p>}
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

      <div className="mb-8 flex items-center gap-3">
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
            className="w-44 rounded-full border border-stone-300 bg-white py-1 pl-8 pr-3 text-sm outline-none transition-[width,border-color] focus:w-56 focus:border-stone-500"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="py-16 text-center text-sm text-stone-400">{t("gallery.loading")}</p>
      ) : !artworks || artworks.length === 0 ? (
        <p className="py-16 text-center text-stone-400">
          {q || tag ? t("gallery.emptyFiltered") : t("gallery.empty")}
        </p>
      ) : (
        <div className="flex animate-rise-in items-start gap-5">
          {intoColumns(artworks, columns).map((col, i) => (
            <div key={i} className="flex min-w-0 flex-1 flex-col gap-5">
              {col.map((art) => (
                <ArtworkCard key={art.id} art={art} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
