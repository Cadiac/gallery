import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { useArtworks, useTags } from "../api/hooks";
import { ArtworkCard } from "../components/ArtworkCard";
import { TagFilter } from "../components/TagFilter";

export function Gallery() {
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            Gallery
          </h1>
          <p className="mt-1 text-stone-500">A collection of original artwork.</p>
        </div>
        {user && (
          <Link
            to="/admin"
            className="shrink-0 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            Manage
          </Link>
        )}
      </header>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <TagFilter tags={tags ?? []} active={tag} onSelect={setTag} />
        <div className="relative sm:w-64">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-full border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-stone-500"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="py-16 text-center text-sm text-stone-400">Loading…</p>
      ) : !artworks || artworks.length === 0 ? (
        <p className="py-16 text-center text-stone-400">
          {q || tag ? "No artwork matches your filter." : "No artwork yet."}
        </p>
      ) : (
        <div className="animate-rise-in gap-5 [column-fill:_balance] columns-1 sm:columns-2 lg:columns-3">
          {artworks.map((art) => (
            <ArtworkCard key={art.id} art={art} />
          ))}
        </div>
      )}
    </div>
  );
}
