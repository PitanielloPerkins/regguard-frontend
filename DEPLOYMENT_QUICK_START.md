# 🚀 VERCEL DEPLOYMENT - QUICK CHECKLIST

## 1️⃣ Prepare Code (DONE ✅)

- [x] `vercel.json` created
- [x] `api/index.py` created
- [x] Configuration files ready

**Next:** Commit to Git

---

## 2️⃣ Commit to GitHub

```bash
cd /Users/tony_pitaniello/Desktop/reg-guard\ FINAL
git add .
git commit -m "chore: prepare for Vercel deployment"
git push origin main
```

**Check:** `git status` shows "Your branch is ahead of 'origin/main' by 1 commit"

---

## 3️⃣ Deploy to Vercel (Manual UI Steps)

### A. Go to Vercel
- Visit: https://vercel.com/
- Log in with GitHub

### B. Import Project
- Click "Add New" → "Project"
- Click "Import Git Repository"
- Paste: `https://github.com/PitanielloPerkins/reg-guard`
- Click "Import"

### C. Configure
- **Root Directory:** Leave blank (auto-detect)
- **Build Command:** Auto-detected
- **Output Directory:** Auto-detected

### D. Add Environment Variables

When Vercel shows environment variable fields, add:

```
VITE_BACKEND_ORIGIN = https://your-project.vercel.app
VITE_GOOGLE_MAPS_API_KEY = [from frontend/.env]
ANTHROPIC_API_KEY = [from backend/.env]
FIRECRAWL_API_KEY = [from backend/.env]
```

### E. Deploy
- Click "Deploy" button
- Wait 2-5 minutes
- ✅ Done!

---

## 4️⃣ Verify

Test your live app:

```bash
# Replace with your actual URL
curl https://your-project.vercel.app/api/health | jq .
```

Expected response:
```json
{
  "ok": true,
  "service": "reg-guard-api"
}
```

---

## ✅ Your App is Now 24/7 Online!

### Access Points:
- Frontend: `https://your-project.vercel.app`
- Queue: `https://your-project.vercel.app/queue`
- API: `https://your-project.vercel.app/api/`

### Features:
- ✅ Auto-deploys on every GitHub push
- ✅ Auto-restarts on crash
- ✅ 24/7 uptime
- ✅ Free tier available
- ✅ SSL/HTTPS included

---

## 📝 Notes

- **First deployment** takes 2-5 minutes
- **Subsequent deployments** take 1-2 minutes (on `git push`)
- **Logs** available in Vercel dashboard
- **Environment variables** can be updated anytime

---

## 🎉 You're Done!

Your RegGuard Queue is now running in the cloud!

See: `VERCEL_DEPLOYMENT.md` for full details
