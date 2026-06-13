import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Trash2 } from "lucide-react";
import { ApiError } from "../api/client";
import {
  useArtwork,
  useCreateArtwork,
  useDeleteArtwork,
  usePatchArtwork,
  useTags,
} from "../api/hooks";
import { ImageUploader } from "../components/ImageUploader";
import { TagInput } from "../components/TagInput";

export function AdminEdit() {
  const { slug } = useParams();
  const editing = !!slug;
  const navigate = useNavigate();

  const { data: art, isLoading } = useArtwork(slug ?? "");
  const { data: allTags } = useTags();
  const create = useCreateArtwork();
  const patch = usePatchArtwork();
  const remove = useDeleteArtwork();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Populate the form once the artwork loads (edit mode).
  useEffect(() => {
    if (!art) return;
    setTitle(art.title);
    setDescription(art.description);
    setYear(art.year ?? "");
    setDimensions(art.dimensions ?? "");
    setTags(art.tags.map((t) => t.name));
  }, [art?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fields = {
    title: title.trim(),
    description: description.trim(),
    year: year.trim() || null,
    dimensions: dimensions.trim() || null,
    tags,
  };

  const save = async () => {
    setError(null);
    setSaved(false);
    if (!fields.title) {
      setError("Title is required.");
      return;
    }
    try {
      if (editing && art) {
        await patch.mutateAsync({ id: art.id, patch: fields });
        setSaved(true);
      } else {
        const created = await create.mutateAsync(fields);
        navigate(`/admin/${created.slug}/edit`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    }
  };

  if (editing && isLoading)
    return <p className="p-12 text-center text-sm text-stone-400">Loading…</p>;
  if (editing && !isLoading && !art)
    return <p className="p-12 text-center text-sm text-stone-500">Artwork not found.</p>;

  const input =
    "w-full rounded-card border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-500";
  const label = "flex flex-col gap-1 text-sm font-medium text-stone-700";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        to="/admin"
        className="-ml-2 mb-4 inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-sm font-medium text-stone-500 hover:text-stone-800"
      >
        <ChevronLeft size={18} /> Back
      </Link>

      <h1 className="mb-6 font-display text-3xl font-bold text-stone-900">
        {editing ? "Edit artwork" : "New artwork"}
      </h1>

      <div className="flex flex-col gap-4 rounded-card bg-white p-5 shadow-sm ring-1 ring-black/5">
        <label className={label}>
          Title
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className={label}>
          Description
          <textarea
            className={`${input} resize-y`}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>
            Year
            <input
              className={input}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2025"
            />
          </label>
          <label className={label}>
            Dimensions
            <input
              className={input}
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              placeholder="30×40 cm"
            />
          </label>
        </div>
        <div className={label}>
          Techniques / tags
          <TagInput value={tags} onChange={setTags} suggestions={(allTags ?? []).map((t) => t.name)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={create.isPending || patch.isPending}
            className="rounded-card bg-stone-900 px-5 py-2.5 font-semibold text-white disabled:opacity-50 active:scale-[0.99]"
          >
            {create.isPending || patch.isPending ? "Saving…" : editing ? "Save changes" : "Create"}
          </button>
          {saved && <span className="text-sm text-green-600">Saved.</span>}
        </div>
      </div>

      {editing && art ? (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl font-semibold text-stone-900">Images</h2>
          <ImageUploader artworkId={art.id} images={art.images} />

          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete “${art.title}” and its images?`))
                remove.mutate(art.id, { onSuccess: () => navigate("/admin") });
            }}
            className="mt-8 inline-flex items-center gap-1.5 text-sm text-red-600 hover:underline"
          >
            <Trash2 size={15} /> Delete this artwork
          </button>
        </section>
      ) : (
        <p className="mt-6 text-center text-sm text-stone-400">
          Save the piece first, then you can upload images.
        </p>
      )}
    </div>
  );
}
