"""
ASGI entry point for production deployments (Render, Vercel, etc).
Exports the app correctly for all hosting platforms.
"""
import os
import sys
from pathlib import Path

# Ensure backend module can be imported
_BACKEND_DIR = Path(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# Import the FastAPI app from main.py
from main import _backend_app as app

# For Vercel serverless
try:
    from mangum import Mangum
    handler = Mangum(app, lifespan="off")
except ImportError:
    handler = app

# For local uvicorn/Render
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
