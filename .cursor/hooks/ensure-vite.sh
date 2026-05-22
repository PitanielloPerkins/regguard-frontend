#!/usr/bin/env bash
# After an agent run, bring Vite back if nothing is listening on 5173 (e.g. dev server SIGKILL).
set -euo pipefail
cat >/dev/null

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if curl -sf --max-time 2 "http://127.0.0.1:5173/" >/dev/null 2>&1; then
  echo '{}'
  exit 0
fi
if command -v lsof >/dev/null 2>&1; then
  if lsof -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
    echo '{}'
    exit 0
  fi
fi

cd "${ROOT}/frontend"
nohup npm run dev -- --host 127.0.0.1 --strictPort >>"${ROOT}/.cursor/vite-dev.log" 2>&1 &
disown || true
echo '{}'
exit 0
