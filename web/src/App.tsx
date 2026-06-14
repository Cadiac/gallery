import { Navigate, Route, Routes, useLocation, useNavigationType } from "react-router-dom";
import { Suspense, lazy, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./auth/AuthProvider";
import { Gallery } from "./pages/Gallery";
import { ArtworkDetail } from "./pages/ArtworkDetail";

// Admin-only screens are code-split so the public gallery bundle stays lean —
// dnd-kit and the rest of the admin UI are only fetched once you sign in.
const Login = lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const AdminList = lazy(() => import("./pages/AdminList").then((m) => ({ default: m.AdminList })));
const AdminEdit = lazy(() => import("./pages/AdminEdit").then((m) => ({ default: m.AdminEdit })));

// Per-location scroll memory, keyed by history entry. Lives outside the
// component so it survives re-renders for the life of the tab.
const scrollPositions = new Map<string, number>();

/**
 * Scroll restoration for the declarative router (the built-in
 * <ScrollRestoration> only ships with the data router). Forward navigations
 * (PUSH/REPLACE) start at the top; going back (POP) restores where you were —
 * which also lets Safari's interactive swipe-back preview the previous page at
 * its real scroll offset instead of being yanked to the top.
 */
function ScrollRestoration() {
  const { key } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType === "POP") {
      window.scrollTo(0, scrollPositions.get(key) ?? 0);
    } else {
      window.scrollTo(0, 0);
    }

    // Keep this entry's saved offset current so we can return to it later.
    const onScroll = () => scrollPositions.set(key, window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [key, navType]);

  return null;
}

/** Quiet site-wide footer carrying the artist's name (from site.author). */
function Footer() {
  const { t } = useTranslation();
  const name = t("site.author");
  if (!name) return null;
  return (
    <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6">
      <div className="border-t border-stone-200 pt-6 text-center text-sm text-stone-400">
        {name} · {new Date().getFullYear()}
      </div>
    </footer>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-12 text-center text-sm text-stone-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = t("site.title");
  }, [t]);

  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-stone-400">{t("admin.loading")}</div>}>
      <ScrollRestoration />
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/a/:slug" element={<ArtworkDetail />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminList />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/new"
          element={
            <RequireAuth>
              <AdminEdit />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/:slug/edit"
          element={
            <RequireAuth>
              <AdminEdit />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </Suspense>
  );
}
