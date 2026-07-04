# Payment Gate & User Onboarding Setup

This document describes the new Stripe payment gate and Supabase user onboarding flow for RegGuard.

## Overview

Users signing up for RegGuard must:
1. Fill out a signup form (Email, Password, Company Name)
2. Go through Stripe Checkout (14-day free trial, card required upfront)
3. Upon successful payment, a Supabase user account is created
4. User is redirected to the dashboard with their trial active

## Frontend Components

### `SignupForm.tsx`
Main signup form component capturing email, password, and company name.

**Features:**
- Client-side validation (email format, password length ≥8 chars)
- Error handling and display
- Calls `/auth/create-checkout-session` endpoint
- Redirects to Stripe Checkout URL on success

**Integration:**
```tsx
import { SignupForm } from './SignupForm';

<SignupForm onSuccess={() => navigate('/dashboard')} />
```

### `AuthSuccessPage.tsx`
Post-checkout success page shown when user returns from Stripe.

**Features:**
- Displays pending → success → error states
- Auto-redirects to dashboard after 2 seconds on success
- Provides retry mechanism on failure

**Environment Variables:**
The success/cancel URLs in `SignupForm.tsx` are hardcoded to production. For development, update:
```tsx
const success_url = process.env.REACT_APP_AUTH_SUCCESS_URL || 'http://localhost:5173/auth/success';
const cancel_url = process.env.REACT_APP_AUTH_CANCEL_URL || 'http://localhost:5173/signup';
```

## Backend Components

### `auth.py`
Core authentication module handling Stripe integration and Supabase user creation.

**Functions:**
- `create_checkout_session()` - Creates Stripe Checkout Session with metadata
- `handle_checkout_session_completed()` - Processes webhook, creates user/profile
- `verify_stripe_webhook_signature()` - Validates Stripe webhook authenticity
- `stripe_configured()` - Checks if Stripe is properly configured

**Key Details:**
- 14-day free trial configured in subscription data
- User email, company_name, and password stored in Stripe metadata
- Supabase user created on webhook completion
- Profile table entry includes company_name

### `main.py` Endpoints

#### `POST /auth/create-checkout-session`
Request body:
```json
{
  "email": "contractor@example.com",
  "password": "securepass123",
  "company_name": "Bondale Contractors Inc"
}
```

Response:
```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_..."
}
```

#### `POST /auth/webhook/stripe`
Stripe webhook endpoint for `checkout.session.completed` events.

**Processing:**
1. Verify webhook signature
2. Extract session ID from event
3. Retrieve session from Stripe
4. Extract metadata (email, company_name)
5. Create Supabase user account
6. Create profile entry with company_name
7. Return 200 OK

**Security:**
- Signature verification mandatory
- Invalid signatures rejected with 401
- Webhook secret required in environment

## Environment Variables

### Frontend
```bash
VITE_BACKEND_URL=http://localhost:8000
```

### Backend

**Stripe:**
```bash
STRIPE_SECRET_KEY=sk_test_...      # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...    # Webhook signing secret
STRIPE_PRICE_ID=price_...          # Price ID for subscription product
```

**Supabase:**
```bash
SUPABASE_URL=https://project.supabase.co
SUPABASE_KEY=eyJ...               # Supabase service role key (for server-side user creation)
```

## Database Schema

### Supabase `public.profiles` Table

Required columns:
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  company_name TEXT,
  trial_active BOOLEAN DEFAULT TRUE,
  trial_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Flow Diagram

```
┌─────────────────┐
│  User Signup    │
│  Form Input     │
└────────┬────────┘
         │
         ▼
┌──────────────────────────┐
│ POST /auth/create-       │
│ checkout-session         │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Stripe Checkout Session  │
│ Created w/ Metadata      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ User Redirected to       │
│ Stripe Checkout          │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ User Enters Card &       │
│ Completes Payment        │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Stripe Posts Webhook to  │
│ /auth/webhook/stripe     │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Backend Creates:         │
│ - Supabase User          │
│ - Profile Row            │
│   (company_name)         │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ User Redirected to       │
│ /auth/success            │
│ (with session_id param)  │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ AuthSuccessPage Shows    │
│ "Welcome!" & Redirects   │
│ to Dashboard             │
└──────────────────────────┘
```

## Testing Checklist

- [ ] Signup form validates email, password, company_name
- [ ] Form submission calls backend `/create-checkout-session`
- [ ] Backend returns valid Stripe checkout URL
- [ ] User redirected to Stripe Checkout
- [ ] Test card payment (4242 4242 4242 4242)
- [ ] Stripe webhook triggers on success
- [ ] Supabase user created with correct email
- [ ] Profile row includes company_name
- [ ] User redirected to /auth/success
- [ ] AuthSuccessPage auto-redirects to dashboard
- [ ] Invalid webhook signatures rejected
- [ ] Missing credentials show helpful error messages

## Local Development

1. **Get Stripe credentials:**
   - Go to dashboard.stripe.com
   - Get `sk_test_...` key
   - Create webhook endpoint pointing to `http://localhost:8000/auth/webhook/stripe`
   - Copy webhook signing secret (`whsec_...`)

2. **Get Stripe Price ID:**
   - Create a product + price in Stripe dashboard
   - Copy the price ID (`price_...`)

3. **Set environment variables:**
   ```bash
   export STRIPE_SECRET_KEY=sk_test_...
   export STRIPE_WEBHOOK_SECRET=whsec_...
   export STRIPE_PRICE_ID=price_...
   export SUPABASE_URL=https://project.supabase.co
   export SUPABASE_KEY=eyJ...  # Service role key
   ```

4. **Test with Stripe CLI:**
   ```bash
   stripe listen --forward-to localhost:8000/auth/webhook/stripe
   ```

5. **Start backend:**
   ```bash
   cd backend && python main.py
   ```

6. **Start frontend:**
   ```bash
   cd frontend && npm run dev
   ```

7. **Navigate to signup page** and test the flow end-to-end

## Security Notes

- Password is hashed with SHA256 before storing in Stripe metadata (temporary)
- Stripe webhook signatures are verified before processing
- Supabase service role key required for server-side user creation
- Never expose `STRIPE_SECRET_KEY` or `SUPABASE_KEY` to frontend
- Email validation prevents common typos
- Password minimum 8 characters enforced

## Future Enhancements

- [ ] OAuth/SSO integration (Google, Microsoft)
- [ ] Email verification link before dashboard access
- [ ] Trial expiration enforcement
- [ ] Subscription management UI
- [ ] Card update/cancellation flows
- [ ] Trial extension for referrals
