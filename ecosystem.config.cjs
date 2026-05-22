/**
 * PM2 dev processes — start from repo root: `pm2 start ecosystem.config.cjs`
 *
 * Frontend `ignore_watch` includes `src/App.tsx` so edits there do not bounce the Vite process;
 * rely on Vite HMR instead to avoid full reload / white-screen flicker.
 */
const path = require("node:path");

const backendRoot = path.join(__dirname, "backend");
const frontendRoot = path.join(__dirname, "frontend");

module.exports = {
  apps: [
    {
      name: "reg-guard-backend",
      cwd: backendRoot,
      script: "main.py",
      interpreter: path.join(backendRoot, "venv", "bin", "python"),
      instances: 1,
      autorestart: true,
      watch: ["."],
      ignore_watch: [
        "venv",
        "__pycache__",
        "*.pyc",
        ".git",
        "node_modules",
        "*.log",
      ],
    },
    {
      name: "reg-guard-frontend",
      cwd: frontendRoot,
      script: "node_modules/vite/bin/vite.js",
      /** Port + strictPort come from ``frontend/vite.config.ts`` (5173 preferred; ``strictPort: false`` avoids restart loops). */
      args: "--host 127.0.0.1",
      instances: 1,
      autorestart: true,
      watch: [".env", ".env.local", "vite.config.ts", "src"],
      ignore_watch: ["node_modules", "dist", "src/App.tsx"],
    },
  ],
};
