import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Maximize2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useArtwork } from "../api/hooks";
import { Lightbox } from "../components/Lightbox";
import { FadeImage } from "../components/FadeImage";

export function ArtworkDetail() {
  const { t } = useTranslation();
  const { slug = "" } = useParams();
  const { data: art, isLoading, isError } = useArtwork(slug);
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Lead with the hero image once the artwork loads.
  useEffect(() => {
    if (!art) return;
    const hero = art.images.findIndex((i) => i.isHero);
    setActiveIdx(hero >= 0 ? hero : 0);
  }, [art]);

  if (isLoading) return <p className="p-12 text-center text-sm text-stone-400">{t("artwork.loading")}</p>;
  if (isError || !art)
    return <p className="p-12 text-center text-sm text-stone-500">{t("artwork.notFound")}</p>;

  const active = art.images[activeIdx];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        to="/"
        className="-ml-2 mb-5 inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-sm font-medium text-stone-500 hover:text-stone-800"
      >
        <ChevronLeft size={18} /> {t("artwork.back")}
      </Link>

      <div className="grid gap-8 md:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-3">
          {active ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="group relative overflow-hidden rounded-card bg-stone-100 ring-1 ring-black/5"
            >
              <FadeImage
                key={active.id}
                src={active.displayUrl}
                placeholderSrc={active.thumbUrl}
                alt={art.title}
                className="w-full"
                imgClassName="w-full object-contain"
              />
              <span className="absolute right-2 top-2 rounded-full bg-black/40 p-1.5 text-white/90 opacity-0 transition group-hover:opacity-100">
                <Maximize2 size={16} />
              </span>
            </button>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-card bg-stone-100 text-stone-400">
              {t("artwork.noImage")}
            </div>
          )}

          {art.images.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {art.images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={`overflow-hidden rounded-md ring-2 transition ${
                    idx === activeIdx ? "ring-stone-800" : "ring-transparent hover:ring-stone-300"
                  }`}
                >
                  <FadeImage src={img.thumbUrl} alt="" className="h-16 w-16" imgClassName="h-16 w-16 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:pt-2">
          <h1 className="font-display text-3xl font-bold leading-tight text-stone-900">
            {art.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-stone-500">
            {art.year && <span>{art.year}</span>}
            {art.year && art.dimensions && <span aria-hidden>·</span>}
            {art.dimensions && <span>{art.dimensions}</span>}
          </div>

          {art.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {art.tags.map((t) => (
                <Link
                  key={t.id}
                  to={`/?tag=${t.slug}`}
                  className="rounded-full bg-white px-3 py-1 text-sm text-stone-600 ring-1 ring-black/10 hover:bg-stone-50"
                >
                  {t.name}
                </Link>
              ))}
            </div>
          )}

          {art.description && (
            <p className="mt-5 whitespace-pre-wrap leading-relaxed text-stone-700">
              {art.description}
            </p>
          )}

          {active && (
            <a
              href={active.originalUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block text-sm text-stone-500 underline underline-offset-2 hover:text-stone-800"
            >
              {t("artwork.viewFullResolution")}
            </a>
          )}
        </div>
      </div>

      {lightboxOpen && <Lightbox image={active ?? null} onClose={() => setLightboxOpen(false)} />}
    </div>
  );
}
