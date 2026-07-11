#!/usr/bin/env python3
"""
Diagnostic script to verify backend routes are properly registered.
Run this to check if FastAPI app initialization is working.
"""
import sys
import os
from pathlib import Path

# Ensure backend module can be imported
_BACKEND_DIR = Path(__file__).resolve().parent / "backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

print("=" * 70)
print("REGGUARD BACKEND DIAGNOSTIC")
print("=" * 70)
print()

# Check environment
print("📋 ENVIRONMENT VARIABLES:")
print(f"  VERCEL: {os.getenv('VERCEL', '(not set)')}")
print(f"  VERCEL_ENV: {os.getenv('VERCEL_ENV', '(not set)')}")
print(f"  AWS_LAMBDA_FUNCTION_NAME: {os.getenv('AWS_LAMBDA_FUNCTION_NAME', '(not set)')}")
print(f"  PORT: {os.getenv('PORT', '(not set)')}")
print()

# Try to import and inspect the app
print("🔍 IMPORTING BACKEND:")
try:
    from main import app, _backend_app, _running_on_vercel
    print("  ✓ main.py imported successfully")
    print(f"  Running on Vercel: {_running_on_vercel()}")
    print()
    
    # List routes
    print("📍 REGISTERED ROUTES:")
    routes = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            methods = ",".join(sorted(route.methods)) if route.methods else "N/A"
            routes.append((route.path, methods))
            print(f"  {methods:20} {route.path}")
    
    print()
    print(f"Total routes registered: {len(routes)}")
    
    # Check for critical routes
    critical_routes = [
        "/health",
        "/research",
        "/auth/create-checkout-session",
        "/data-center-analysis/request",
        "/geocode-zip",
    ]
    
    print()
    print("✅ CRITICAL ROUTE CHECK:")
    route_paths = [r[0] for r in routes]
    for critical_route in critical_routes:
        found = any(critical_route in path for path in route_paths)
        status = "✓" if found else "✗"
        print(f"  {status} {critical_route}")
    
    print()
    print("=" * 70)
    
except Exception as e:
    print(f"  ✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
