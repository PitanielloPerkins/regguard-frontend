"""
Vercel Serverless Handler for RegGuard Queue Backend
Routes all API requests to FastAPI application via Mangum ASGI adapter
"""

import sys
from pathlib import Path

# Add backend directory to path so imports work
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from mangum import Mangum
from main import app

# Wrap FastAPI app with Mangum for serverless
handler = Mangum(app, lifespan="off")
