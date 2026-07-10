# RegGuard - Free Trial & Stripe Payment Implementation Guide

**Date:** July 8, 2026  
**Status:** ✅ **Stripe Core Already Integrated - Ready to Enhance**

---

## 🎯 Quick Summary

Your RegGuard platform **already has Stripe integration started**! The backend includes:
- ✅ Stripe API integration (`auth.py`)
- ✅ Checkout Session creation
- ✅ Webhook handling for payment events
- ✅ Supabase user account creation on successful payment
- ✅ 14-day free trial setup

**What's needed:**
- Create signup/onboarding flow frontend
- Build trial expiration & payment prompt UI
- Set up Stripe pricing plans
- Configure webhook handlers
- Create account management dashboard

---

## 📋 Implementation Plan

### **Phase 1: Stripe Setup (Completed - Just Configuration)**

#### Step 1.1: Get Stripe Keys
1. Go to https://dashboard.stripe.com
2. Create account (if needed)
3. Get API keys:
   - **Publishable Key** (public)
   - **Secret Key** (private - store in `.env`)

#### Step 1.2: Create Price & Plan
```bash
# In Stripe Dashboard:
1. Go to Products & Pricing
2. Create Product: "RegGuard Pro"
3. Create Price:
   - $29/month (or your desired pricing)
   - Recurring
   - 14-day trial enabled
4. Copy Price ID (price_xxx...)
5. Set Webhook URL: https://regguardagent.com/auth/webhook/stripe
```

#### Step 1.3: Webhook Secret
```bash
# In Stripe Dashboard:
1. Go to Developers > Webhooks
2. Add endpoint: https://regguardagent.com/auth/webhook/stripe
3. Events to listen for:
   - checkout.session.completed
   - customer.subscription.updated
   - customer.subscription.deleted
4. Copy Webhook Secret (whsec_xxx...)
```

#### Step 1.4: Environment Variables
```bash
# Add to backend .env:
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_PRICE_ID=price_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Add to frontend .env:
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
VITE_BACKEND_ORIGIN=https://regguard-api.onrender.com
```

---

### **Phase 2: Frontend Signup Flow**

#### **Component: SignupFlow.tsx**

```typescript
// Location: frontend/src/SignupFlow.tsx
import { useState } from 'react';
import { Mail, Lock, Building2, Loader } from 'lucide-react';

export function SignupFlow() {
  const [step, setStep] = useState<'info' | 'trial' | 'payment'>('info');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    companyName: '',
    fullName: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Step 1: Create Stripe Checkout Session
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/auth/create-checkout-session`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            company_name: formData.companyName,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { checkout_url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-flow">
      {/* Step 1: Account Info */}
      {step === 'info' && (
        <form onSubmit={(e) => { handleSignup(e); }}>
          <h2>Create Your Account</h2>
          <p className="subtitle">Start your 14-day free trial</p>

          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => 
                setFormData({ ...formData, fullName: e.target.value })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Company Name</label>
            <Building2 size={18} />
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => 
                setFormData({ ...formData, companyName: e.target.value })
              }
              placeholder="Your company or firm name"
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <Mail size={18} />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => 
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="contractor@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <Lock size={18} />
            <input
              type="password"
              value={formData.password}
              onChange={(e) => 
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="Min 8 characters"
              minLength={8}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Processing...
              </>
            ) : (
              'Start 14-Day Free Trial'
            )}
          </button>

          <p className="trial-info">
            ✓ 14-day free trial included
            ✓ No credit card required upfront
            ✓ Cancel anytime
          </p>
        </form>
      )}
    </div>
  );
}
```

---

### **Phase 3: Trial Status & Payment Prompt**

#### **Component: TrialStatus.tsx**

```typescript
// Location: frontend/src/TrialStatus.tsx
import { AlertCircle, Clock, CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TrialInfo {
  isActive: boolean;
  daysRemaining: number;
  expiresAt: string;
  isExpired: boolean;
}

export function TrialStatus() {
  const [trial, setTrial] = useState<TrialInfo | null>(null);

  useEffect(() => {
    // Fetch trial status from backend
    fetchTrialStatus();
  }, []);

  const fetchTrialStatus = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/auth/trial-status`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );
      const data = await response.json();
      setTrial(data);
    } catch (err) {
      console.error('Failed to fetch trial status:', err);
    }
  };

  if (!trial) return null;

  // Trial Ending Soon (< 3 days)
  if (trial.isActive && trial.daysRemaining <= 3) {
    return (
      <div className="trial-alert warning">
        <AlertCircle size={20} />
        <div>
          <h3>Your trial expires in {trial.daysRemaining} day(s)</h3>
          <p>Subscribe now to continue using RegGuard</p>
        </div>
        <button className="btn-primary" onClick={() => goToPayment()}>
          <CreditCard size={16} />
          Upgrade to Pro
        </button>
      </div>
    );
  }

  // Trial Expired
  if (trial.isExpired) {
    return (
      <div className="trial-alert error">
        <AlertCircle size={20} />
        <div>
          <h3>Your free trial has expired</h3>
          <p>Subscribe to continue accessing RegGuard</p>
        </div>
        <button className="btn-primary" onClick={() => goToPayment()}>
          Subscribe Now ($29/month)
        </button>
      </div>
    );
  }

  // Active Trial
  return (
    <div className="trial-badge">
      <Clock size={16} />
      <span>{trial.daysRemaining} days left in your free trial</span>
    </div>
  );
}

function goToPayment() {
  window.location.href = '/billing';
}
```

---

### **Phase 4: Backend Endpoints**

#### **Endpoint 1: Create Checkout Session**
```python
# Already exists in auth.py
@app.post("/auth/create-checkout-session")
async def create_checkout_session_endpoint(
    email: str = Form(...),
    password: str = Form(...),
    company_name: str = Form(...),
):
    """Create Stripe Checkout Session for 14-day trial."""
    result = await create_checkout_session(
        email=email,
        password=password,
        company_name=company_name,
    )
    return result
```

#### **Endpoint 2: Webhook Handler**
```python
# Already exists in main.py
@app.post("/auth/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    body = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    
    if not verify_stripe_webhook_signature(body, sig_header):
        return {"error": "Invalid signature"}
    
    event = json.loads(body)
    
    if event["type"] == "checkout.session.completed":
        session_id = event["data"]["object"]["id"]
        result = await handle_checkout_session_completed(session_id)
        return {"success": True, "user_id": result.get("user_id")}
    
    return {"success": True}
```

#### **Endpoint 3: Trial Status (NEW)**
```python
@app.get("/auth/trial-status")
async def get_trial_status(request: Request):
    """Get current user's trial status."""
    try:
        user_id = get_current_user_id(request)  # From auth header
        
        response = supabase.table("profiles").select(
            "trial_active,trial_expires_at"
        ).eq("id", user_id).single().execute()
        
        profile = response.data
        is_active = profile["trial_active"]
        expires_at = profile["trial_expires_at"]
        
        if not is_active or not expires_at:
            return {
                "isActive": False,
                "isExpired": True,
                "daysRemaining": 0,
            }
        
        from datetime import datetime
        expires = datetime.fromisoformat(expires_at)
        now = datetime.utcnow()
        days_remaining = (expires - now).days
        
        return {
            "isActive": is_active,
            "isExpired": days_remaining <= 0,
            "daysRemaining": max(0, days_remaining),
            "expiresAt": expires_at,
        }
    except Exception as e:
        logger.error(f"Failed to get trial status: {e}")
        return {"error": "Failed to fetch trial status"}
```

---

### **Phase 5: Database Schema**

#### **Profiles Table Updates**
```sql
-- Add to Supabase migrations:
ALTER TABLE public.profiles ADD COLUMN trial_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN trial_expires_at TIMESTAMP NULL;
ALTER TABLE public.profiles ADD COLUMN subscription_id TEXT NULL;
ALTER TABLE public.profiles ADD COLUMN subscription_status TEXT DEFAULT 'trialing';

-- Create index for trial queries
CREATE INDEX idx_trial_expires ON public.profiles(trial_expires_at);
```

---

## 💳 Pricing Options

### **Option 1: Simple Monthly**
```
FREE TRIAL: 14 days
THEN: $29/month
- Unlimited address searches
- Unlimited punch lists
- Priority support
- PDF exports
```

### **Option 2: Tiered Pricing**
```
FREE TIER: Limited (10 searches/month)
PRO: $29/month (Unlimited)
ENTERPRISE: $99/month (White-label + API)
```

### **Option 3: Annual Discount**
```
MONTHLY: $29/month = $348/year
ANNUAL: $299/year = 15% discount
+ 14-day free trial on both
```

---

## 🔐 Security Best Practices

### **Password Handling**
✅ Use Supabase auth (handles hashing)  
✅ Never store plain passwords  
✅ HTTPS only  
✅ Rate limiting on signup  

### **Webhook Security**
✅ Verify Stripe signature (already in code)  
✅ Use Stripe CLI for local testing  
✅ Idempotent webhook handlers  
✅ Log all webhook events  

### **PII Protection**
✅ Use environment variables for keys  
✅ Never log sensitive data  
✅ GDPR compliant (Supabase handles this)  
✅ Secure sessions with JWT  

---

## 📊 User Journey

```
1. User lands on landing page
   ↓
2. Clicks "Start Free Trial"
   ↓
3. Fills in account info (name, email, password, company)
   ↓
4. Clicks "Start 14-Day Trial"
   ↓
5. Redirected to Stripe Checkout
   ↓
6. No payment info required for trial
   ↓
7. Checkout completes
   ↓
8. Supabase user account created
   ↓
9. Redirected to /auth/success
   ↓
10. Access platform with 14-day countdown
   ↓
11. Day 3 before expiry: Payment prompt appears
   ↓
12. User can:
    a) Subscribe ($29/month)
    b) Upgrade to annual
    c) Upgrade to enterprise
```

---

## ✅ Implementation Checklist

### **Immediate (This Week)**
- [ ] Get Stripe API keys
- [ ] Create product & pricing in Stripe dashboard
- [ ] Set webhook URL in Stripe
- [ ] Add environment variables to Render backend
- [ ] Add frontend env vars to Vercel
- [ ] Create SignupFlow.tsx component

### **Short Term (Next Sprint)**
- [ ] Create TrialStatus.tsx component
- [ ] Implement trial-status endpoint
- [ ] Add database schema changes
- [ ] Build billing dashboard
- [ ] Test payment flow

### **Medium Term (Sprint 2)**
- [ ] Set up email notifications (trial expiry)
- [ ] Create invoice generation
- [ ] Build usage analytics
- [ ] Add subscription management UI
- [ ] Set up accounting integration (QuickBooks?)

---

## 🚀 Testing Stripe Locally

### **Stripe Test Mode**
```bash
# Use test keys (begin with pk_test_ / sk_test_)
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Test card numbers:
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Requires auth: 4000 0025 0000 3155
```

### **Stripe CLI for Webhook Testing**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:8001/auth/webhook/stripe

# Test webhook in another terminal
stripe trigger payment_intent.succeeded
```

---

## 📈 Revenue Projections

### **Conservative Estimate**
```
Free Tier:    1,000 signups
Conversion:   5% → 50 paid users
ARR:          50 × $29 × 12 = $17,400
```

### **Moderate Estimate**
```
Free Tier:    5,000 signups
Conversion:   10% → 500 paid users
ARR:          500 × $29 × 12 = $174,000
```

### **Aggressive Estimate**
```
Free Tier:    10,000 signups
Conversion:   15% → 1,500 paid users
Annual Price: $299/year (15% took annual)
ARR:          (500 × $348) + (1,000 × $299) = $474,000
```

---

## 🎯 Next Steps

1. **Today:**
   - Create Stripe account
   - Get API keys
   - Add to environment

2. **Tomorrow:**
   - Create SignupFlow component
   - Test payment flow in test mode
   - Deploy to staging

3. **This Week:**
   - Build trial status component
   - Add trial expiry endpoints
   - Set up email notifications

4. **Next Week:**
   - Launch to production
   - Monitor conversions
   - Optimize onboarding

---

## 📞 Support

- **Stripe Docs:** https://stripe.com/docs
- **Supabase Auth:** https://supabase.com/docs/guides/auth
- **Webhooks Testing:** https://stripe.com/docs/webhooks/test

---

**Your RegGuard platform is ready for monetization with the most battle-tested payment system (Stripe) and proven 14-day trial model that converts 5-15% of signups to paid users!** 💰

Build the signup flow, deploy, and start converting contractors to paying customers! 🚀
