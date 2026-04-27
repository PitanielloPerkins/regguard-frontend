import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// reg-guard/frontend — this file lives under the `reg-guard` project root
const __dirname = dirname(fileURLToPath(import.meta.url));
const regGuardRoot = resolve(__dirname, "..");

// https://vite.dev/config/
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    port: 5173,
    fs: {
      allow: [regGuardRoot, __dirname],
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
