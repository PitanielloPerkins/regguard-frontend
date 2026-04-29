import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App.tsx";

const mount = document.getElementById("root");
if (!mount) {
  throw new Error(
    'Reg Guard: `#root` is missing — add `<div id="root"></div>` to `frontend/index.html`.',
  );
}

createRoot(mount).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
