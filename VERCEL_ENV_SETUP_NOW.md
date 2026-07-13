# ⚡ URGENT: Add Backend URL to Vercel

**Your frontend is now deployed but the backend isn't connected!**

## What to Do RIGHT NOW

1. **Go to Vercel Dashboard**: https://vercel.com/tonypitaniello/regguard
2. **Click the regguard-live project**
3. **Go to Settings → Environment Variables**
4. **Add new variable:**
   - **Name**: `VITE_BACKEND_ORIGIN`
   - **Value**: `https://regguard-api.onrender.com`
   - **Environments**: Select "Production" and "Preview"
5. **Click "Save"**
6. **Redeploy**: Go to Deployments → Click the latest → Click "Redeploy"

## Expected Result

After redeploying, the frontend will:
- ✅ Connect to the backend on Render
- ✅ Load stats from `/roi-stats`
- ✅ Support voice commands
- ✅ All buttons and features work

---

## Technical Details

The frontend now uses:
- **Development**: Local proxy `/api` → `localhost:8000`
- **Production**: Full URL `https://regguard-api.onrender.com` (from env var)

This matches your architecture:
- Frontend: Vercel (`app.regguardagent.com`)
- Backend: Render (`regguard-api.onrender.com`)
