# Fix Custom Domain DNS Records for regguardagent.com

## Current Status
- ❌ `app.regguardagent.com` - "DNS Change Recommended"  
- ❌ `regguardagent.com` - "Invalid Configuration"
- ✅ `regguard-live.vercel.app` - Working perfectly

---

## Solution: Add CNAME Records in Squarespace

### Step 1: Go to Squarespace DNS Settings
1. Open: https://www.squarespace.com/
2. Log in to your account
3. Go to **Domains** → **regguardagent.com**
4. Click **DNS Settings**
5. Look for **CNAME Records** section (or "Custom Records")

### Step 2: Verify You're Using Squarespace Nameservers (CRITICAL)
⚠️ **IMPORTANT:** Make sure at the top it says "Use Squarespace Nameservers" (not Vercel nameservers)

If it shows custom nameservers:
1. Click **Nameservers**
2. Select **Use Squarespace Nameservers**
3. Save

This was a common issue causing "Invalid Configuration" errors.

---

## Step 3: Add CNAME Record for app.regguardagent.com

**In Squarespace DNS:**

1. Click **Add Record** or **+ Add Custom Record**
2. Fill in:
   - **Type**: CNAME
   - **Name/Host**: `app` (just "app", not the full domain)
   - **Data/Points To**: `cname.vercel-dns.com.` (note the trailing dot)
   - **TTL**: 3600 (default is fine)

3. Click **Save**

---

## Step 4: Add CNAME Record for api.regguardagent.com (Optional)

If you want the **API** to also use your custom domain:

1. Click **Add Record**
2. Fill in:
   - **Type**: CNAME
   - **Name/Host**: `api`
   - **Data/Points To**: `cname.render-dns.com.` (Render's CNAME for api.regguardagent.com)
   - **TTL**: 3600

3. Click **Save**

**Note:** If Render backend is already working at `regguard-api.onrender.com`, this step is optional.

---

## Step 5: Verify in Vercel

After adding CNAME records:

1. Go to Vercel: https://vercel.com/dashboard/regguard-live/domains
2. You should see the domain status change to **"Valid Configuration"**
3. May take 5-15 minutes for DNS to propagate

---

## Step 6: Test the Custom Domain

Once status shows ✅ "Valid Configuration":

1. Visit: `https://app.regguardagent.com`
2. Should load the RegGuard app with the dark indigo theme
3. All features should work identically to `regguard-live.vercel.app`

---

## Troubleshooting

**If still showing "Invalid Configuration" after 15 minutes:**

1. **Check CNAME is correct:**
   - Run in terminal: `nslookup app.regguardagent.com`
   - Should return Vercel's IP address

2. **Check nameservers:**
   - Go to Squarespace → Domains → regguardagent.com
   - Confirm "Use Squarespace Nameservers" is selected
   - NOT Vercel's or other custom nameservers

3. **Clear Vercel cache:**
   - Go to Vercel → regguard-live → Domains
   - Click the **Refresh** button next to the domain
   - Wait 2-3 minutes

---

## Expected Final Result

✅ `app.regguardagent.com` → Loads RegGuard Frontend  
✅ `api.regguardagent.com` → (Optional) Points to Render backend  
✅ `regguard-live.vercel.app` → Still works as fallback

---

**Ready to start? Let me know once you've added the CNAME records and I can verify they're working!**
