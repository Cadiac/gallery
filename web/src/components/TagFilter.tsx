import { useEffect, useRef, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TagWithCount } from "shared";

/** Horizontal row of tag chips that filters the gallery; `null` = show all.
 * On mobile the chips collapse behind a trigger showing the active filter and
 * drop down as an overlay on tap; on sm+ they're always inline. */
export function TagFilter({
  tags,
  active,
  onSelect,
}: {
  tags: TagWithCount[];
  active: string | null;
  onSelect: (slug: string | null) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close the mobile dropdown when tapping outside it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  if (tags.length === 0) return null;

  const activeName =
    active === null
      ? t("gallery.allTag")
      : (tags.find((tg) => tg.slug === active)?.name ?? t("gallery.allTag"));

  const chip = (selected: boolean) =>
    `rounded-full px-3 py-1 text-sm transition ${
      selected
        ? "bg-stone-900 text-white"
        : "bg-white text-stone-600 ring-1 ring-black/10 hover:bg-stone-50"
    }`;

  // Picking a filter also collapses the picker (no-op on desktop where it's open).
  const select = (slug: string | null) => {
    onSelect(slug);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {/* Mobile-only trigger: shows the current filter, toggles the dropdown. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-7 items-center gap-1.5 rounded-full bg-white pl-2.5 pr-2 text-sm text-stone-700 ring-1 ring-black/10 transition hover:bg-stone-50 sm:hidden"
      >
        <SlidersHorizontal size={13} className="shrink-0 text-stone-400" />
        <span className="max-w-[9rem] truncate">{activeName}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-stone-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Chips. On mobile this is an absolutely-positioned dropdown that animates
          with transform + opacity only (no reflow of the gallery → smooth). The
          chips carry their own pill background, so the dropdown itself is bare.
          On sm+ it collapses back into a plain inline flex row, always visible. */}
      <div
        className={`absolute left-0 top-full z-20 mt-2 w-[calc(100vw-2rem)] origin-top transition duration-200 ease-out sm:static sm:mt-0 sm:w-auto sm:opacity-100 sm:transition-none ${
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0 sm:pointer-events-auto sm:translate-y-0"
        }`}
      >
        <div className="flex flex-wrap gap-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.18)] sm:drop-shadow-none">
          <button type="button" className={chip(active === null)} onClick={() => select(null)}>
            {t("gallery.allTag")}
          </button>
          {tags.map((tg) => (
            <button
              key={tg.id}
              type="button"
              className={chip(active === tg.slug)}
              onClick={() => select(tg.slug)}
            >
              {tg.name}
              <span className="ml-1.5 text-xs opacity-60">{tg.count}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
