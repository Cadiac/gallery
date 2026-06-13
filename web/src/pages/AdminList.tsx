import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, CheckCircle2, ImageOff, LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
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

  // Success feedback set by AdminEdit on save/create/delete. Clear the history
  // state so a refresh doesn't show it again, and fade it out after a moment.
  const [notice, setNotice] = useState<string | null>(
    (location.state as { notice?: string } | null)?.notice ?? null,
  );
  useEffect(() => {
    if (!notice) return;
    window.history.replaceState({}, "");
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const move = (id: number, toIndex: number) => {
    if (toIndex < 0 || !artworks || toIndex >= artworks.length) return;
    reorder.mutate({ id, patch: { position: toIndex } });
  };

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
      ) : !artworks || artworks.length === 0 ? (
        <p className="py-12 text-center text-stone-400">{t("admin.emptyList")}</p>
      ) : (
        <ul className="divide-y divide-black/5 overflow-hidden rounded-card bg-white shadow-sm ring-1 ring-black/5">
          {artworks.map((art, idx) => (
            <li key={art.id} className="flex items-center gap-3 p-3">
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
                  {[art.year, art.tags.map((t) => t.name).join(", ")].filter(Boolean).join(" · ") ||
                    "—"}
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  title={t("admin.moveUp")}
                  disabled={idx === 0}
                  onClick={() => move(art.id, idx - 1)}
                  className="rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  title={t("admin.moveDown")}
                  disabled={idx === artworks.length - 1}
                  onClick={() => move(art.id, idx + 1)}
                  className="rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
                >
                  <ArrowDown size={16} />
                </button>
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
                  onClick={() => {
                    if (confirm(t("admin.confirmDeleteArtwork", { title: art.title })))
                      remove.mutate(art.id);
                  }}
                  className="rounded p-1.5 text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
