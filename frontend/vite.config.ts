import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    strictPort: false,
  },
  optimizeDeps: {
    include: ['react-router-dom'],
  },
  build: {
    chunkSizeWarningLimit: 1000, // Suppress chunk size warning for this SPA
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': [
            'react',
            'react-dom',
            'react-router-dom',
          ],
        },
      },
    },
  },
  plugins: [
    react()
  ]
})