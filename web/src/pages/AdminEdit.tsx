import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/client";
import {
  useArtwork,
  useCreateArtwork,
  useDeleteArtwork,
  usePatchArtwork,
  useTags,
  useUploadImages,
} from "../api/hooks";
import { ImageUploader, StagedUploader } from "../components/ImageUploader";
import { TagInput } from "../components/TagInput";

export function AdminEdit() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const editing = !!slug;
  const navigate = useNavigate();

  const { data: art, isLoading } = useArtwork(slug ?? "");
  const { data: allTags } = useTags();
  const create = useCreateArtwork();
  const patch = usePatchArtwork();
  const upload = useUploadImages();
  const remove = useDeleteArtwork();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  // Images chosen before a new piece exists; uploaded right after it's created.
  const [staged, setStaged] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Populate the form once the artwork loads (edit mode).
  useEffect(() => {
    if (!art) return;
    setTitle(art.title);
    setDescription(art.description);
    setYear(art.year ?? "");
    setDimensions(art.dimensions ?? "");
    setTags(art.tags.map((t) => t.name));
  }, [art?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const busy = create.isPending || patch.isPending || upload.isPending;

  const save = async () => {
    setError(null);
    const fields = {
      title: title.trim(),
      description: description.trim(),
      year: year.trim() || null,
      dimensions: dimensions.trim() || null,
      tags,
    };
    if (!fields.title) {
      setError(t("admin.titleRequired"));
      return;
    }
    try {
      if (editing && art) {
        await patch.mutateAsync({ id: art.id, patch: fields });
        navigate("/admin", { state: { notice: t("admin.savedNotice", { title: fields.title }) } });
      } else {
        const created = await create.mutateAsync(fields);
        if (staged.length) await upload.mutateAsync({ id: created.id, files: staged });
        const notice = staged.length
          ? t("admin.createdNoticeWithImages", { title: fields.title, count: staged.length })
          : t("admin.createdNotice", { title: fields.title });
        navigate("/admin", { state: { notice } });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.saveError"));
    }
  };

  if (editing && isLoading)
    return <p className="p-12 text-center text-sm text-stone-400">{t("admin.loading")}</p>;
  if (editing && !isLoading && !art)
    return <p className="p-12 text-center text-sm text-stone-500">{t("admin.notFound")}</p>;

  const input =
    "w-full rounded-card border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-500";
  const label = "flex flex-col gap-1 text-sm font-medium text-stone-700";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        to="/admin"
        className="-ml-2 mb-4 inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-sm font-medium text-stone-500 hover:text-stone-800"
      >
        <ChevronLeft size={18} /> {t("admin.back")}
      </Link>

      <h1 className="mb-6 font-display text-3xl font-bold text-stone-900">
        {editing ? t("admin.editArtwork") : t("admin.newArtwork")}
      </h1>

      <div className="flex flex-col gap-4 rounded-card bg-white p-5 shadow-sm ring-1 ring-black/5">
        <label className={label}>
          {t("admin.titleLabel")}
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className={label}>
          {t("admin.descriptionLabel")}
          <textarea
            className={`${input} resize-y`}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>
            {t("admin.yearLabel")}
            <input
              className={input}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder={String(new Date().getFullYear())}
            />
          </label>
          <label className={label}>
            {t("admin.dimensionsLabel")}
            <input
              className={input}
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              placeholder={t("admin.dimensionsPlaceholder")}
            />
          </label>
        </div>
        <div className={label}>
          {t("admin.tagsLabel")}
          <TagInput value={tags} onChange={setTags} suggestions={(allTags ?? []).map((tag) => tag.name)} />
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-xl font-semibold text-stone-900">
          {t("admin.imagesHeading")}
        </h2>
        {editing && art ? (
          <ImageUploader artworkId={art.id} images={art.images} />
        ) : (
          <>
            <StagedUploader files={staged} onChange={setStaged} />
            <p className="mt-2 text-xs text-stone-400">{t("admin.stagedHint")}</p>
          </>
        )}
      </section>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-black/5 pt-6">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-card bg-stone-900 px-6 py-2.5 font-semibold text-white disabled:opacity-50 active:scale-[0.99]"
        >
          {busy ? t("admin.saving") : editing ? t("admin.saveChanges") : t("admin.createArtwork")}
        </button>
        {editing && art && (
          <button
            type="button"
            onClick={() => {
              if (confirm(t("admin.confirmDeleteArtwork", { title: art.title })))
                remove.mutate(art.id, {
                  onSuccess: () =>
                    navigate("/admin", {
                      state: { notice: t("admin.deletedNotice", { title: art.title }) },
                    }),
                });
            }}
            className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:underline"
          >
            <Trash2 size={15} /> {t("admin.delete")}
          </button>
        )}
      </div>
    </div>
  );
}
