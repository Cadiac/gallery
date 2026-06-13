import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { CredentialsSchema } from "shared";
import { useAuth } from "../auth/AuthProvider";
import { ApiError } from "../api/client";

export function Login() {
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/admin" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = CredentialsSchema.safeParse({ username, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    try {
      await login(parsed.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center font-display text-3xl font-bold text-stone-900">
          Gallery admin
        </h1>
        <p className="mb-6 text-center text-sm text-stone-500">Sign in to manage artwork.</p>

        <form
          onSubmit={submit}
          className="flex flex-col gap-3 rounded-card bg-white p-5 shadow-md ring-1 ring-black/5"
        >
          <label className="flex flex-col gap-1 text-sm font-medium text-stone-700">
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              className="rounded-card border border-stone-300 bg-stone-50 px-3 py-2 text-base outline-none focus:border-stone-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-stone-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="rounded-card border border-stone-300 bg-stone-50 px-3 py-2 text-base outline-none focus:border-stone-500"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy || loading}
            className="mt-1 rounded-card bg-stone-900 py-2.5 font-semibold text-stone-50 disabled:opacity-50 active:scale-[0.99]"
          >
            {busy ? "…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
