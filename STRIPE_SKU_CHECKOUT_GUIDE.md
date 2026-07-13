# Stripe Integration: SKUs, Pricing, and Checkout Flow

## Overview

This document outlines the Stripe SKU structure and checkout configuration for RegGuard's **Site Diligence Reports** business model: Hybrid ($15K + $20K/yr) + Enterprise ($60K/yr).

---

## Stripe SKU Structure

### SKU 1: Site Diligence Report (Single, One-time)

**Name:** `Site Diligence Report - Single`  
**Type:** One-time payment  
**Amount:** $15,000 USD  
**Recurring:** No

**Description:** "One complete data center site diligence report including regulatory research memo, RTO application worksheets, and cited sources."

**Metadata (for backend tracking):**
```json
{
  "sku_id": "site_report_single",
  "product_type": "report",
  "tier": "hybrid",
  "quantity": 1,
  "renewal_sku": "site_report_annual_monitoring"
}
```

---

### SKU 2: Site Diligence Monitoring (Annual Subscription)

**Name:** `Site Diligence Monitoring - Annual`  
**Type:** Recurring subscription  
**Amount:** $20,000 USD  
**Billing Cycle:** Yearly  
**Recurring:** Yes

**Description:** "Annual monitoring plan including 2-3 additional site diligence reports, quarterly regulatory updates, and RTO queue monitoring."

**Metadata:**
```json
{
  "sku_id": "site_report_annual_monitoring",
  "product_type": "subscription",
  "tier": "hybrid",
  "includes_reports": 2,
  "renewal_price": 20000,
  "trial_days": 0
}
```

---

### SKU 3: Hybrid Bundle (First Report + 1st Year Monitoring)

**Name:** `Hybrid Plan - First Year Bundle`  
**Type:** Mixed (one-time + recurring)  
**Amount Structure:**
- Upfront (first report): $15,000
- Recurring (annual monitoring): $20,000 (starting year 2)

**Description:** "Start here: $15,000 for your first site diligence report + 1 year of monitoring (2-3 additional reports). Renews at $20K/year."

**Metadata:**
```json
{
  "sku_id": "hybrid_first_year_bundle",
  "product_type": "bundle",
  "tier": "hybrid",
  "initial_price": 15000,
  "includes_report": 1,
  "includes_monitoring_months": 12,
  "renewal_sku": "site_report_annual_monitoring",
  "renewal_price": 20000
}
```

---

### SKU 4: Enterprise Plan (Annual Unlimited)

**Name:** `Enterprise Plan - Annual Unlimited`  
**Type:** Recurring subscription  
**Amount:** $60,000 USD  
**Billing Cycle:** Yearly  
**Recurring:** Yes

**Description:** "Unlimited site diligence reports, priority 24-hour turnaround, quarterly strategy calls, API access, and real-time regulatory alert feed."

**Metadata:**
```json
{
  "sku_id": "enterprise_annual_unlimited",
  "product_type": "subscription",
  "tier": "enterprise",
  "includes_reports": 999,
  "includes_calls": 4,
  "api_access": true,
  "renewal_price": 60000,
  "trial_days": 0
}
```

---

## Stripe Checkout Session Configuration

### Checkout Flow 1: Single Report ($15K)

**Endpoint:** `POST /auth/create-checkout-session`  
**Query params:** `?plan=single_report`

**Request body:**
```json
{
  "customer_email": "developer@company.com",
  "plan": "single_report",
  "success_url": "https://app.regguardagent.com/checkout/success",
  "cancel_url": "https://app.regguardagent.com/pricing"
}
```

**Stripe checkout_session object:**
```json
{
  "payment_method_types": ["card"],
  "line_items": [
    {
      "price": "<STRIPE_PRICE_ID_SINGLE_REPORT>",
      "quantity": 1
    }
  ],
  "mode": "payment",
  "success_url": "https://app.regguardagent.com/checkout/success",
  "cancel_url": "https://app.regguardagent.com/pricing",
  "metadata": {
    "plan_type": "hybrid_single",
    "product": "site_diligence_report"
  }
}
```

---

### Checkout Flow 2: Hybrid Plan ($15K + first year monitoring)

**Endpoint:** `POST /auth/create-checkout-session`  
**Query params:** `?plan=hybrid`

**Request body:**
```json
{
  "customer_email": "developer@company.com",
  "plan": "hybrid",
  "success_url": "https://app.regguardagent.com/checkout/success",
  "cancel_url": "https://app.regguardagent.com/pricing"
}
```

**Stripe checkout_session object:**
```json
{
  "payment_method_types": ["card"],
  "line_items": [
    {
      "price": "<STRIPE_PRICE_ID_SINGLE_REPORT>",
      "quantity": 1
    },
    {
      "price": "<STRIPE_PRICE_ID_ANNUAL_MONITORING>",
      "quantity": 1
    }
  ],
  "mode": "subscription",
  "subscription_data": {
    "items": [
      {
        "price": "<STRIPE_PRICE_ID_ANNUAL_MONITORING>"
      }
    ]
  },
  "success_url": "https://app.regguardagent.com/checkout/success",
  "cancel_url": "https://app.regguardagent.com/pricing",
  "metadata": {
    "plan_type": "hybrid",
    "product": "site_diligence_hybrid"
  }
}
```

---

### Checkout Flow 3: Enterprise Plan ($60K/year)

**Endpoint:** `POST /auth/create-checkout-session`  
**Query params:** `?plan=enterprise`

**Request body:**
```json
{
  "customer_email": "pe_partner@firm.com",
  "plan": "enterprise",
  "success_url": "https://app.regguardagent.com/checkout/success",
  "cancel_url": "https://app.regguardagent.com/pricing"
}
```

**Stripe checkout_session object:**
```json
{
  "payment_method_types": ["card"],
  "line_items": [
    {
      "price": "<STRIPE_PRICE_ID_ENTERPRISE_ANNUAL>",
      "quantity": 1
    }
  ],
  "mode": "subscription",
  "subscription_data": {
    "items": [
      {
        "price": "<STRIPE_PRICE_ID_ENTERPRISE_ANNUAL>"
      }
    ]
  },
  "success_url": "https://app.regguardagent.com/checkout/success",
  "cancel_url": "https://app.regguardagent.com/pricing",
  "metadata": {
    "plan_type": "enterprise",
    "product": "site_diligence_enterprise"
  }
}
```

---

## Webhook Events to Listen For

### Event 1: `checkout.session.completed`

**Triggers when:** Customer completes payment in Stripe Checkout

**Payload:**
```json
{
  "id": "evt_...",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_...",
      "customer_email": "developer@company.com",
      "customer": "cus_...",
      "payment_intent": "pi_...",
      "subscription": "sub_...",
      "line_items": {
        "data": [
          {
            "price": {
              "id": "price_...",
              "product": "prod_...",
              "metadata": {
                "sku_id": "site_report_single"
              }
            }
          }
        ]
      },
      "metadata": {
        "plan_type": "hybrid_single"
      }
    }
  }
}
```

**Backend action:**
1. Create customer in Supabase (`users` table) with email
2. Set trial status: `trial_active = true`, `trial_end = DATE_ADD(NOW(), INTERVAL 14 DAY)` (for Hybrid)
3. Set subscription type: `subscription_tier = 'hybrid'` or `'enterprise'`
4. Log successful checkout in `transactions` table

---

### Event 2: `invoice.payment_succeeded`

**Triggers when:** Subscription payment succeeds (annual renewal)

**Payload:**
```json
{
  "type": "invoice.payment_succeeded",
  "data": {
    "object": {
      "customer": "cus_...",
      "subscription": "sub_...",
      "total": 2000000,
      "currency": "usd",
      "paid": true
    }
  }
}
```

**Backend action:**
1. Update `users` table: `subscription_status = 'active'`, `next_renewal_date = DATE_ADD(NOW(), INTERVAL 1 YEAR)`
2. Log renewal payment in `transactions` table

---

### Event 3: `invoice.payment_failed`

**Triggers when:** Subscription payment fails

**Payload:**
```json
{
  "type": "invoice.payment_failed",
  "data": {
    "object": {
      "customer": "cus_...",
      "subscription": "sub_...",
      "paid": false
    }
  }
}
```

**Backend action:**
1. Update `users` table: `subscription_status = 'payment_failed'`
2. Send email to customer: "Payment failed. Please update your payment method."
3. Log failed payment in `transactions` table

---

## Backend Implementation (Python/FastAPI)

### Endpoint: Create Checkout Session

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import stripe
import os

router = APIRouter()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class CheckoutRequest(BaseModel):
    customer_email: str
    plan: str  # "single_report", "hybrid", "enterprise"

STRIPE_PRICES = {
    "single_report": os.getenv("STRIPE_PRICE_SINGLE_REPORT"),  # price_...
    "annual_monitoring": os.getenv("STRIPE_PRICE_ANNUAL_MONITORING"),  # price_...
    "enterprise_annual": os.getenv("STRIPE_PRICE_ENTERPRISE_ANNUAL"),  # price_...
}

@router.post("/auth/create-checkout-session")
async def create_checkout_session(request: CheckoutRequest):
    """
    Create a Stripe checkout session for the given plan.
    """
    plan = request.plan
    
    if plan == "single_report":
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price": STRIPE_PRICES["single_report"],
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url="https://app.regguardagent.com/checkout/success",
            cancel_url="https://app.regguardagent.com/pricing",
            customer_email=request.customer_email,
            metadata={
                "plan_type": "single_report",
                "product": "site_diligence_report"
            },
        )
    
    elif plan == "hybrid":
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price": STRIPE_PRICES["single_report"],
                    "quantity": 1,
                },
                {
                    "price": STRIPE_PRICES["annual_monitoring"],
                    "quantity": 1,
                }
            ],
            mode="subscription",  # Mixed mode: one-time + recurring
            success_url="https://app.regguardagent.com/checkout/success",
            cancel_url="https://app.regguardagent.com/pricing",
            customer_email=request.customer_email,
            metadata={
                "plan_type": "hybrid",
                "product": "site_diligence_hybrid"
            },
        )
    
    elif plan == "enterprise":
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price": STRIPE_PRICES["enterprise_annual"],
                    "quantity": 1,
                }
            ],
            mode="subscription",
            success_url="https://app.regguardagent.com/checkout/success",
            cancel_url="https://app.regguardagent.com/pricing",
            customer_email=request.customer_email,
            metadata={
                "plan_type": "enterprise",
                "product": "site_diligence_enterprise"
            },
        )
    
    else:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    return {"checkout_url": session.url, "session_id": session.id}
```

---

### Webhook Handler

```python
from fastapi import Request
import stripe
import hmac
import hashlib

STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        customer_email = session["customer_email"]
        
        # Create user in Supabase
        user_data = {
            "email": customer_email,
            "subscription_tier": session["metadata"]["plan_type"],
            "trial_active": True,
            "trial_end": datetime.now() + timedelta(days=14),
            "stripe_customer_id": session["customer"],
            "stripe_subscription_id": session.get("subscription"),
        }
        
        # Save to Supabase
        supabase.table("users").insert(user_data).execute()
        
        # Log transaction
        transaction_data = {
            "customer_email": customer_email,
            "plan": session["metadata"]["plan_type"],
            "amount": session["amount_total"] / 100,  # Convert cents to dollars
            "currency": session["currency"].upper(),
            "status": "completed",
            "stripe_session_id": session["id"],
        }
        supabase.table("transactions").insert(transaction_data).execute()
    
    elif event["type"] == "invoice.payment_succeeded":
        invoice = event["data"]["object"]
        subscription_id = invoice["subscription"]
        
        # Update user subscription status
        supabase.table("users").update({
            "subscription_status": "active",
            "next_renewal_date": datetime.fromtimestamp(invoice["period_end"])
        }).eq("stripe_subscription_id", subscription_id).execute()
    
    elif event["type"] == "invoice.payment_failed":
        invoice = event["data"]["object"]
        subscription_id = invoice["subscription"]
        
        # Update user and send email
        supabase.table("users").update({
            "subscription_status": "payment_failed"
        }).eq("stripe_subscription_id", subscription_id).execute()
        
        # Send email notification (implement as needed)
    
    return {"status": "success"}
```

---

## Stripe Price IDs (To be obtained from Stripe Dashboard)

Create these prices in your Stripe Dashboard under Products:

| Plan | Price ID | Amount | Interval |
|------|----------|--------|----------|
| Single Report | `price_1ABC...` | $15,000 | One-time |
| Annual Monitoring | `price_1DEF...` | $20,000 | Yearly |
| Enterprise Annual | `price_1GHI...` | $60,000 | Yearly |

---

## Frontend Stripe Elements Integration (React)

### SignupPage.tsx with Stripe

```typescript
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useNavigate } from 'react-router-dom';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function SignupPage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState('hybrid'); // hybrid, enterprise, single_report
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/auth/create-checkout-session`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_email: 'user@company.com', // Get from form
            plan: selectedPlan,
          }),
        }
      );
      
      const { checkout_url } = await response.json();
      window.location.href = checkout_url; // Redirect to Stripe Checkout
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Plan selection UI */}
      <button onClick={handleCheckout} disabled={loading}>
        {loading ? 'Redirecting...' : `Pay $${selectedPlan === 'enterprise' ? '60,000' : '15,000'}`}
      </button>
    </div>
  );
}
```

---

## Summary Checklist

- [ ] Create Stripe Price IDs in dashboard
- [ ] Add `STRIPE_PRICE_*` environment variables to `.env`
- [ ] Implement `POST /auth/create-checkout-session` endpoint
- [ ] Implement webhook handler at `POST /webhooks/stripe`
- [ ] Add `STRIPE_WEBHOOK_SECRET` to `.env`
- [ ] Update frontend `SignupPage.tsx` with plan selection
- [ ] Add Supabase `users.subscription_tier`, `subscription_status`, `trial_active`, `trial_end` columns
- [ ] Add Supabase `transactions` table for payment tracking
- [ ] Test checkout flow on local (ngrok for webhooks)
- [ ] Deploy to Vercel + Render
- [ ] Monitor webhook events in Stripe Dashboard
