-- Migration 082: Domain 9 — Offline Synchronization, Screen Resilience, Enterprise Admin Plane & Data Pipelines
-- Implements persistence for JOB 074 (Admin Control Plane & Audit Ledger),
-- JOB 075 (8-Stage Data Ingestion Pipeline), and JOB 076 (Delimitation Source Pipeline).

-- 1. Admin Audit Ledger (JOB 074)
-- Append-only tamper-evident audit ledger capturing all privileged admin operations
CREATE TABLE IF NOT EXISTS admin_audit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL CHECK (actor_role IN ('admin', 'super_admin', 'compliance_officer', 'moderator')),
    domain TEXT NOT NULL CHECK (domain IN ('users', 'moderation', 'verification', 'data_correction', 'campaigns', 'ads', 'billing', 'feature_flags', 'audit')),
    action TEXT NOT NULL,
    target_entity_type TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    before_state JSONB,
    after_state JSONB NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON admin_audit_ledger(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_domain ON admin_audit_ledger(domain, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_entity ON admin_audit_ledger(target_entity_type, target_entity_id);

-- 2. Platform Feature Flags (JOB 074)
CREATE TABLE IF NOT EXISTS platform_feature_flags (
    flag_key TEXT PRIMARY KEY,
    flag_value JSONB NOT NULL,
    description TEXT,
    updated_by TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default feature flags
INSERT INTO platform_feature_flags (flag_key, flag_value, description, updated_by)
VALUES
    ('enable_ai_summaries', 'true'::jsonb, 'Toggle for AI-powered news summaries across mobile and web feeds', 'system_bootstrap'),
    ('election_mode_mcc', 'false'::jsonb, 'Model Code of Conduct lock - restricts political advertisements and requires ECI MCMC pre-certification', 'system_bootstrap'),
    ('offline_sync_v2_enabled', 'true'::jsonb, 'Enables 5-state client-side mutation sync engine in Poligram mobile', 'system_bootstrap'),
    ('civic_emergency_broadcast', 'false'::jsonb, 'Triggers priority high-salience civic alert banners for flood/cyclone/disaster response', 'system_bootstrap'),
    ('developer_api_v1_public', 'true'::jsonb, 'Public access to Poligram OpenAPI 3.1 SaaS endpoints', 'system_bootstrap')
ON CONFLICT (flag_key) DO NOTHING;

-- 3. Data Ingestion Pipeline Jobs (JOB 075)
-- Tracks the 8-stage canonical data transformation lifecycle
CREATE TABLE IF NOT EXISTS data_ingestion_pipeline_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_name TEXT NOT NULL,
    source_uri TEXT NOT NULL,
    snapshot_sha256 TEXT NOT NULL,
    current_stage TEXT NOT NULL CHECK (current_stage IN ('source', 'raw_snapshot', 'parser', 'normalization', 'validation', 'reconciliation', 'production', 'version')),
    total_records INTEGER NOT NULL DEFAULT 0,
    records_normalized INTEGER NOT NULL DEFAULT 0,
    records_validated INTEGER NOT NULL DEFAULT 0,
    records_reconciled INTEGER NOT NULL DEFAULT 0,
    records_committed INTEGER NOT NULL DEFAULT 0,
    version_tag TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_dataset ON data_ingestion_pipeline_jobs(dataset_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status ON data_ingestion_pipeline_jobs(status);

-- 4. Delimitation Source Revisions (JOB 076)
-- Spatial boundary revisions with PostGIS topological validation and area/centroid metrics
CREATE TABLE IF NOT EXISTS delimitation_source_revisions (
    revision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL,
    gazette_date DATE NOT NULL,
    state_code TEXT NOT NULL,
    constituency_count INTEGER NOT NULL DEFAULT 0,
    total_area_delta_km2 NUMERIC NOT NULL DEFAULT 0,
    centroid_shift_meters_max NUMERIC NOT NULL DEFAULT 0,
    voter_shift_estimate INTEGER NOT NULL DEFAULT 0,
    topology_valid BOOLEAN NOT NULL DEFAULT TRUE,
    impact_summary JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delim_revisions_state ON delimitation_source_revisions(state_code, gazette_date DESC);

-- 5. Row Level Security (RLS) Fail-Closed Policies
ALTER TABLE admin_audit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_ingestion_pipeline_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delimitation_source_revisions ENABLE ROW LEVEL SECURITY;

-- Audit ledger is readable and writable strictly by admin and super_admin
CREATE POLICY admin_audit_ledger_admin_policy ON admin_audit_ledger
    FOR ALL
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'super_admin')
        OR auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin')
    );

-- Platform feature flags: public read for client feature gating, write restricted to admin/super_admin
CREATE POLICY platform_feature_flags_select_policy ON platform_feature_flags
    FOR SELECT
    USING (TRUE);

CREATE POLICY platform_feature_flags_admin_write_policy ON platform_feature_flags
    FOR ALL
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'super_admin')
        OR auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin')
    );

-- Ingestion pipeline and delimitation revisions: restricted to admin, data_engineer, and super_admin
CREATE POLICY data_ingestion_pipeline_admin_policy ON data_ingestion_pipeline_jobs
    FOR ALL
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'data_engineer')
        OR auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'data_engineer')
    );

CREATE POLICY delimitation_source_revisions_select_policy ON delimitation_source_revisions
    FOR SELECT
    USING (TRUE);

CREATE POLICY delimitation_source_revisions_admin_write_policy ON delimitation_source_revisions
    FOR ALL
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'data_engineer')
        OR auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'data_engineer')
    );
