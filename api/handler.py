"""
Vercel serverless handler for RegGuard backend.
Maps Vercel functions to FastAPI routes.
"""
import sys
import os
from pathlib import Path

# Add backend to path
backend_path = str(Path(__file__).parent.parent / "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from main import app
from mangum import Mangum

# Vercel serverless handler
handler = Mangum(app, lifespan="off")
