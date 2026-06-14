import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TagWithCount } from "shared";

/** Horizontal row of tag chips that filters the gallery; `null` = show all.
 * On mobile the chips collapse behind a trigger showing the active filter and
 * expand on tap; on sm+ they're always visible. */
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
    <div>
      {/* Mobile-only trigger: shows the current filter, toggles the chips. */}
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
          className={`shrink-0 text-stone-400 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Chips: collapsed by default on mobile (animated via grid-rows), always
          open from sm up. The 0fr→1fr grid trick animates an unknown height. */}
      <div
        className={`grid transition-all duration-300 ease-out sm:mt-0 sm:grid-rows-[1fr] sm:opacity-100 ${
          open ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap gap-2">
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
    </div>
  );
}
