import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  loadEnv(mode, frontendRoot, '');
  /** Handshake: Vite dev proxy must target the local Flask API only. */
  const backendOrigin = 'http://127.0.0.1:8000';

  return {
    root: frontendRoot,
    envDir: frontendRoot,
    plugins: [react()],
    /** `jspdf` → `fast-png`; a bad/empty `PngDecoder.js.map` can crash esbuild during dep scan. */
    optimizeDeps: {
      exclude: ['jspdf'],
    },
    server: {
      /** Bind all interfaces; avoids some local port/firewall edge cases when 127.0.0.1 stalls. */
      host: true,
      port: 5173,
      /** If 5173 is busy, Vite picks the next free port instead of failing. */
      strictPort: false,
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
          rewrite: (reqPath) => reqPath.replace(/^\/api/, ''),
          timeout: 600_000,
          proxyTimeout: 600_000,
        },
      },
    },
  };
});
