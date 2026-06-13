import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // `shared` is a workspace package shipped as TS source; let Vite transpile it
  // instead of trying to pre-bundle it.
  optimizeDeps: { exclude: ["shared"] },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
      "/media": "http://localhost:3001",
    },
  },
});
