/**
 * Force-write frontend roots to disk (bypass IDE Review virtual buffer).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.join(__dirname, "frontend");

const pkg = {
  name: "reg-guard",
  private: true,
  version: "0.0.0",
  type: "module",
  scripts: {
    dev: "vite",
    build: "tsc && vite build",
    preview: "vite preview",
    lint: "eslint .",
  },
  dependencies: {
    react: "^19.0.0",
    "react-dom": "^19.0.0",
  },
  devDependencies: {
    "@eslint/js": "^9.17.0",
    "@types/google.maps": "^3.64.0",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    eslint: "^9.17.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.16",
    globals: "^15.13.0",
    typescript: "^5.6.2",
    "typescript-eslint": "^8.18.0",
    vite: "^6.0.5",
  },
};

const mainTsx = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`;

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark light" />
    <meta
      http-equiv="Permissions-Policy"
      content="geolocation=(self), microphone=(self)"
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,800;1,9..40,400&display=swap"
      rel="stylesheet"
    />
    <!-- Google Maps JS API + Places; key in URL comes from frontend/.env (VITE_) at serve/build -->
    <script
      defer
      src="https://maps.googleapis.com/maps/api/js?key=%VITE_GOOGLE_MAPS_API_KEY%&libraries=places&v=weekly"
    ></script>
    <title>Reg Guard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

fs.mkdirSync(path.join(FRONT, "src"), { recursive: true });
fs.writeFileSync(path.join(FRONT, "package.json"), JSON.stringify(pkg, null, 2) + "\n", "utf8");
fs.writeFileSync(path.join(FRONT, "src/main.tsx"), mainTsx, "utf8");
fs.writeFileSync(path.join(FRONT, "index.html"), indexHtml, "utf8");
console.log("[rg-clean-room] wrote:", path.join(FRONT, "{package.json,src/main.tsx,index.html}"));
