import { z } from "zod";

// --- Auth -------------------------------------------------------------------

export const CredentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(40)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Letters, numbers, . _ - only"),
  password: z.string().min(6, "Password must be at least 6 characters").max(200),
});
export type Credentials = z.infer<typeof CredentialsSchema>;

export const UserSchema = z.object({
  id: z.number().int(),
  username: z.string(),
});
export type User = z.infer<typeof UserSchema>;

// --- Tags -------------------------------------------------------------------

export const TagSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
});
export type Tag = z.infer<typeof TagSchema>;

/**
 * A tag with how many artworks carry it. `position` is the admin-set manual
 * order; it drives the filter chips and the grouped gallery view.
 */
export const TagWithCountSchema = TagSchema.extend({
  count: z.number().int(),
  position: z.number().int(),
});
export type TagWithCount = z.infer<typeof TagWithCountSchema>;

/** PATCH /api/tags/:id body — move a technique to a new zero-based position. */
export const TagPatchSchema = z.object({
  position: z.number().int().min(0),
});
export type TagPatch = z.infer<typeof TagPatchSchema>;

// --- Images -----------------------------------------------------------------

/**
 * One photo of an artwork. The server keeps the uploaded original and two
 * `sharp`-generated `.webp` derivatives; the URLs point at `/media/*`. Exactly
 * one image per artwork is the `isHero` (it fronts the grid and leads detail).
 */
export const ImageSchema = z.object({
  id: z.number().int(),
  artworkId: z.number().int(),
  position: z.number().int(),
  isHero: z.boolean(),
  thumbUrl: z.string(),
  displayUrl: z.string(),
  originalUrl: z.string(),
  width: z.number().int(),
  height: z.number().int(),
});
export type Image = z.infer<typeof ImageSchema>;

// --- Artworks ---------------------------------------------------------------

export const ArtworkSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  year: z.string().nullable(),
  dimensions: z.string().nullable(),
  position: z.number().int(),
  // How many grid columns the piece spans (1 = normal). Lets the artist
  // emphasise a piece by drawing it larger on the gallery wall; clamped to the
  // current column count when rendered.
  size: z.number().int(),
  // Hidden pieces are soft-deleted: gone from the public gallery and direct
  // links, but still listed and editable in the admin panel.
  hidden: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Artwork = z.infer<typeof ArtworkSchema>;

/** What GET /api/artworks returns: artwork core + tags + hero thumbnail. */
export const ArtworkListItemSchema = ArtworkSchema.extend({
  tags: z.array(TagSchema),
  heroThumbUrl: z.string().nullable(),
  heroWidth: z.number().int().nullable(),
  heroHeight: z.number().int().nullable(),
});
export type ArtworkListItem = z.infer<typeof ArtworkListItemSchema>;

export const ArtworkListResponseSchema = z.array(ArtworkListItemSchema);

/** What GET /api/artworks/:slug returns: artwork core + all images + tags. */
export const ArtworkDetailSchema = ArtworkSchema.extend({
  tags: z.array(TagSchema),
  images: z.array(ImageSchema),
});
export type ArtworkDetail = z.infer<typeof ArtworkDetailSchema>;

// --- Inputs -----------------------------------------------------------------

// "" / whitespace / absent all collapse to null for the optional text fields.
const createText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null));

// For PATCH: absent (undefined) means "leave unchanged"; null or "" clears it.
const patchText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((v) => (v == null ? v : v.length > 0 ? v : null));

const TagListSchema = z.array(z.string().trim().min(1).max(50)).max(50);

/** POST /api/artworks body. */
export const ArtworkInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).default(""),
  year: createText(20),
  dimensions: createText(100),
  tags: TagListSchema.default([]),
  size: z.number().int().min(1).max(3).default(1),
});
export type ArtworkInput = z.infer<typeof ArtworkInputSchema>;

/** PATCH /api/artworks/:id body — every field optional; `position` reorders. */
export const ArtworkPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  year: patchText(20),
  dimensions: patchText(100),
  tags: TagListSchema.optional(),
  position: z.number().int().min(0).optional(),
  hidden: z.boolean().optional(),
  size: z.number().int().min(1).max(3).optional(),
});
export type ArtworkPatch = z.infer<typeof ArtworkPatchSchema>;

/** PATCH /api/images/:id body — promote to hero and/or reorder. */
export const ImagePatchSchema = z.object({
  isHero: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});
export type ImagePatch = z.infer<typeof ImagePatchSchema>;
