-- Premium Features Database Migration
-- Run this in Supabase to create tables for:
-- 1. Environmental Screening
-- 2. IC Partner API
-- 3. Premium Tier
-- 4. Utility Timelines
-- 5. Bulk Orders
-- 6. Channel Model

-- Environmental Screening Results
CREATE TABLE IF NOT EXISTS environmental_screening_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL,
    overall_risk_level TEXT CHECK (overall_risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    screening_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- IC Partner Management
CREATE TABLE IF NOT EXISTS ic_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_name TEXT NOT NULL UNIQUE,
    company_name TEXT,
    contact_email TEXT NOT NULL,
    tier TEXT DEFAULT 'standard',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ic_partner_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES ic_partners(id),
    api_key TEXT UNIQUE,
    api_secret_hash TEXT,
    rate_limit INT DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bulk Orders
CREATE TABLE IF NOT EXISTS bulk_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_email TEXT NOT NULL,
    quantity INT NOT NULL,
    unit_price FLOAT,
    total_price FLOAT,
    discount_percentage FLOAT DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Utility Timelines
CREATE TABLE IF NOT EXISTS utility_timelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utility_provider TEXT NOT NULL,
    project_type TEXT NOT NULL,
    total_days INT,
    phases JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channel Partners
CREATE TABLE IF NOT EXISTS channel_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_name TEXT NOT NULL UNIQUE,
    company_name TEXT,
    contact_email TEXT,
    tier TEXT DEFAULT 'registered',
    commission_percentage FLOAT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channel_partner_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES channel_partners(id),
    sale_amount FLOAT,
    commission_amount FLOAT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_environmental_risk ON environmental_screening_results(overall_risk_level);
CREATE INDEX idx_bulk_orders_customer ON bulk_orders(customer_email);
CREATE INDEX idx_utility_timelines_provider ON utility_timelines(utility_provider);
CREATE INDEX idx_channel_sales_partner ON channel_partner_sales(partner_id);
