import { serve } from "@hono/node-server";
import { migrate } from "./db";
import { seedAdmin } from "./seed";
import { createApp } from "./app";

// Idempotent on every boot: ensure the schema and the env-defined admin exist.
migrate();
seedAdmin();

const app = createApp();
const port = Number(process.env.PORT ?? 3001);
// Bind to localhost by default; in production nginx is the only public listener.
const hostname = process.env.HOST ?? "127.0.0.1";
serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`API listening on http://${hostname}:${info.port}`);
});
