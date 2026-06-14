import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Image } from "shared";

/** Fullscreen overlay showing an artwork's images at display resolution, with
 * prev/next navigation (buttons, arrow keys, and swipe). Click the backdrop or
 * press Escape to close. `index` is controlled so the page's main view and the
 * thumbnail strip stay in sync as you page through. */
export function Lightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: Image[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const image = images[index];
  const multiple = images.length > 1;
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const go = (delta: number) =>
      multiple && onIndexChange((index + delta + images.length) % images.length);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, images.length, multiple, onIndexChange, onClose]);

  if (!image) return null;

  const go = (delta: number) =>
    multiple && onIndexChange((index + delta + images.length) % images.length);

  const arrow =
    "absolute top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white/80 hover:bg-white/20";

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20"
      >
        <X size={22} />
      </button>

      {multiple && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={(e) => (e.stopPropagation(), go(-1))}
            className={`left-3 sm:left-5 ${arrow}`}
          >
            <ChevronLeft size={26} />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={(e) => (e.stopPropagation(), go(1))}
            className={`right-3 sm:right-5 ${arrow}`}
          >
            <ChevronRight size={26} />
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">
            {index + 1} / {images.length}
          </div>
        </>
      )}

      <img
        key={image.id}
        src={image.displayUrl}
        alt=""
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
