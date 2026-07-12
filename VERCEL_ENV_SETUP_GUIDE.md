# Vercel Environment Variables Setup — RegGuard Live

## Problem Identified
The frontend was showing a blank page with a MIME type error because:
1. The local `.env` had `VITE_BACKEND_ORIGIN=http://localhost:8001` (wrong port)
2. Vercel didn't have `VITE_BACKEND_ORIGIN` set at all, causing module loading failures

## Solution: Add Environment Variables to Vercel

### Step 1: Go to Vercel Project Settings
1. Open: https://vercel.com/dashboard
2. Select project: **regguard-live**
3. Click: **Settings** (top navigation)
4. Click: **Environment Variables** (left sidebar)

### Step 2: Add the Backend Origin Variable

**For Production (Main Domain):**
- **Name**: `VITE_BACKEND_ORIGIN`
- **Value**: `https://regguard-api.onrender.com`
- **Environments**: Select **Production** ✓

Click **Save**

### Step 3: Optional — Add for Preview/Development
If you want the preview deployments to also work:
- **Name**: `VITE_BACKEND_ORIGIN`
- **Value**: `https://regguard-api.onrender.com`
- **Environments**: Select **Preview** ✓

Click **Save**

### Step 4: Redeploy
Once environment variables are set:
1. Go to **Deployments** tab
2. Click the three dots (...) on the latest deployment
3. Click **Redeploy** (or **Redeploy with cache disabled** if still broken)

The frontend should now load properly! ✅

## Verification
After redeployment:
1. Visit: https://regguard-live.vercel.app/
2. Open browser console (F12)
3. Should see: No MIME type errors
4. App should fully load with the dark indigo theme

## Why This Works
- `VITE_*` prefix makes it available to the frontend build
- Points to your production Render backend
- Vercel injects this at build time
- Frontend can now make API calls to Render

## Troubleshooting
If still blank after redeploy:
1. Clear browser cache (Cmd+Shift+R on Mac)
2. Check Network tab → see if `index-*.js` files load successfully
3. Check Console → for any remaining errors
4. Verify Render backend is running (`curl https://regguard-api.onrender.com/health`)

