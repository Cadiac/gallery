/**
 * URL slug helpers. Slugs give artworks readable, stable public URLs
 * (`/a/winter-study`) independent of their numeric id.
 */

/** Lowercase, strip diacritics, turn any run of non-alphanumerics into a single
 * dash, and trim leading/trailing dashes. Returns "" for input with no usable
 * characters (callers fall back to a default — see {@link uniqueSlug}). */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A slug for `base` that no existing artwork uses, per the `exists` predicate.
 * Appends `-2`, `-3`, … on collision. Empty/symbol-only titles fall back to
 * "artwork".
 */
export function uniqueSlug(base: string, exists: (slug: string) => boolean): string {
  const root = slugify(base) || "artwork";
  if (!exists(root)) return root;
  for (let n = 2; ; n++) {
    const candidate = `${root}-${n}`;
    if (!exists(candidate)) return candidate;
  }
}
