import { createUser, hashPassword, verifyPassword } from "./auth";
import { db, migrate } from "./db";

/**
 * Ensure the single admin account from the environment exists. Idempotent:
 * creates it if absent, refreshes the password hash if ADMIN_PASSWORD changed.
 * A no-op when the env vars are unset (e.g. local dev without an admin).
 */
export function seedAdmin(): void {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return;

  const row = db
    .prepare("SELECT id, password_hash FROM users WHERE username = ?")
    .get(username) as unknown as { id: number; password_hash: string } | undefined;

  if (!row) {
    createUser(username, password);
  } else if (!verifyPassword(password, row.password_hash)) {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), row.id);
  }
}

// Run directly via `pnpm seed`.
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
  seedAdmin();
  console.log("Admin account ensured.");
}
