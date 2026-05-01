/**
 * Physical sync: copy six canonical files from `rg_clean_room_mirror/` into `frontend/`.
 * Run from repo root: `node rg_clean_room_sync.mjs`
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIRROR = path.join(__dirname, "rg_clean_room_mirror");
const FRONT = path.join(__dirname, "frontend");

/** Relative paths identical under mirror and under frontend. */
const RELS = [
  "package.json",
  "index.html",
  "src/main.tsx",
  "src/App.tsx",
  "src/App.css",
  "src/AddressAutocomplete.tsx",
];

if (!fs.existsSync(MIRROR)) {
  console.error("[rg-clean-room] missing mirror dir:", MIRROR);
  process.exit(1);
}

for (const rel of RELS) {
  const src = path.join(MIRROR, rel);
  const dest = path.join(FRONT, rel);
  if (!fs.existsSync(src)) {
    console.error("[rg-clean-room] missing source file:", src);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

console.log("[rg-clean-room] copied", RELS.length, "files from mirror →", FRONT);
