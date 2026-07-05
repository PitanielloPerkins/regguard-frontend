"""
Vercel Serverless Handler for RegGuard
Minimal wrapper to test if Python functions work at all
"""

async def handler(request):
    """Simple health check endpoint"""
    return {
        "status": "ok",
        "message": "RegGuard API serverless function is operational"
    }
