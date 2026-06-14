import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ArtworkInput, ArtworkPatch, ImagePatch } from "shared";
import { api, type ArtworkQuery } from "./client";

export function useArtworks(query: ArtworkQuery = {}) {
  return useQuery({
    queryKey: ["artworks", query],
    queryFn: () => api.artworks(query),
  });
}

export function useArtwork(slug: string) {
  return useQuery({
    queryKey: ["artwork", slug],
    queryFn: () => api.artwork(slug),
    enabled: !!slug,
  });
}

export function useTags() {
  return useQuery({ queryKey: ["tags"], queryFn: api.tags });
}

export function useReorderTag() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, position }: { id: number; position: number }) =>
      api.reorderTag(id, position),
    onSuccess: invalidate,
  });
}

/** Invalidate every query that an artwork/image/tag change can affect. */
function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["artworks"] });
    qc.invalidateQueries({ queryKey: ["artwork"] });
    qc.invalidateQueries({ queryKey: ["tags"] });
  };
}

export function useCreateArtwork() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: ArtworkInput) => api.createArtwork(input),
    onSuccess: invalidate,
  });
}

export function usePatchArtwork() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: ArtworkPatch }) => api.patchArtwork(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteArtwork() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => api.deleteArtwork(id),
    onSuccess: invalidate,
  });
}

export function useUploadImages() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, files }: { id: number; files: File[] }) => api.uploadImages(id, files),
    onSuccess: invalidate,
  });
}

export function usePatchImage() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: ImagePatch }) => api.patchImage(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteImage() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => api.deleteImage(id),
    onSuccess: invalidate,
  });
}
