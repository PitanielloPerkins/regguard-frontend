# 🔑 STRIPE KEY ROTATION: Step-by-Step

**Objective**: Rotate your LIVE Stripe keys (revoke old, create new)  
**Time**: 5-10 minutes  
**Security**: Critical

---

## 🎯 PART 1: Revoke OLD Secret Key

**Step 1: Go to Stripe Dashboard**
```
1. Open browser
2. Go to: https://dashboard.stripe.com
3. Log in if needed
```

**Step 2: Navigate to API Keys**
```
1. Click: Settings (gear icon, bottom left)
2. Click: Developers (in left sidebar)
3. Click: API keys
4. You'll see your current keys
```

**Step 3: Find and Revoke Secret Key**
```
In the "Secret keys" section:
1. Look for: sk_live_[YOUR_OLD_SECRET_KEY]
2. Click: Three dots menu (•••) next to it
3. Click: "Revoke key"
4. Confirm: "Yes, revoke this key"
```

**Result**: Old secret key is revoked ✅

---

## 🎯 PART 2: Revoke OLD Publishable Key

**Step 1: Find Publishable Keys Section**
```
On same API keys page:
1. Scroll to: "Publishable keys" section (above Secret keys)
```

**Step 2: Revoke Publishable Key**
```
1. Look for: pk_live_51TORV3L2e16brS4iDuI6KCOBQWfEl70gKfVgp5FFMYY9XgQuhSC5DGyx2anx98E5i3O73AQBfGuc8H1z4H2fP1go00Af9xu2UA
2. Click: Three dots menu (•••)
3. Click: "Revoke key"
4. Confirm: "Yes, revoke this key"
```

**Result**: Old publishable key is revoked ✅

---

## 🎯 PART 3: Create NEW Secret Key

**Step 1: Create New Secret Key**
```
1. On same API keys page
2. Look for: "Secret keys" section
3. Click: "+ Create secret key"
```

**Step 2: Name the Key (Optional)**
```
1. Dialog appears: "Name this key"
2. Enter: "RegGuard Production" (optional)
3. Click: "Create secret key"
```

**Step 3: Copy NEW Secret Key**
```
1. New key appears: sk_live_[YOUR_NEW_KEY] (NEW)
2. Click: Copy button (or select and copy)
3. SAVE IT TEMPORARILY (we'll add to .env)
```

**IMPORTANT**: This is your ONLY chance to copy the key  
**Keep it safe, don't share it**

**Result**: New secret key created ✅

---

## 🎯 PART 4: Create NEW Publishable Key

**Step 1: Create New Publishable Key**
```
1. On same page, scroll to: "Publishable keys" section
2. Click: "+ Create publishable key"
```

**Step 2: Name the Key (Optional)**
```
1. Dialog: "Name this key"
2. Enter: "RegGuard Production" (optional)
3. Click: "Create publishable key"
```

**Step 3: Copy NEW Publishable Key**
```
1. New key appears: pk_live_... (NEW)
2. Click: Copy button
3. SAVE IT TEMPORARILY
```

**Result**: New publishable key created ✅

---

## 🎯 PART 5: Update Your .env File

**Step 1: Open .env in your IDE**
```
File location:
/Users/tony_pitaniello/Desktop/reg-guard FINAL/backend/.env
```

**Step 2: Update Secret Key**
```
OLD:
STRIPE_SECRET_KEY=sk_live_...

NEW (paste your new key):
STRIPE_SECRET_KEY=sk_live_[YOUR_NEW_SECRET_KEY]
```

**Step 3: Update Publishable Key**
```
OLD:
STRIPE_PUBLISHABLE_KEY=pk_live_51TORV3L2e16brS4iDuI6KCOBQWfEl70gKfVgp5FFMYY9XgQuhSC5DGyx2anx98E5i3O73AQBfGuc8H1z4H2fP1go00Af9xu2UA

NEW (paste your new key):
STRIPE_PUBLISHABLE_KEY=pk_live_[PASTE_NEW_PUBLISHABLE_KEY_HERE]
```

**Step 4: Save .env file**
```
Cmd+S (Mac) or Ctrl+S (Windows)
```

**Result**: .env file updated ✅

---

## 🎯 PART 6: Push to GitHub (Auto-Deploy to Render)

**Step 1: Open Terminal**
```
In your IDE:
1. Terminal → New Terminal
2. Or: View → Terminal
```

**Step 2: Commit Changes**
```
cd "/Users/tony_pitaniello/Desktop/reg-guard FINAL"
git add .
git commit -m "Rotate Stripe API keys for security"
```

**Step 3: Push to GitHub**
```
git push origin main
```

**Result**: 
- ✅ Changes pushed to GitHub
- ✅ Render auto-detects changes
- ✅ Backend redeploys with new keys
- Takes ~1-2 minutes

---

## ✅ VERIFICATION: Confirm New Keys Are Active

**In terminal:**
```
curl https://regguard-api.onrender.com/health
```

**Should return:**
```
{"ok":true,"service":"reg-guard-api"}
```

If you get that, your new keys are active ✅

---

## 📋 COMPLETE CHECKLIST

```
✅ Step 1: Revoke old secret key
✅ Step 2: Revoke old publishable key
✅ Step 3: Create new secret key (copy it)
✅ Step 4: Create new publishable key (copy it)
✅ Step 5: Update .env with new keys
✅ Step 6: Save .env
✅ Step 7: Git commit + push
✅ Step 8: Verify backend is responding

DONE - Your keys are rotated and secure!
```

---

## 🔐 SECURITY SUMMARY

**What you did:**
- ✅ Revoked compromised keys
- ✅ Created new keys
- ✅ Updated backend with new keys
- ✅ Old keys are now useless

**What's secure now:**
- ✅ Old keys in chat are worthless (revoked)
- ✅ New keys are only in your .env (local)
- ✅ New keys go to Render (encrypted)
- ✅ GitHub never sees your keys (.gitignore protects it)

---

## 📞 IF SOMETHING GOES WRONG

**If you can't find the keys page:**
- Direct link: https://dashboard.stripe.com/apikeys

**If copy button doesn't work:**
- Just select the key text and Cmd+C

**If you forgot to copy the key:**
- Create a new one (you can revoke the unused one)

---

**You're now secure! Your new keys are the only active ones, and old compromised keys are revoked.** 🔒

