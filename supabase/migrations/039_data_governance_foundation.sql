-- ==============================================================================
-- Migration 039: Data Governance Foundation & Provenance Architecture (W012)
-- Target: Staging Supabase (fkpigozcqnmcvofuksar)
-- Authoritative Architecture: docs/W012_DATA_GOVERNANCE_INVENTORY.md
-- CTO Pre-Staging Security Hardening:
--   1. Dataset Version Immutability (Snapshots protected from in-place mutation/deletion)
--   2. Provenance Append-Only Enforcement (Classification of immutable historical vs lifecycle fields)
--   3. Restrictive Deletion & Anti-Cascade Semantics (ON DELETE RESTRICT, no silent cascades)
--   4. Evidence Record Immutability (Permanent freeze on verification evidence)
--   5. Mandatory Evidence Record for all OFFICIAL transitions (versions + provenance)
--   6. Public Governance Visibility Classification (Column-level grants for public transparency)
--   7. Hardened SECURITY DEFINER search_path and execution boundaries
-- ==============================================================================

BEGIN;

-- ─── 1. ENUM DEFINITIONS ───────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE source_authority_enum AS ENUM (
    'constitutional',
    'statutory',
    'academic',
    'media_ngo',
    'crowdsourced',
    'synthetic_model'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE data_status_enum AS ENUM (
    'OFFICIAL',
    'DERIVED',
    'VERIFIED',
    'ESTIMATE',
    'SCENARIO',
    'INFERRED',
    'UNVERIFIED',
    'UNKNOWN'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── 2. DATA SOURCES REGISTRY ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  publisher TEXT NOT NULL,
  authority_level source_authority_enum NOT NULL,
  canonical_url TEXT,
  license TEXT,
  retrieval_method TEXT,
  refresh_frequency TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE data_sources IS 'Canonical registry of primary data publishers and institutional authority levels.';
COMMENT ON COLUMN data_sources.authority_level IS 'Institutional authority of the source (decoupled from individual record data status).';

-- ─── 3. DATASETS CATALOG ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS datasets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN (
    'geography',
    'election',
    'political_profiles',
    'civic_governance',
    'news',
    'demographics',
    'election_projection',
    'other'
  )),
  description TEXT,
  source_id TEXT NOT NULL REFERENCES data_sources(id) ON DELETE RESTRICT,
  license TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE datasets IS 'Governed dataset entities across all civic and electoral domains.';

-- ─── 4. DATASET VERSIONS (IMMUTABLE SNAPSHOTS) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS dataset_versions (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE RESTRICT,
  version_tag TEXT NOT NULL,
  effective_from DATE,
  effective_to DATE,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  record_count INTEGER NOT NULL DEFAULT 0,
  checksum_sha256 TEXT,
  storage_path TEXT,
  default_status data_status_enum NOT NULL DEFAULT 'UNKNOWN',
  verification_evidence_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dataset_id, version_tag)
);

COMMENT ON TABLE dataset_versions IS 'Immutable snapshots of datasets with checksums and temporal validity.';
COMMENT ON COLUMN dataset_versions.default_status IS 'Default factual status for records in this version; strictly defaults to UNKNOWN.';

-- ─── 5. EVIDENCE RECORDS (AUTHORITATIVE VERIFICATION EVIDENCE) ─────────────────

CREATE TABLE IF NOT EXISTS evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version_id TEXT REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  artifact_name TEXT NOT NULL,
  artifact_sha256 TEXT NOT NULL,
  verification_authority TEXT NOT NULL,
  verified_by TEXT NOT NULL,
  verification_notes TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE evidence_records IS 'Cryptographically auditable evidence records required for status elevation to OFFICIAL.';

-- Add reciprocal foreign key on dataset_versions now that evidence_records exists
DO $$ BEGIN
  ALTER TABLE dataset_versions
    ADD CONSTRAINT fk_dataset_versions_evidence
    FOREIGN KEY (verification_evidence_id)
    REFERENCES evidence_records(id)
    ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── 6. PROVENANCE RECORDS (APPEND-ONLY LINEAGE DAG) ───────────────────────────

CREATE TABLE IF NOT EXISTS provenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version_id TEXT NOT NULL REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  source_record_id TEXT,
  parent_provenance_id UUID REFERENCES provenance_records(id) ON DELETE RESTRICT,
  status data_status_enum NOT NULL DEFAULT 'UNKNOWN',
  transformation_type TEXT NOT NULL DEFAULT 'raw_ingest',
  transform_version TEXT,
  operator TEXT NOT NULL DEFAULT 'system',
  verified_by TEXT,
  verification_evidence_id UUID REFERENCES evidence_records(id) ON DELETE RESTRICT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE provenance_records IS 'Append-only provenance lineage nodes forming a DAG of source and transformation history.';
COMMENT ON COLUMN provenance_records.parent_provenance_id IS 'Self-referencing foreign key linking sequential transformation steps.';
COMMENT ON COLUMN provenance_records.verification_evidence_id IS 'Reference to authoritative evidence record required for OFFICIAL status elevation.';

-- ─── 7. RECORD PROVENANCE LINKAGES (M:N DOMAIN LINKAGE) ────────────────────────

CREATE TABLE IF NOT EXISTS record_provenance_linkages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_table TEXT NOT NULL,
  domain_record_id TEXT NOT NULL,
  provenance_id UUID NOT NULL REFERENCES provenance_records(id) ON DELETE RESTRICT,
  is_canonical BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(domain_table, domain_record_id, provenance_id)
);

COMMENT ON TABLE record_provenance_linkages IS 'M:N association connecting governed domain records to one or more provenance lineage nodes.';

-- ─── 8. INDEXES ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_data_sources_authority ON data_sources(authority_level);
CREATE INDEX IF NOT EXISTS idx_datasets_source ON datasets(source_id);
CREATE INDEX IF NOT EXISTS idx_datasets_domain ON datasets(domain);
CREATE INDEX IF NOT EXISTS idx_dataset_versions_dataset ON dataset_versions(dataset_id);
CREATE INDEX IF NOT EXISTS idx_dataset_versions_status ON dataset_versions(default_status);
CREATE INDEX IF NOT EXISTS idx_dataset_versions_evidence ON dataset_versions(verification_evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_records_version ON evidence_records(dataset_version_id);
CREATE INDEX IF NOT EXISTS idx_provenance_records_version ON provenance_records(dataset_version_id);
CREATE INDEX IF NOT EXISTS idx_provenance_records_parent ON provenance_records(parent_provenance_id);
CREATE INDEX IF NOT EXISTS idx_provenance_records_status ON provenance_records(status);
CREATE INDEX IF NOT EXISTS idx_provenance_records_evidence ON provenance_records(verification_evidence_id);
CREATE INDEX IF NOT EXISTS idx_record_provenance_lookup ON record_provenance_linkages(domain_table, domain_record_id, is_canonical);
CREATE INDEX IF NOT EXISTS idx_record_provenance_prov ON record_provenance_linkages(provenance_id);

-- ─── 9. SECURITY & INVARIANT FUNCTIONS AND TRIGGERS ────────────────────────────

-- Trigger Function: Enforce evidence_records immutability (No updates, no deletions)
CREATE OR REPLACE FUNCTION prevent_evidence_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DELETION PROHIBITED: Authoritative verification evidence records are permanent and cannot be deleted.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Authoritative verification evidence records are immutable and cannot be modified in place. Register a new evidence record instead.';
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_evidence_mutation ON evidence_records;
CREATE TRIGGER trg_prevent_evidence_mutation
  BEFORE UPDATE OR DELETE ON evidence_records
  FOR EACH ROW
  EXECUTE FUNCTION prevent_evidence_mutation();

-- Trigger Function: Enforce dataset_versions snapshot immutability
CREATE OR REPLACE FUNCTION prevent_dataset_version_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DELETION PROHIBITED: Historical dataset versions are immutable and cannot be deleted. Archive or supersede instead.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.id != NEW.id OR
       OLD.dataset_id != NEW.dataset_id OR
       OLD.version_tag != NEW.version_tag OR
       OLD.effective_from IS DISTINCT FROM NEW.effective_from OR
       OLD.effective_to IS DISTINCT FROM NEW.effective_to OR
       OLD.retrieved_at != NEW.retrieved_at OR
       OLD.record_count != NEW.record_count OR
       OLD.checksum_sha256 IS DISTINCT FROM NEW.checksum_sha256 OR
       OLD.storage_path IS DISTINCT FROM NEW.storage_path OR
       OLD.metadata != NEW.metadata OR
       OLD.created_at != NEW.created_at THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Historical dataset version snapshots cannot be modified in place. Register a new version snapshot instead.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_dataset_version_mutation ON dataset_versions;
CREATE TRIGGER trg_prevent_dataset_version_mutation
  BEFORE UPDATE OR DELETE ON dataset_versions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_dataset_version_mutation();

-- Trigger Function: Enforce dataset_versions status transition invariants & mandatory evidence
CREATE OR REPLACE FUNCTION check_version_status_transition_invariant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Invariant 1: SCENARIO -> OFFICIAL is PERMANENTLY PROHIBITED
  IF OLD.default_status = 'SCENARIO' AND NEW.default_status = 'OFFICIAL' THEN
    RAISE EXCEPTION 'INVARIANT VIOLATION: SCENARIO dataset versions cannot be elevated to OFFICIAL status. Projections/scenarios must remain permanently distinct from verified official records.';
  END IF;

  -- Invariant 2: Transition to OFFICIAL requires authorized role AND authoritative evidence record
  IF NEW.default_status = 'OFFICIAL' AND (OLD.default_status IS DISTINCT FROM 'OFFICIAL') THEN
    IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') AND coalesce(auth.role(), '') != 'service_role' THEN
      RAISE EXCEPTION 'AUTHORIZATION DENIED: Elevating dataset version to OFFICIAL status requires authorized administrative role (current_user: %, auth.role: %)', current_user, coalesce(auth.role(), 'none');
    END IF;

    IF NEW.verification_evidence_id IS NULL THEN
      RAISE EXCEPTION 'EVIDENCE REQUIRED: Elevating dataset version to OFFICIAL requires an authoritative verification_evidence_id link.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM evidence_records WHERE id = NEW.verification_evidence_id) THEN
      RAISE EXCEPTION 'EVIDENCE NOT FOUND: verification_evidence_id % does not match any valid evidence record in evidence_records.', NEW.verification_evidence_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_version_status_transition ON dataset_versions;
CREATE TRIGGER trg_check_version_status_transition
  BEFORE UPDATE ON dataset_versions
  FOR EACH ROW
  EXECUTE FUNCTION check_version_status_transition_invariant();

-- Trigger Function: Enforce append-only immutability of historical provenance lineage fields
CREATE OR REPLACE FUNCTION prevent_provenance_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DELETION PROHIBITED: Provenance lineage records are append-only and cannot be deleted.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Immutable historical fields (Classification A)
    IF OLD.id != NEW.id OR
       OLD.dataset_version_id != NEW.dataset_version_id OR
       OLD.source_record_id IS DISTINCT FROM NEW.source_record_id OR
       OLD.parent_provenance_id IS DISTINCT FROM NEW.parent_provenance_id OR
       OLD.transformation_type != NEW.transformation_type OR
       OLD.transform_version IS DISTINCT FROM NEW.transform_version OR
       OLD.operator != NEW.operator OR
       OLD.created_at != NEW.created_at THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Historical provenance lineage fields cannot be modified in place. Append a new provenance record instead.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_provenance_mutation ON provenance_records;
CREATE TRIGGER trg_prevent_provenance_mutation
  BEFORE UPDATE OR DELETE ON provenance_records
  FOR EACH ROW
  EXECUTE FUNCTION prevent_provenance_mutation();

-- Trigger Function: Enforce status transition security and permanently block SCENARIO -> OFFICIAL on provenance
CREATE OR REPLACE FUNCTION check_status_transition_invariant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Invariant 1: SCENARIO -> OFFICIAL is PERMANENTLY PROHIBITED
  IF OLD.status = 'SCENARIO' AND NEW.status = 'OFFICIAL' THEN
    RAISE EXCEPTION 'INVARIANT VIOLATION: SCENARIO records cannot be elevated to OFFICIAL status. Projections/scenarios must remain permanently distinct from verified official records.';
  END IF;

  -- Invariant 2: Transition to OFFICIAL from non-official requires authoritative evidence and authorized service_role
  IF NEW.status = 'OFFICIAL' AND (OLD.status IS DISTINCT FROM 'OFFICIAL') THEN
    IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') AND coalesce(auth.role(), '') != 'service_role' THEN
      RAISE EXCEPTION 'AUTHORIZATION DENIED: Elevating record to OFFICIAL status requires authorized administrative role (current_user: %, auth.role: %)', current_user, coalesce(auth.role(), 'none');
    END IF;

    IF NEW.verification_evidence_id IS NULL THEN
      RAISE EXCEPTION 'EVIDENCE REQUIRED: Elevating status to OFFICIAL requires an authoritative verification_evidence_id link.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM evidence_records WHERE id = NEW.verification_evidence_id) THEN
      RAISE EXCEPTION 'EVIDENCE NOT FOUND: verification_evidence_id % does not match any valid evidence record in evidence_records.', NEW.verification_evidence_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_provenance_status_transition ON provenance_records;
CREATE TRIGGER trg_check_provenance_status_transition
  BEFORE UPDATE ON provenance_records
  FOR EACH ROW
  EXECUTE FUNCTION check_status_transition_invariant();

-- ─── 10. ROW LEVEL SECURITY (RLS) & PUBLIC VISIBILITY GOVERNANCE ────────────────

ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE provenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_provenance_linkages ENABLE ROW LEVEL SECURITY;

ALTER TABLE data_sources FORCE ROW LEVEL SECURITY;
ALTER TABLE datasets FORCE ROW LEVEL SECURITY;
ALTER TABLE dataset_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence_records FORCE ROW LEVEL SECURITY;
ALTER TABLE provenance_records FORCE ROW LEVEL SECURITY;
ALTER TABLE record_provenance_linkages FORCE ROW LEVEL SECURITY;

-- 10.1 Column-Level Privilege Classification:
-- Untrusted roles (anon, authenticated, PUBLIC) receive SELECT on public transparency columns ONLY.
-- Internal administrative columns (operator, verified_by, verification_notes, storage_path, metadata)
-- are strictly restricted to service_role and administrative roles.

REVOKE ALL ON data_sources FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, name, publisher, authority_level, canonical_url, license, retrieval_method, refresh_frequency, is_active, created_at, updated_at) ON data_sources TO anon, authenticated;
GRANT ALL ON data_sources TO service_role;

REVOKE ALL ON datasets FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, name, domain, description, source_id, license, created_at, updated_at) ON datasets TO anon, authenticated;
GRANT ALL ON datasets TO service_role;

REVOKE ALL ON dataset_versions FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, dataset_id, version_tag, effective_from, effective_to, retrieved_at, record_count, checksum_sha256, default_status, verification_evidence_id, created_at) ON dataset_versions TO anon, authenticated;
GRANT ALL ON dataset_versions TO service_role;

REVOKE ALL ON evidence_records FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, dataset_version_id, artifact_name, artifact_sha256, verification_authority, verified_at, created_at) ON evidence_records TO anon, authenticated;
GRANT ALL ON evidence_records TO service_role;

REVOKE ALL ON provenance_records FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, dataset_version_id, source_record_id, parent_provenance_id, status, transformation_type, transform_version, verification_evidence_id, created_at) ON provenance_records TO anon, authenticated;
GRANT ALL ON provenance_records TO service_role;

REVOKE ALL ON record_provenance_linkages FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, domain_table, domain_record_id, provenance_id, is_canonical, created_at) ON record_provenance_linkages TO anon, authenticated;
GRANT ALL ON record_provenance_linkages TO service_role;

-- 10.2 Row Level Security Policies:
-- Public read policies for transparency
DROP POLICY IF EXISTS "Public read data_sources" ON data_sources;
CREATE POLICY "Public read data_sources" ON data_sources FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Public read datasets" ON datasets;
CREATE POLICY "Public read datasets" ON datasets FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read dataset_versions" ON dataset_versions;
CREATE POLICY "Public read dataset_versions" ON dataset_versions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read evidence_records" ON evidence_records;
CREATE POLICY "Public read evidence_records" ON evidence_records FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read provenance_records" ON provenance_records;
CREATE POLICY "Public read provenance_records" ON provenance_records FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read record_provenance_linkages" ON record_provenance_linkages;
CREATE POLICY "Public read record_provenance_linkages" ON record_provenance_linkages FOR SELECT TO anon, authenticated USING (true);

-- Service role full access policies
DROP POLICY IF EXISTS "Service role full access on data_sources" ON data_sources;
CREATE POLICY "Service role full access on data_sources" ON data_sources FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on datasets" ON datasets;
CREATE POLICY "Service role full access on datasets" ON datasets FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on dataset_versions" ON dataset_versions;
CREATE POLICY "Service role full access on dataset_versions" ON dataset_versions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on evidence_records" ON evidence_records;
CREATE POLICY "Service role full access on evidence_records" ON evidence_records FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on provenance_records" ON provenance_records;
CREATE POLICY "Service role full access on provenance_records" ON provenance_records FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on record_provenance_linkages" ON record_provenance_linkages;
CREATE POLICY "Service role full access on record_provenance_linkages" ON record_provenance_linkages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 11. CONTROLLED SOURCE SEEDS ───────────────────────────────────────────────

INSERT INTO data_sources (id, name, publisher, authority_level, canonical_url, license, retrieval_method, refresh_frequency, is_active)
VALUES
  (
    'eci',
    'Election Commission of India',
    'Election Commission of India',
    'constitutional',
    'https://results.eci.gov.in',
    'Government Open Data',
    'automated_polling',
    'event_driven',
    true
  ),
  (
    'prs_india',
    'PRS Legislative Research',
    'PRS Legislative Research',
    'academic',
    'https://prsindia.org',
    'Research / Public Reference',
    'curated_scraper',
    'monthly',
    true
  ),
  (
    'myneta',
    'National Election Watch / ADR MyNeta',
    'Association for Democratic Reforms',
    'media_ngo',
    'https://www.myneta.info',
    'Public Domain / Fair Use Reporting',
    'html_scraper',
    'election_cycle',
    true
  ),
  (
    'datta07_shapefiles',
    'Indian Shapefiles Repository (datta07)',
    'Open Source GIS Community / datta07',
    'crowdsourced',
    'https://github.com/datta07/INDIAN-SHAPEFILES',
    'MIT',
    'git_lfs_clone',
    'manual_update',
    true
  ),
  (
    'synthetic_projection_model',
    'PANIN Electoral Simulation & Projection Engine',
    'PANIN Research & Modeling',
    'synthetic_model',
    'internal://models/delimitation_projection',
    'Proprietary Research Test Harness',
    'compute_pipeline',
    'on_demand',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  publisher = EXCLUDED.publisher,
  authority_level = EXCLUDED.authority_level,
  canonical_url = EXCLUDED.canonical_url,
  license = EXCLUDED.license,
  retrieval_method = EXCLUDED.retrieval_method,
  refresh_frequency = EXCLUDED.refresh_frequency,
  updated_at = now();

-- ─── 12. BOUNDED REPRESENTATIVE ACCEPTANCE DATASETS ────────────────────────────

-- 1. Geography: Assembly Boundaries
INSERT INTO datasets (id, name, domain, description, source_id, license)
VALUES (
  'geo_assembly_boundaries',
  'Telangana Assembly Constituencies GeoJSON',
  'geography',
  'Pre-delimitation 2008 assembly constituency boundaries sourced from community shapefiles.',
  'datta07_shapefiles',
  'MIT'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dataset_versions (id, dataset_id, version_tag, effective_from, effective_to, record_count, default_status, metadata)
VALUES (
  'geo_assembly_boundaries_v2008',
  'geo_assembly_boundaries',
  '2008_delimitation',
  '2008-01-01',
  NULL,
  119,
  'UNVERIFIED',
  '{"note": "Pre-delimitation 2008 boundary snapshot; source authority crowdsourced; data status unverified."}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO provenance_records (id, dataset_version_id, source_record_id, status, transformation_type, transform_version, operator)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'geo_assembly_boundaries_v2008',
  'STATES/TELANGANA/TELANGANA_ASSEMBLY.geojson',
  'UNVERIFIED',
  'raw_shapefile_import',
  'v1.0.0',
  'system_import'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Political: Telangana 2023 MLA Profiles
INSERT INTO datasets (id, name, domain, description, source_id, license)
VALUES (
  'telangana_2023_mla_profiles',
  'Telangana 2023 Assembly Legislator Profiles',
  'political_profiles',
  'Elected MLA demographic, financial, and criminal affidavit profiles.',
  'myneta',
  'Public Domain / Fair Use Reporting'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dataset_versions (id, dataset_id, version_tag, effective_from, effective_to, record_count, default_status, metadata)
VALUES (
  'telangana_2023_mla_v1',
  'telangana_2023_mla_profiles',
  '2023_assembly',
  '2023-12-03',
  NULL,
  119,
  'UNVERIFIED',
  '{"election_year": 2023, "state": "Telangana"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO provenance_records (id, dataset_version_id, source_record_id, status, transformation_type, transform_version, operator)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'telangana_2023_mla_v1',
  'Telangana2023.json',
  'UNVERIFIED',
  'web_scrape_profile_build',
  'v1.2.0',
  'system_import'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Civic: Bills & Schemes
INSERT INTO datasets (id, name, domain, description, source_id, license)
VALUES (
  'civic_bills_schemes',
  'Civic Bills and Welfare Schemes Catalog',
  'civic_governance',
  'Government schemes and legislative bills catalog for civic monitoring.',
  'prs_india',
  'Research / Public Reference'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dataset_versions (id, dataset_id, version_tag, effective_from, effective_to, record_count, default_status, metadata)
VALUES (
  'civic_schemes_v1',
  'civic_bills_schemes',
  'v1.0',
  NULL,
  NULL,
  10,
  'UNKNOWN',
  '{"status": "baseline_catalog", "evidence": "NOT_ESTABLISHED"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO provenance_records (id, dataset_version_id, source_record_id, status, transformation_type, transform_version, operator)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'civic_schemes_v1',
  'migration_018_seed',
  'UNKNOWN',
  'mock_seed_insert',
  'v1.0.0',
  'system_import'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Projection / Simulation: Tamil Nadu 2026 Simulation
INSERT INTO datasets (id, name, domain, description, source_id, license)
VALUES (
  'tamil_nadu_2026_projection',
  'Tamil Nadu 2026 Assembly Election Simulation & Projection',
  'election_projection',
  'Synthetic electoral projection fixture for future 2026 election boundary simulation.',
  'myneta',
  'Research Simulation'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dataset_versions (id, dataset_id, version_tag, effective_from, effective_to, record_count, default_status, metadata)
VALUES (
  'tn_2026_proj_v1',
  'tamil_nadu_2026_projection',
  '2026_simulation_v1',
  NULL,
  NULL,
  208,
  'SCENARIO',
  '{"projection_model": "synthetic_simulation", "target_year": 2026, "invariant_test_fixture": true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO provenance_records (id, dataset_version_id, source_record_id, status, transformation_type, transform_version, operator)
VALUES (
  'a0000000-0000-0000-0000-000000000004',
  'tn_2026_proj_v1',
  'TamilNadu2026.json',
  'SCENARIO',
  'synthetic_projection_simulation',
  'v1.0.0-sim',
  'simulation_engine'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
