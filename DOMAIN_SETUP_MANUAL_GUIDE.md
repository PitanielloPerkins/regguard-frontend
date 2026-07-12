# 🌐 DOMAIN SETUP - COMPLETE GUIDE

**Goal**: Connect regguardagent.com marketing site to your web app and API

**Timeline**: 5-10 minutes per service + 24-48 hours DNS propagation

---

## STEP 1: ADD DNS RECORDS IN SQUARESPACE (5 min)

### 1.1 Go to Squarespace Domains
```
https://account.squarespace.com/domains/managed/regguardagent.com
```

### 1.2 Click "DNS"
You should see the left sidebar with options. Click on **DNS**.

### 1.3 Add First Record (Frontend)
**Click**: "Add Record"

**Fill in**:
```
Type:     CNAME
Name:     app
Value:    cname.vercel-dns.com
TTL:      3600 (default)
```

**Click**: Save

**You should see**:
```
app.regguardagent.com  CNAME  cname.vercel-dns.com
```

### 1.4 Add Second Record (Backend)
**Click**: "Add Record" again

**Fill in**:
```
Type:     CNAME
Name:     api
Value:    cname.onrender.com
TTL:      3600 (default)
```

**Click**: Save

**You should see**:
```
api.regguardagent.com  CNAME  cname.onrender.com
```

✅ **Squarespace DNS setup complete!**

---

## STEP 2: CONFIGURE VERCEL (3 min)

### 2.1 Go to Vercel Dashboard
```
https://vercel.com/dashboard
```

### 2.2 Click Your Project
**Click**: "regguard-live" project

### 2.3 Go to Settings
**Click**: Settings tab (top)

### 2.4 Go to Domains
**In left sidebar, click**: **Domains**

### 2.5 Add Domain
**Click**: "Add" button (or "Add Domain")

**Enter**:
```
app.regguardagent.com
```

**Click**: "Add"

### 2.6 Verify Setup
Vercel will show you two options:
- **Option 1**: "Add these nameservers to your domain registrar"
- **Option 2**: "Use Squarespace's nameservers" (what we're doing)

**Select**: The option showing CNAME configuration
**You should see**: 
```
app.regguardagent.com  →  cname.vercel-dns.com
```

**Status**: Should show "Pending" initially, then "Valid" after DNS propagates

✅ **Vercel setup complete!**

---

## STEP 3: CONFIGURE RENDER (3 min)

### 3.1 Go to Render Dashboard
```
https://dashboard.render.com
```

### 3.2 Click Your Backend Service
**Click**: "regguard-backend" service

### 3.3 Go to Settings
**Click**: Settings tab (top right)

### 3.4 Find Custom Domain
**Scroll down** to find **"Custom Domain"** section
(Or look for **"Domains"** or **"Domain Settings"**)

### 3.5 Add Domain
**Paste**:
```
api.regguardagent.com
```

**Click**: "Add Domain"

### 3.6 Verify Setup
Render will show CNAME or A record instructions
**You should see**:
```
api.regguardagent.com  →  cname.onrender.com
```

**Status**: "Pending DNS" initially, then "Active" after propagation

✅ **Render setup complete!**

---

## ⏳ WAIT FOR DNS PROPAGATION (24-48 hours)

DNS changes take time to propagate worldwide:
- **5 minutes**: Often works immediately
- **1-2 hours**: Usually working
- **24-48 hours**: Guaranteed working everywhere

You can check progress:
```bash
# Check DNS propagation
nslookup app.regguardagent.com
nslookup api.regguardagent.com

# Or use online tool: https://dnschecker.org/
```

---

## ✅ VERIFY SETUP (After propagation)

### Test Frontend
```bash
curl -I https://app.regguardagent.com
# Should return: HTTP 200 (Vercel)
```

### Test Backend
```bash
curl -I https://api.regguardagent.com/health
# Should return: HTTP 200 (Render backend)
```

### Test in Browser
1. Go to: https://regguardagent.com (marketing site)
2. Click "Launch App" → Should go to: https://app.regguardagent.com
3. App should load from your backend: https://api.regguardagent.com

---

## 🎯 FINAL ARCHITECTURE

```
User visits regguardagent.com
        ↓
Squarespace marketing site displays
        ↓
User clicks "Launch App"
        ↓
Redirects to app.regguardagent.com
        ↓
Vercel serves React frontend
        ↓
Frontend makes API calls to api.regguardagent.com
        ↓
Render backend processes requests
        ↓
Data flows back to frontend
        ↓
User sees research results, payments, voice commands, etc.
```

---

## ✨ SUMMARY

**Squarespace DNS Records Added**:
- ✅ app.regguardagent.com → CNAME → cname.vercel-dns.com
- ✅ api.regguardagent.com → CNAME → cname.onrender.com

**Vercel Configuration**:
- ✅ Added app.regguardagent.com as custom domain

**Render Configuration**:
- ✅ Added api.regguardagent.com as custom domain

**Wait for DNS propagation** → **Test everything** → **DONE!** ✅

---

## 🆘 TROUBLESHOOTING

### "DNS not propagating after 24 hours"
1. Check you saved the records correctly in Squarespace
2. Verify CNAME values exactly match what we specified
3. Wait a bit longer (sometimes 48 hours)
4. Use: https://dnschecker.org/ to see status

### "Vercel shows 'Invalid Configuration'"
1. Make sure DNS records are actually saved in Squarespace
2. Check Squarespace DNS shows both CNAME records
3. Wait for propagation before Vercel validates

### "Getting 404 errors on app.regguardagent.com"
1. Wait for DNS propagation (24-48 hours)
2. Clear browser cache (Cmd+Shift+R)
3. Try incognito window
4. Check Vercel domain status (should be "Valid")

---

Let me know when you've completed all three steps! 🚀
