import { useEffect, useRef, useState } from "react";

/**
 * An <img> that fades in once it has actually decoded, over a soft pulsing
 * placeholder — so images settle in gently instead of popping from a blank box.
 * Cached images (already complete on mount) skip the pulse and appear at once.
 *
 * Pass `placeholderSrc` (e.g. the already-cached grid thumbnail) to show that
 * image immediately while the larger `src` loads, so navigating from the list
 * to the detail view is seamless: the same picture stays on screen and just
 * sharpens in place.
 */
export function FadeImage({
  src,
  alt,
  className = "",
  imgClassName = "",
  style,
  placeholderSrc,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  style?: React.CSSProperties;
  placeholderSrc?: string;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  // A cached image may already be complete before React attaches onLoad.
  useEffect(() => {
    if (ref.current?.complete) setLoaded(true);
  }, [src]);

  return (
    <div
      style={style}
      className={`relative overflow-hidden bg-stone-100 ${
        !loaded && !placeholderSrc ? "animate-pulse" : ""
      } ${className}`}
    >
      {placeholderSrc && !loaded && (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden
          className={`absolute inset-0 h-full w-full scale-105 blur-md ${imgClassName}`}
        />
      )}
      <img
        ref={ref}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`transition duration-700 ease-out ${loaded ? "opacity-100" : "opacity-0"} ${imgClassName}`}
      />
    </div>
  );
}
