-- Migration 084: Domain 10 - Performance Testing, Security Audits, Spatial Certification & Disaster Recovery
-- Authority: Master Product Blueprint, DEC-203, DEC-204 & Amendment v1.6 Control M

-- 1. Database Performance and Query Audit Log
CREATE TABLE IF NOT EXISTS db_performance_audit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  dataset_entities_count INTEGER NOT NULL,
  audited_queries_count INTEGER NOT NULL,
  n_plus_one_violations_count INTEGER NOT NULL DEFAULT 0,
  max_p95_duration_ms NUMERIC(10, 2) NOT NULL,
  all_slas_met BOOLEAN NOT NULL DEFAULT false,
  audit_report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 2. Security Penetration Test Audit Ledger
CREATE TABLE IF NOT EXISTS security_pentest_audit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  total_probes_count INTEGER NOT NULL,
  passed_probes_count INTEGER NOT NULL,
  failed_probes_count INTEGER NOT NULL DEFAULT 0,
  owasp_top_10_compliant BOOLEAN NOT NULL DEFAULT false,
  dpdp_2023_compliant BOOLEAN NOT NULL DEFAULT false,
  audit_report JSONB NOT NULL,
  sha256_checksum VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 3. Geospatial Topology Certification Ledger
CREATE TABLE IF NOT EXISTS spatial_topology_certification_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  total_ac_count INTEGER NOT NULL,
  total_pc_count INTEGER NOT NULL,
  invalid_geometries_count INTEGER NOT NULL DEFAULT 0,
  sliver_polygons_count INTEGER NOT NULL DEFAULT 0,
  cross_boundary_overlaps_count INTEGER NOT NULL DEFAULT 0,
  containment_violations_count INTEGER NOT NULL DEFAULT 0,
  is_certified_100_percent BOOLEAN NOT NULL DEFAULT false,
  audit_report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 4. Disaster Recovery & Rollback Exercise Ledger
CREATE TABLE IF NOT EXISTS disaster_recovery_drill_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id VARCHAR(64) NOT NULL,
  drill_timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  drill_type VARCHAR(32) NOT NULL, -- 'ROLLBACK_EXERCISE' | 'PITR_DISASTER_RECOVERY'
  rpo_actual_minutes NUMERIC(8, 2) NOT NULL,
  rpo_target_minutes NUMERIC(8, 2) NOT NULL DEFAULT 60.0,
  rpo_passed BOOLEAN NOT NULL,
  rto_actual_minutes NUMERIC(8, 2) NOT NULL,
  rto_target_minutes NUMERIC(8, 2) NOT NULL DEFAULT 30.0,
  rto_passed BOOLEAN NOT NULL,
  data_parity_percent NUMERIC(5, 2) NOT NULL,
  zero_data_loss_certified BOOLEAN NOT NULL DEFAULT false,
  audit_report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 5. Mobile Binary Size Gate Manifests
CREATE TABLE IF NOT EXISTS mobile_size_gate_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  build_commit VARCHAR(64) NOT NULL,
  universal_apk_bytes BIGINT NOT NULL,
  aab_base_module_bytes BIGINT NOT NULL,
  hermes_bundle_bytes BIGINT NOT NULL,
  font_assets_bytes BIGINT NOT NULL,
  apk_delta_percent NUMERIC(6, 2) NOT NULL,
  gate_passed BOOLEAN NOT NULL,
  override_token VARCHAR(64),
  manifest_report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Indexing for rapid audit log querying
CREATE INDEX IF NOT EXISTS idx_db_perf_audit_ts ON db_performance_audit_ledger(audit_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sec_pentest_audit_ts ON security_pentest_audit_ledger(audit_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_spatial_topo_audit_ts ON spatial_topology_certification_ledger(audit_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dr_drill_audit_ts ON disaster_recovery_drill_ledger(drill_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mobile_size_manifest_ts ON mobile_size_gate_manifests(build_timestamp DESC);
