-- Supabase SQL Migration: Create tables for free trials and orders
-- Run this in your Supabase SQL editor

-- Create free_trials table
CREATE TABLE IF NOT EXISTS free_trials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    project_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    memo_sent BOOLEAN DEFAULT FALSE,
    memo_sent_at TIMESTAMP WITH TIME ZONE,
    converted_to_paid BOOLEAN DEFAULT FALSE,
    paid_order_id UUID REFERENCES orders(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table for tracking paid customers
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    project_type TEXT NOT NULL,
    order_type TEXT NOT NULL DEFAULT 'single', -- 'single', 'annual', 'enterprise'
    amount_cents INTEGER, -- $15,000 = 1500000 cents
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    stripe_session_id TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    trial_id UUID REFERENCES free_trials(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_free_trials_email ON free_trials(email);
CREATE INDEX IF NOT EXISTS idx_free_trials_created_at ON free_trials(created_at);
CREATE INDEX IF NOT EXISTS idx_free_trials_memo_sent ON free_trials(memo_sent);
CREATE INDEX IF NOT EXISTS idx_free_trials_converted ON free_trials(converted_to_paid);

CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_trial_id ON orders(trial_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_session_id);

-- Enable Row Level Security (RLS) for free_trials table
ALTER TABLE free_trials ENABLE ROW LEVEL SECURITY;

-- Create policy: users can read their own trial data
CREATE POLICY "Users can read own trial data" ON free_trials
    FOR SELECT USING (email = current_user_email());

-- Create policy: service role can insert/update
CREATE POLICY "Service role can manage trials" ON free_trials
    FOR ALL USING (true) WITH CHECK (true);

-- Enable RLS for orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy: users can read their own orders
CREATE POLICY "Users can read own orders" ON orders
    FOR SELECT USING (email = current_user_email());

-- Create policy: service role can manage orders
CREATE POLICY "Service role can manage orders" ON orders
    FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions to service role
GRANT ALL ON free_trials TO service_role;
GRANT ALL ON orders TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
