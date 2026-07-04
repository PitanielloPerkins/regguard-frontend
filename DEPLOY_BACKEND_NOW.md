# ⚡ ONE-CLICK Backend Deployment to Vercel

**Copy and paste this link into your browser:**

👉 https://vercel.com/new?repo=https://github.com/PitanielloPerkins/regguard-frontend&rootDirectory=backend

This will:
- Auto-select your repo
- Auto-set root to `backend/`
- Auto-configure Python runtime

## What to do on the Vercel page:

1. **Name your project** (default: `regguard-frontend`)
2. **Scroll down to "Environment Variables"**
3. **Add these 4 environment variables** (copy from `/Users/tony_pitaniello/Desktop/reg-guard FINAL/.env`):
   - `ANTHROPIC_API_KEY` = (your key)
   - `FIRECRAWL_API_KEY` = (your key)
   - `SUPABASE_URL` = (your url)
   - `SUPABASE_KEY` = (your key)

4. **Click "Deploy"**

⏱️ Wait 2-3 minutes for build

---

## After it deploys:

You'll get a URL like: `https://regguard-api-xxxxx.vercel.app`

### Connect frontend to backend:

Run this command:
```bash
cd /Users/tony_pitaniello/Desktop/reg-guard\ FINAL
export BACKEND_URL="https://regguard-api-xxxxx.vercel.app"
echo "VITE_BACKEND_ORIGIN=$BACKEND_URL" >> frontend/.env
git add frontend/.env
git commit -m "Connect to Vercel backend"
git push
```

Then your frontend will auto-redeploy and connect!

---

## Final Result:

✅ Frontend: https://reg-guard.vercel.app (with working forms!)
✅ Backend: https://regguard-api-xxxxx.vercel.app (stable, scalable)
✅ No more crashes
✅ Production ready

**Ready?** Click the link above and follow the 4 steps!
