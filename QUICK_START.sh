#!/bin/bash
# RegGuard Platform Quick Start Script
# This script sets up and runs the complete RegGuard platform locally

set -e

echo "🚀 RegGuard Platform - Quick Start"
echo "===================================="
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${YELLOW}Error: Must run from repository root${NC}"
  exit 1
fi

echo -e "${BLUE}Step 1: Installing frontend dependencies...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
  npm install
else
  echo "✓ Frontend dependencies already installed"
fi
cd ..

echo ""
echo -e "${BLUE}Step 2: Setting up Python backend...${NC}"
cd backend
if [ ! -d "venv" ]; then
  python3 -m venv venv
  echo "✓ Virtual environment created"
fi

# Activate venv
source venv/bin/activate

# Install requirements
if [ -f "requirements.txt" ]; then
  pip install -q -r requirements.txt
  echo "✓ Python dependencies installed"
else
  echo -e "${YELLOW}Warning: requirements.txt not found${NC}"
fi

cd ..

echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo "Option 1: Run both frontend and backend together:"
echo "  npm run dev:all"
echo ""
echo "Option 2: Run them separately (recommended for debugging):"
echo "  Terminal 1: npm run dev:frontend"
echo "  Terminal 2: npm run dev:backend"
echo ""
echo -e "${YELLOW}Frontend:${NC} http://localhost:5173"
echo -e "${YELLOW}Backend:${NC}  http://localhost:8001"
echo -e "${YELLOW}API Docs:${NC} http://localhost:8001/docs"
echo ""
echo "🌐 Open http://localhost:5173 in your browser to access the platform"
echo ""
