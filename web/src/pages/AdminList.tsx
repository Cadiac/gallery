import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, GripVertical, ImageOff, LogOut, Pencil, Plus, Trash2 } from "lucide-react";
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ArtworkListItem } from "shared";
import { useAuth } from "../auth/AuthProvider";
import { useArtworks, useDeleteArtwork, usePatchArtwork } from "../api/hooks";

export function AdminList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { data: artworks, isLoading } = useArtworks();
  const reorder = usePatchArtwork();
  const remove = useDeleteArtwork();

  // Local ordering so a drag re-sorts instantly; resynced from the server data.
  const [order, setOrder] = useState<ArtworkListItem[]>([]);
  useEffect(() => {
    if (artworks) setOrder(artworks);
  }, [artworks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = order.findIndex((a) => a.id === active.id);
    const newIndex = order.findIndex((a) => a.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setOrder((cur) => arrayMove(cur, oldIndex, newIndex));
    reorder.mutate({ id: Number(active.id), patch: { position: newIndex } });
  };

  const [notice, setNotice] = useState<string | null>(
    (location.state as { notice?: string } | null)?.notice ?? null,
  );
  useEffect(() => {
    if (!notice) return;
    window.history.replaceState({}, "");
    const tmr = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(tmr);
  }, [notice]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-stone-900">{t("admin.manage")}</h1>
        <div className="flex items-center gap-2">
          <Link to="/" className="rounded-full px-3 py-2 text-sm text-stone-500 hover:text-stone-800">
            {t("admin.viewGallery")}
          </Link>
          <Link
            to="/admin/new"
            className="flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            <Plus size={16} /> {t("admin.new")}
          </Link>
          <button
            type="button"
            onClick={() => logout().then(() => navigate("/"))}
            title={t("admin.signOut")}
            className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-card bg-green-50 px-4 py-3 text-sm font-medium text-green-700 ring-1 ring-green-600/15">
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}

      {isLoading ? (
        <p className="py-12 text-center text-sm text-stone-400">{t("admin.loading")}</p>
      ) : order.length === 0 ? (
        <p className="py-12 text-center text-stone-400">{t("admin.emptyList")}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {order.map((art) => (
                <ArtworkRow
                  key={art.id}
                  art={art}
                  onDelete={() => {
                    if (confirm(t("admin.confirmDeleteArtwork", { title: art.title })))
                      remove.mutate(art.id);
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function ArtworkRow({ art, onDelete }: { art: ArtworkListItem; onDelete: () => void }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: art.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-card bg-white p-3 ring-1 ring-black/5 ${
        isDragging ? "relative z-10 shadow-lg" : "shadow-sm"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        title={t("admin.reorder")}
        className="shrink-0 cursor-grab touch-none rounded p-1 text-stone-300 hover:text-stone-500 active:cursor-grabbing"
      >
        <GripVertical size={18} />
      </button>
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-stone-100">
        {art.heroThumbUrl ? (
          <img src={art.heroThumbUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-300">
            <ImageOff size={18} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-stone-800">{art.title}</p>
        <p className="truncate text-xs text-stone-400">
          {[art.year, art.tags.map((tag) => tag.name).join(", ")].filter(Boolean).join(" · ") || "—"}
        </p>
      </div>
      <Link
        to={`/admin/${art.slug}/edit`}
        title={t("admin.edit")}
        className="rounded p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
      >
        <Pencil size={16} />
      </Link>
      <button
        type="button"
        title={t("admin.delete")}
        onClick={onDelete}
        className="rounded p-1.5 text-red-500 hover:bg-red-50"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}
