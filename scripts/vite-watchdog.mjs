#!/usr/bin/env node
/**
 * Restarts the Vite dev server whenever it exits (crash, OOM, killed, etc.).
 * Usage from repo root: npm run dev:watch  (see frontend/package.json)
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontend = path.join(root, "frontend");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function start() {
  const child = spawn(
    npmCmd,
    ["run", "dev", "--", "--host", "127.0.0.1", "--strictPort"],
    {
      cwd: frontend,
      stdio: "inherit",
      env: { ...process.env },
    },
  );
  child.on("exit", (code, signal) => {
    const why = signal ? `signal ${signal}` : `code ${code}`;
    console.error(
      `[reg-guard vite-watchdog] dev server exited (${why}); restarting in 2s…`,
    );
    setTimeout(start, 2000);
  });
}

start();
