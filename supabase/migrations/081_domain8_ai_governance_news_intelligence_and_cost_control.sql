-- ======================================================================================
-- POLIGRAM / KSHETRA PLATFORM MIGRATION 081
-- Domain 8: AI Governance, Grounded News Intelligence & Cost Control (JOB 067–JOB 071)
-- Authority: Master Product Blueprint, Amendment v1.2, Amendment v1.5-A & DEC-192
-- ======================================================================================

-- 1. AI News Summary Cache (Content-Addressed SHA-256 Deduplication)
CREATE TABLE IF NOT EXISTS ai_news_summary_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_sha256 VARCHAR(64) NOT NULL UNIQUE,
    canonical_url TEXT NOT NULL,
    title TEXT NOT NULL,
    summary_3bullet JSONB NOT NULL,
    overall_sentiment VARCHAR(32) NOT NULL DEFAULT 'neutral',
    key_entities JSONB NOT NULL DEFAULT '[]'::jsonb,
    provider_used VARCHAR(64) NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
    hit_count INTEGER NOT NULL DEFAULT 1,
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_news_summary_sha256 ON ai_news_summary_cache(content_sha256);
CREATE INDEX IF NOT EXISTS idx_ai_news_summary_url ON ai_news_summary_cache(canonical_url);

-- 2. AI Sovereign Cost Ledger (Per-call token, cost, latency and provider telemetry)
CREATE TABLE IF NOT EXISTS ai_cost_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64),
    operation_type VARCHAR(64) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    model VARCHAR(64) NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
    cost_inr NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    cache_hit BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cost_ledger_tenant ON ai_cost_ledger(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_ledger_operation ON ai_cost_ledger(operation_type);
CREATE INDEX IF NOT EXISTS idx_ai_cost_ledger_provider ON ai_cost_ledger(provider);

-- 3. AI Tenant Budgets & Circuit Breakers (Daily token quota and spend limiter)
CREATE TABLE IF NOT EXISTS ai_tenant_budgets (
    tenant_id VARCHAR(64) PRIMARY KEY,
    tier VARCHAR(32) NOT NULL DEFAULT 'free',
    daily_token_budget INTEGER NOT NULL DEFAULT 100000,
    daily_spend_limit_usd NUMERIC(10, 4) NOT NULL DEFAULT 5.0000,
    current_day_tokens INTEGER NOT NULL DEFAULT 0,
    current_day_spend_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    circuit_breaker_tripped BOOLEAN NOT NULL DEFAULT false,
    reset_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 day'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed standard default tenant budgets
INSERT INTO ai_tenant_budgets (tenant_id, tier, daily_token_budget, daily_spend_limit_usd, current_day_tokens, current_day_spend_usd, circuit_breaker_tripped, reset_at)
VALUES 
    ('default_tenant', 'free', 100000, 5.0000, 0, 0.0000, false, now() + interval '1 day'),
    ('demo_tenant', 'pro', 500000, 25.0000, 0, 0.0000, false, now() + interval '1 day'),
    ('enterprise_tenant', 'enterprise', 5000000, 250.0000, 0, 0.0000, false, now() + interval '1 day')
ON CONFLICT (tenant_id) DO NOTHING;
