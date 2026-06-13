import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./auth/AuthProvider";
import { Gallery } from "./pages/Gallery";
import { ArtworkDetail } from "./pages/ArtworkDetail";
import { Login } from "./pages/Login";
import { AdminList } from "./pages/AdminList";
import { AdminEdit } from "./pages/AdminEdit";

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
  );
}
