# QUICK REFERENCE - RENDER FIX (1 PAGE)

## 🚀 THE FIX (5 MINUTES)

### Step 1: Go to Render Dashboard
```
https://dashboard.render.com/
```

### Step 2: Click Your Backend Service
```
"regguard-backend"
```

### Step 3: Find Settings & Update These TWO Fields

**Build Command** (Find this setting):
```
OLD: (blank or wrong)
NEW: pip install -r requirements.txt
```

**Start Command** (MOST IMPORTANT):
```
OLD: (blank or wrong) 
NEW: cd backend && python -m uvicorn main:_backend_app --host 0.0.0.0 --port $PORT --workers 4
```

### Step 4: Click "Redeploy latest commit"
Wait 2-3 minutes

### Step 5: Test
```bash
curl https://regguard-backend.onrender.com/health
# Should see: {"ok":true,"service":"reg-guard-api"}

curl https://regguard-backend.onrender.com/debug/routes
# Should see: All 37 routes listed
```

---

## ✅ WHAT WAS WRONG

```
Routes working locally:        ✅ YES (all 37)
Routes working on Render:      ❌ NO (404 errors)
Code is broken:                ❌ NO (perfect)
Render config is wrong:        ✅ YES (THIS IS THE ISSUE)
```

---

## 🎯 AFTER THE FIX

- ✅ Payments will work
- ✅ Research will work
- ✅ Lead capture will work
- ✅ Platform will be 100% ready

---

## 🆘 IF IT STILL FAILS

1. Check Render logs (Events tab) for errors
2. Try test endpoint: `https://regguard-backend.onrender.com/debug/config`
3. Verify Python 3.11 is selected
4. Check if `backend/requirements.txt` exists

---

**That's it! You're 5 minutes from a fully working platform.** 🚀
