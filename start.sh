#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

kill_listeners() {
  local port=$1
  # macOS: PIDs listening on TCP port
  local pids
  pids="$(lsof -nP -iTCP:"${port}" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [ -n "${pids}" ]; then
    echo "Stopping listener(s) on port ${port}: ${pids}"
    echo "${pids}" | xargs kill -9 2>/dev/null || true
  fi
}

kill_listeners 8000
kill_listeners 5173

cleanup() {
  kill -9 "${BACK_PID:-}" "${FRONT_PID:-}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

cd "${ROOT}/backend"
python3 main.py &
BACK_PID=$!

cd "${ROOT}/frontend"
npm run dev &
FRONT_PID=$!

wait
