import { useEffect } from "react";
import { X } from "lucide-react";
import type { Image } from "shared";

/** Fullscreen overlay showing one image at display resolution. Click anywhere
 * or press Escape to close. */
export function Lightbox({ image, onClose }: { image: Image | null; onClose: () => void }) {
  useEffect(() => {
    if (!image) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20"
      >
        <X size={22} />
      </button>
      <img
        src={image.displayUrl}
        alt=""
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
