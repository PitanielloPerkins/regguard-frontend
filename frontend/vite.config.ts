import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Frontend root (same folder as this file) so cwd does not shadow `index.html` / `.env`. */
const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: frontendRoot,
  envDir: frontendRoot,
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        /** Long-running NDJSON stream from POST /research — avoid dev-proxy idle timeouts. */
        timeout: 600_000,
        proxyTimeout: 600_000,
      },
    },
  },
});
