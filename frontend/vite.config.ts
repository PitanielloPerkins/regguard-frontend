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
    server: {
      host: '127.0.0.1',
      port: 5173,
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
