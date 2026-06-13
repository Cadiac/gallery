import { useEffect, useRef, useState } from "react";

/**
 * An <img> that fades in once it has actually decoded, over a soft pulsing
 * placeholder — so images settle in gently instead of popping from a blank box.
 * Cached images (already complete on mount) skip the pulse and appear at once.
 */
export function FadeImage({
  src,
  alt,
  className = "",
  imgClassName = "",
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  style?: React.CSSProperties;
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
      className={`relative overflow-hidden bg-stone-100 ${!loaded ? "animate-pulse" : ""} ${className}`}
    >
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
