import { z } from "zod";
import {
  ArtworkDetailSchema,
  ArtworkListResponseSchema,
  TagWithCountSchema,
  UserSchema,
  type ArtworkDetail,
  type ArtworkInput,
  type ArtworkListItem,
  type ArtworkPatch,
  type Credentials,
  type ImagePatch,
  type TagWithCount,
  type User,
} from "shared";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && String(data.error)) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return data;
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  return parse(
    await fetch(path, {
      credentials: "same-origin",
      headers: init?.body ? { "content-type": "application/json" } : undefined,
      ...init,
    }),
  );
}

/** Multipart upload — let the browser set the multipart boundary itself. */
async function upload(path: string, form: FormData): Promise<unknown> {
  return parse(await fetch(path, { method: "POST", credentials: "same-origin", body: form }));
}

export interface ArtworkQuery {
  tag?: string;
  q?: string;
}

export const api = {
  async me(): Promise<User | null> {
    try {
      return UserSchema.parse(await request("/api/auth/me"));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },

  async login(creds: Credentials): Promise<User> {
    return UserSchema.parse(
      await request("/api/auth/login", { method: "POST", body: JSON.stringify(creds) }),
    );
  },

  async logout(): Promise<void> {
    await request("/api/auth/logout", { method: "POST" });
  },

  async artworks(query: ArtworkQuery = {}): Promise<ArtworkListItem[]> {
    const params = new URLSearchParams();
    if (query.tag) params.set("tag", query.tag);
    if (query.q) params.set("q", query.q);
    const qs = params.toString();
    return ArtworkListResponseSchema.parse(await request(`/api/artworks${qs ? `?${qs}` : ""}`));
  },

  async artwork(slug: string): Promise<ArtworkDetail> {
    return ArtworkDetailSchema.parse(await request(`/api/artworks/${slug}`));
  },

  async createArtwork(input: ArtworkInput): Promise<ArtworkDetail> {
    return ArtworkDetailSchema.parse(
      await request("/api/artworks", { method: "POST", body: JSON.stringify(input) }),
    );
  },

  async patchArtwork(id: number, patch: ArtworkPatch): Promise<ArtworkDetail> {
    return ArtworkDetailSchema.parse(
      await request(`/api/artworks/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    );
  },

  async deleteArtwork(id: number): Promise<void> {
    await request(`/api/artworks/${id}`, { method: "DELETE" });
  },

  // Server-rendered thumbnail (webp) for a not-yet-saved file, so the admin can
  // preview any format — including HEIC, which the browser may not decode.
  async previewThumbnail(file: File): Promise<Blob> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/images/preview", {
      method: "POST",
      credentials: "same-origin",
      body: form,
    });
    if (!res.ok) throw new ApiError(res.status, "Preview failed");
    return res.blob();
  },

  async uploadImages(id: number, files: File[]): Promise<ArtworkDetail> {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    return ArtworkDetailSchema.parse(await upload(`/api/artworks/${id}/images`, form));
  },

  async patchImage(id: number, patch: ImagePatch): Promise<ArtworkDetail> {
    return ArtworkDetailSchema.parse(
      await request(`/api/images/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    );
  },

  async deleteImage(id: number): Promise<ArtworkDetail> {
    return ArtworkDetailSchema.parse(await request(`/api/images/${id}`, { method: "DELETE" }));
  },

  async tags(): Promise<TagWithCount[]> {
    return z.array(TagWithCountSchema).parse(await request("/api/tags"));
  },

  async reorderTag(id: number, position: number): Promise<TagWithCount[]> {
    return z
      .array(TagWithCountSchema)
      .parse(
        await request(`/api/tags/${id}`, { method: "PATCH", body: JSON.stringify({ position }) }),
      );
  },
};
