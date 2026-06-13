import { Link } from "react-router-dom";
import { ImageOff } from "lucide-react";
import type { ArtworkListItem } from "shared";

/** One artwork in the gallery grid: hero thumbnail, title, year and tags. */
export function ArtworkCard({ art }: { art: ArtworkListItem }) {
  const ratio =
    art.heroWidth && art.heroHeight ? `${art.heroWidth} / ${art.heroHeight}` : "4 / 3";

  return (
    <Link to={`/a/${art.slug}`} className="group block">
      <div className="overflow-hidden rounded-card bg-stone-100 shadow-sm ring-1 ring-black/5">
        {art.heroThumbUrl ? (
          <img
            src={art.heroThumbUrl}
            alt={art.title}
            loading="lazy"
            style={{ aspectRatio: ratio }}
            className="w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            style={{ aspectRatio: "4 / 3" }}
            className="flex items-center justify-center text-stone-300"
          >
            <ImageOff size={28} />
          </div>
        )}
      </div>
      <div className="mt-2.5 px-0.5">
        <h3 className="font-display text-lg font-semibold leading-snug text-stone-900">
          {art.title}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
          {art.year && <span>{art.year}</span>}
          {art.year && art.tags.length > 0 && <span aria-hidden>·</span>}
          {art.tags.map((t) => (
            <span key={t.id}>{t.name}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}
