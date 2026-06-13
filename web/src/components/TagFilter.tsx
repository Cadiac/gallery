import type { TagWithCount } from "shared";

/** Horizontal row of tag chips that filters the gallery; `null` = show all. */
export function TagFilter({
  tags,
  active,
  onSelect,
}: {
  tags: TagWithCount[];
  active: string | null;
  onSelect: (slug: string | null) => void;
}) {
  if (tags.length === 0) return null;

  const chip = (selected: boolean) =>
    `rounded-full px-3 py-1 text-sm transition ${
      selected
        ? "bg-stone-900 text-white"
        : "bg-white text-stone-600 ring-1 ring-black/10 hover:bg-stone-50"
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={chip(active === null)} onClick={() => onSelect(null)}>
        All
      </button>
      {tags.map((t) => (
        <button
          key={t.id}
          type="button"
          className={chip(active === t.slug)}
          onClick={() => onSelect(t.slug)}
        >
          {t.name}
          <span className="ml-1.5 text-xs opacity-60">{t.count}</span>
        </button>
      ))}
    </div>
  );
}
