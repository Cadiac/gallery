import { useEffect, useRef, useState, type ReactNode } from "react";
import { ImageOff, Star, Trash2, Upload, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Image } from "shared";
import { api } from "../api/client";
import { useDeleteImage, usePatchImage, useUploadImages } from "../api/hooks";

const isImage = (f: File) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name);

/** The dashed drop-target + file picker, shared by the live and staged variants. */
function Dropzone({ onFiles, busy }: { onFiles: (files: File[]) => void; busy?: boolean }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const take = (files: FileList | File[]) => {
    const list = [...files].filter(isImage);
    if (list.length) onFiles(list);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        take(e.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed p-8 text-center text-sm transition ${
        dragOver ? "border-stone-500 bg-stone-100" : "border-stone-300 bg-stone-50"
      }`}
    >
      <Upload size={22} className="text-stone-400" />
      <span className="text-stone-600">{busy ? t("admin.uploading") : t("admin.dropzone")}</span>
      <span className="text-xs text-stone-400">{t("admin.dropzoneHint")}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif,.HEIC,.HEIF"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) take(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

const iconBtn =
  "rounded-full bg-white/90 p-1.5 text-stone-700 shadow-sm ring-1 ring-black/10 disabled:opacity-30 hover:bg-white";

const useGridSensors = () =>
  useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

/** A draggable square tile: the image area is the drag handle, badges/buttons
 * sit above it as siblings so they stay clickable. */
function SortableTile({
  id,
  visual,
  children,
}: {
  id: string | number;
  visual: ReactNode;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group relative overflow-hidden rounded-card ring-1 ring-black/10 ${
        isDragging ? "z-10 shadow-lg" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        title={t("admin.reorder")}
        className="cursor-grab touch-none active:cursor-grabbing"
      >
        {visual}
      </div>
      {children}
    </li>
  );
}

/**
 * Admin image manager for an existing artwork: upload, drag to reorder, set
 * hero, delete. Images arrive already ordered by position.
 */
export function ImageUploader({ artworkId, images }: { artworkId: number; images: Image[] }) {
  const { t } = useTranslation();
  const upload = useUploadImages();
  const patchImage = usePatchImage();
  const deleteImage = useDeleteImage();
  const sensors = useGridSensors();

  // Local order for instant drag feedback; resynced from the server data.
  const [items, setItems] = useState<Image[]>(images);
  useEffect(() => setItems(images), [images]);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setItems((cur) => arrayMove(cur, oldIndex, newIndex));
    patchImage.mutate({ id: Number(active.id), patch: { position: newIndex } });
  };

  return (
    <div className="flex flex-col gap-4">
      <Dropzone busy={upload.isPending} onFiles={(files) => upload.mutate({ id: artworkId, files })} />
      {upload.isError && <p className="text-sm text-red-600">{t("admin.uploadFailed")}</p>}

      {items.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((img) => (
                <SortableTile
                  key={img.id}
                  id={img.id}
                  visual={
                    <img
                      src={img.thumbUrl}
                      alt=""
                      draggable={false}
                      className="aspect-square w-full object-cover"
                    />
                  }
                >
                  {img.isHero && (
                    <span className="pointer-events-none absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-amber-400/95 px-2 py-0.5 text-[11px] font-semibold text-stone-900 shadow">
                      <Star size={11} fill="currentColor" /> {t("admin.hero")}
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      title={t("admin.setHero")}
                      className={iconBtn}
                      disabled={img.isHero}
                      onClick={() => patchImage.mutate({ id: img.id, patch: { isHero: true } })}
                    >
                      <Star size={15} />
                    </button>
                    <button
                      type="button"
                      title={t("admin.deleteImage")}
                      className={`${iconBtn} text-red-600`}
                      onClick={() => {
                        if (confirm(t("admin.confirmDeleteImage"))) deleteImage.mutate(img.id);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </SortableTile>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

/**
 * Staged image picker for the new-artwork form: files are picked before the
 * piece exists (they upload once it's created), so previews come from the
 * backend `/preview` thumbnailer — that way any format renders, including HEIC
 * which the browser may not decode. The first image (drag to reorder) is hero.
 */
export function StagedUploader({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const { t } = useTranslation();
  const sensors = useGridSensors();
  // Backend-rendered webp thumbnail URL per file (object URLs of the blobs).
  const [previews, setPreviews] = useState<Map<File, string>>(new Map());
  const [failed, setFailed] = useState<Set<File>>(new Set());

  // Stable drag id per File (File objects have no id of their own).
  const ids = useRef(new WeakMap<File, string>());
  const seq = useRef(0);
  const idFor = (f: File) => {
    let id = ids.current.get(f);
    if (!id) {
      id = `staged-${seq.current++}`;
      ids.current.set(f, id);
    }
    return id;
  };

  // Fetch a thumbnail for any file we haven't previewed yet.
  useEffect(() => {
    const pending = files.filter((f) => !previews.has(f) && !failed.has(f));
    if (pending.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const file of pending) {
        try {
          const blob = await api.previewThumbnail(file);
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          setPreviews((m) => new Map(m).set(file, url));
        } catch {
          if (!cancelled) setFailed((s) => new Set(s).add(file));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [files, previews, failed]);

  // Revoke the blob URLs when unmounting.
  const previewsRef = useRef(previews);
  previewsRef.current = previews;
  useEffect(() => () => previewsRef.current.forEach(URL.revokeObjectURL), []);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const order = files.map(idFor);
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(files, oldIndex, newIndex));
  };

  return (
    <div className="flex flex-col gap-4">
      <Dropzone onFiles={(added) => onChange([...files, ...added])} />
      {files.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={files.map(idFor)} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {files.map((file, idx) => {
                const url = previews.get(file);
                const visual = url ? (
                  <img src={url} alt="" draggable={false} className="aspect-square w-full object-cover" />
                ) : failed.has(file) ? (
                  <div className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 bg-stone-100 px-3 text-center text-stone-400">
                    <ImageOff size={20} />
                    <span className="w-full truncate text-[11px] text-stone-500">{file.name}</span>
                    <span className="text-[10px]">{t("admin.previewUnavailable")}</span>
                  </div>
                ) : (
                  <div className="aspect-square w-full animate-pulse bg-stone-100" />
                );
                return (
                  <SortableTile key={idFor(file)} id={idFor(file)} visual={visual}>
                    {idx === 0 && (
                      <span className="pointer-events-none absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-amber-400/95 px-2 py-0.5 text-[11px] font-semibold text-stone-900 shadow">
                        <Star size={11} fill="currentColor" /> {t("admin.hero")}
                      </span>
                    )}
                    <button
                      type="button"
                      title={t("admin.remove")}
                      onClick={() => onChange(files.filter((f) => f !== file))}
                      className={`absolute right-1.5 top-1.5 ${iconBtn} text-red-600 opacity-0 transition group-hover:opacity-100`}
                    >
                      <X size={15} />
                    </button>
                  </SortableTile>
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
