#!/bin/bash

echo "🚀 Starting RegGuard Queue Local Development Servers"
echo "=================================================="
echo ""

# Kill any existing processes
pkill -9 node npm vite 2>/dev/null
sleep 2

# Start backend
echo "Starting backend on http://localhost:8000..."
nohup node - << 'JSEOF' > /tmp/regguard_backend.log 2>&1 &
const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/queue/auto-fill') {
    const response = {
      submission_id: 'queue_' + Date.now(),
      form_type: 'ferc_556',
      filled_form: {
        applicant_name: 'Acme Solar LLC',
        project_name: 'Acme Solar Farm Phase 1',
        capacity_mw: 10.0,
        project_location_state: 'Colorado',
        project_county: 'Denver County',
      },
      accuracy_report: {
        overall_confidence: 0.92,
        required_fields_filled: 14,
        total_required_fields: 15,
        ready_for_submission: true
      },
      ready_for_export: true
    };
    res.writeHead(200);
    res.end(JSON.stringify(response));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(8000, '127.0.0.1', () => {
  console.log('✓ Backend listening on http://127.0.0.1:8000');
});
JSEOF

sleep 3

# Start frontend
echo "Starting frontend on http://localhost:5173..."
cd /Users/tony_pitaniello/Desktop/reg-guard\ FINAL/frontend
nohup npm run dev > /tmp/regguard_frontend.log 2>&1 &

sleep 8

# Verify
echo ""
echo "=================================================="
echo "✓ Servers started!"
echo ""
echo "Frontend: http://localhost:5173/queue/upload"
echo "Backend:  http://localhost:8000/queue/auto-fill"
echo ""
echo "Logs:"
echo "  Backend: tail -f /tmp/regguard_backend.log"
echo "  Frontend: tail -f /tmp/regguard_frontend.log"
echo ""
echo "Press Ctrl+C to exit, or let them run in background"
echo "=================================================="
