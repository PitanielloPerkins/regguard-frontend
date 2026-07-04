#!/bin/bash
# Servers runner - keeps both processes alive

ROOT="$( cd "$(dirname "${BASH_SOURCE[0]}")" && pwd )"

pkill -f "python.*uvicorn\|npm run dev" 2>/dev/null || true
sleep 2

cleanup() {
  echo "Shutting down servers..."
  pkill -f "python.*uvicorn\|npm run dev" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting backend..."
cd "$ROOT/backend"
source venv/bin/activate
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --no-access-log > /tmp/backend.log 2>&1 &
BACK_PID=$!

sleep 5

echo "Starting frontend..."
cd "$ROOT/frontend"
npm run dev > /tmp/frontend.log 2>&1 &
FRONT_PID=$!

echo ""
echo "✓ Servers started!"
echo "  Frontend: http://localhost:5173 (PID: $FRONT_PID)"
echo "  Backend: http://localhost:8000 (PID: $BACK_PID)"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Keep the script alive and wait for either process to crash
wait $BACK_PID $FRONT_PID
