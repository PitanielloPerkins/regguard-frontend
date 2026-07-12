# 🎯 STEP-BY-STEP GUIDE: UPDATE RENDER BACKEND

## ⏱️ Time Required: 5 minutes

---

## STEP 1: Go to Render Dashboard
```
https://dashboard.render.com/
```
✓ Log in if needed

---

## STEP 2: Find Your Backend Service
Look for your services list. You should see:
- `regguard-live` (frontend) ← Don't touch this
- `regguard-backend` (backend) ← **Click this one**

**Click on**: regguard-backend

---

## STEP 3: Navigate to Settings
Once you click regguard-backend, you'll see:
- Overview
- Events
- Logs
- Settings ← **Click this**

**Click on**: Settings (tab at top)

---

## STEP 4: Find Build Command
Scroll down on the Settings page. You'll see:

**"Build Command"** field
```
Current might be: (blank or something else)
New value:       pip install -r requirements.txt
```

**Action**:
1. Clear the current text
2. Paste: `pip install -r requirements.txt`
3. Leave it as is

---

## STEP 5: Find Start Command ⭐ CRITICAL
Keep scrolling down. You'll see:

**"Start Command"** field
```
Current might be: (blank or something else)
New value:       cd backend && python -m uvicorn main:_backend_app --host 0.0.0.0 --port $PORT --workers 4
```

**Action**:
1. Clear the current text completely
2. **Copy this entire command** (from below):

```
cd backend && python -m uvicorn main:_backend_app --host 0.0.0.0 --port $PORT --workers 4
```

3. Paste it into the "Start Command" field
4. Verify it looks correct (no extra spaces, complete text)

---

## STEP 6: Save Changes
At the bottom of the Settings page:
- Look for: **"Save"** button (or **"Update"**)
- **Click it**

Wait a moment for it to save. You might see a loading animation.

---

## STEP 7: Redeploy
After saving, you'll likely see a button that says:
- **"Redeploy"** or
- **"Redeploy latest commit"** or
- **"Deploy"**

**Click the Redeploy button**

You should see a message like:
```
"Deployment started..."
"Building application..."
```

---

## STEP 8: Wait for Deployment ⏳
The deployment takes **2-3 minutes**. You'll see:
- `Building` → `Built` → `Deploying` → `Live`

**What to do while waiting**:
- Go to the "Events" tab to watch progress
- Or just wait 3 minutes and move to Step 9

---

## STEP 9: Verify It's Working 🧪
Once deployment shows "Live", test these commands:

### Test 1: Health Check
```bash
curl https://regguard-backend.onrender.com/health
```
**Expected response**:
```json
{"ok":true,"service":"reg-guard-api"}
```

### Test 2: See All Routes
```bash
curl https://regguard-backend.onrender.com/debug/routes
```
**Expected response**: Should show all 37 routes including `/research`

### Test 3: Research Endpoint
```bash
curl -X POST https://regguard-backend.onrender.com/research \
  -H "Content-Type: application/json" \
  -d '{"address":"test","query":"test","jurisdiction":"VA"}'
```
**Expected response**: Should NOT be 404 (should be real response or specific error)

### Test 4: Payment Endpoint
```bash
curl -X POST https://regguard-backend.onrender.com/auth/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"project_name":"Test","customer_email":"test@example.com","customer_id":"user1"}'
```
**Expected response**: Should NOT be 404

---

## ✅ SUCCESS CHECKLIST

- [ ] Logged into Render Dashboard
- [ ] Found regguard-backend service
- [ ] Opened Settings tab
- [ ] Updated Build Command to: `pip install -r requirements.txt`
- [ ] Updated Start Command to: `cd backend && python -m uvicorn main:_backend_app --host 0.0.0.0 --port $PORT --workers 4`
- [ ] Clicked Save
- [ ] Clicked Redeploy
- [ ] Waited 2-3 minutes for deployment
- [ ] Tested: `/health` endpoint
- [ ] Tested: `/debug/routes` endpoint
- [ ] Tested: `/research` endpoint (not 404)
- [ ] Tested: `/auth/create-checkout-session` endpoint (not 404)

---

## 🎉 DONE!

Once all tests pass with 200 responses (not 404), your platform is **100% operational**! ✅

---

## 🆘 TROUBLESHOOTING

### "I can't find the Settings tab"
- Look at the top of the page after clicking regguard-backend
- You should see: Overview | Events | Logs | **Settings**

### "Start Command field is not editable"
- Scroll down more - it should be further down the Settings page
- Make sure you're in the Settings tab

### "It still shows 404 after deployment"
- Check: Did you wait the full 2-3 minutes?
- Check: Events tab to see if there were build errors
- Try: Refresh the page and test again

### "I accidentally changed something else"
- Just change it back or refresh without saving
- No worries - nothing is pushed until you click Save

---

**Let me know once you've completed these steps!** 🚀
