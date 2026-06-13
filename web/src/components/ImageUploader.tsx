import { useRef, useState, type DragEvent } from "react";
import { ArrowLeft, ArrowRight, Star, Trash2, Upload } from "lucide-react";
import type { Image } from "shared";
import { useDeleteImage, usePatchImage, useUploadImages } from "../api/hooks";

/** Admin image manager for one artwork: drag-drop/upload, set hero, reorder,
 * delete. Images arrive already ordered by position. */
export function ImageUploader({ artworkId, images }: { artworkId: number; images: Image[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const upload = useUploadImages();
  const patchImage = usePatchImage();
  const deleteImage = useDeleteImage();

  const send = (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type.startsWith("image/"));
    if (list.length) upload.mutate({ id: artworkId, files: list });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    send(e.dataTransfer.files);
  };

  const iconBtn =
    "rounded-full bg-white/90 p-1.5 text-stone-700 shadow-sm ring-1 ring-black/10 disabled:opacity-30 hover:bg-white";

  return (
    <div className="flex flex-col gap-4">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed p-8 text-center text-sm transition ${
          dragOver ? "border-stone-500 bg-stone-100" : "border-stone-300 bg-stone-50"
        }`}
      >
        <Upload size={22} className="text-stone-400" />
        <span className="text-stone-600">
          {upload.isPending ? "Uploading…" : "Drop images here, or click to choose"}
        </span>
        <span className="text-xs text-stone-400">The original is kept; web sizes are generated.</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) send(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {upload.isError && <p className="text-sm text-red-600">Upload failed. Please try again.</p>}

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img, idx) => (
            <li key={img.id} className="group relative overflow-hidden rounded-card ring-1 ring-black/10">
              <img src={img.thumbUrl} alt="" className="aspect-square w-full object-cover" />
              {img.isHero && (
                <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-amber-400/95 px-2 py-0.5 text-[11px] font-semibold text-stone-900 shadow">
                  <Star size={11} fill="currentColor" /> Hero
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  title="Move left"
                  className={iconBtn}
                  disabled={idx === 0}
                  onClick={() => patchImage.mutate({ id: img.id, patch: { position: idx - 1 } })}
                >
                  <ArrowLeft size={15} />
                </button>
                <button
                  type="button"
                  title="Set as hero"
                  className={iconBtn}
                  disabled={img.isHero}
                  onClick={() => patchImage.mutate({ id: img.id, patch: { isHero: true } })}
                >
                  <Star size={15} />
                </button>
                <button
                  type="button"
                  title="Move right"
                  className={iconBtn}
                  disabled={idx === images.length - 1}
                  onClick={() => patchImage.mutate({ id: img.id, patch: { position: idx + 1 } })}
                >
                  <ArrowRight size={15} />
                </button>
                <button
                  type="button"
                  title="Delete image"
                  className={`${iconBtn} text-red-600`}
                  onClick={() => {
                    if (confirm("Delete this image?")) deleteImage.mutate(img.id);
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
