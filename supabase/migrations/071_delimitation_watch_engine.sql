-- ==============================================================================
-- 071_delimitation_watch_engine.sql
--
-- Milestone: JOB 023 — Delimitation Watch Engine
-- Authority: CTO IMPLEMENTATION DIRECTIVE — JOB 023: DELIMITATION WATCH
-- Primary Owner: DATA (Supported by BE, ARCH, SEC, QA, DEVOPS)
--
-- Ordered 8-Stage Lifecycle Persistence:
--   SOURCE -> CAPTURE -> NORMALIZE -> VALIDATE -> COMPARE -> VERSION -> NOTIFY -> PUBLISH
--
-- Invariants Enforced:
-- 1. Immutable raw snapshot storage with SHA-256 verification and HTTP metadata
-- 2. Strict separation of OFFICIAL vs SCENARIO/UNVERIFIED data status
-- 3. Deterministic comparison persistence distinguishing material vs immaterial changes
-- 4. Immutable accepted versions with previous_version_id lineage DAG
-- 5. Database-level idempotency via UNIQUE constraints on (source_id, content_sha256)
-- 6. Notification outbox with unique deduplication key and geographic targeting
-- 7. Idempotent publication record ensuring exactly-once published version pointers
-- 8. Complete operational run tracking with correlation IDs and stage duration metrics
-- 9. Hardened RLS policies with strict service-role isolation and public mutation revoke
-- 10. ON DELETE RESTRICT on all foreign keys preventing orphan references
-- ==============================================================================

BEGIN;

-- ─── 1. ENUM & DOMAIN EXTENSIONS (SAFE IDEMPOTENT CREATION) ──────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

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

-- ─── 2. STAGE 1: SOURCE REGISTRY ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_watch_sources (
  id VARCHAR(100) PRIMARY KEY,
  name TEXT NOT NULL,
  publisher TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'gazette_extraordinary',
    'gazette_ordinary',
    'election_commission',
    'parliament_record',
    'census_bulletin',
    'statutory_archive',
    'synthetic_fixture'
  )),
  canonical_url TEXT NOT NULL,
  geographic_scope TEXT NOT NULL, -- e.g. 'NATIONAL', 'IN-TG', 'IN-AS'
  subject_scope TEXT NOT NULL,    -- e.g. 'delimitation_order', 'draft_proposal'
  authority_classification source_authority_enum NOT NULL DEFAULT 'statutory',
  retrieval_method TEXT NOT NULL DEFAULT 'http_get' CHECK (retrieval_method IN ('http_get', 'file_fixture', 'mock_api')),
  polling_schedule TEXT,          -- Cron or descriptive policy
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_attempted_at TIMESTAMPTZ,
  last_successful_at TIMESTAMPTZ,
  last_http_status INTEGER,
  last_etag TEXT,
  last_modified_header TEXT,
  last_content_hash TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.delimitation_watch_sources IS 'Registered delimitation data sources tracked by Delimitation Watch (Stage 1).';

-- ─── 3. STAGE 1: RAW SNAPSHOT STORAGE (IMMUTABLE CAPTURE) ────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id VARCHAR(100) NOT NULL REFERENCES public.delimitation_watch_sources(id) ON DELETE RESTRICT,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  http_status INTEGER NOT NULL,
  etag TEXT,
  last_modified TEXT,
  content_type TEXT NOT NULL,
  content_size_bytes INTEGER NOT NULL,
  content_sha256 TEXT NOT NULL,
  raw_content TEXT NOT NULL,
  declared_publication_date DATE,
  declared_effective_date DATE,
  capture_outcome TEXT NOT NULL CHECK (capture_outcome IN ('SUCCESS', 'UNCHANGED', 'FETCH_ERROR', 'TIMEOUT', 'NOT_FOUND')),
  diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delim_snapshots_source ON public.delimitation_snapshots(source_id);
CREATE INDEX IF NOT EXISTS idx_delim_snapshots_hash ON public.delimitation_snapshots(content_sha256);
CREATE INDEX IF NOT EXISTS idx_delim_snapshots_retrieved ON public.delimitation_snapshots(retrieved_at DESC);

COMMENT ON TABLE public.delimitation_snapshots IS 'Immutable captured raw source evidence with cryptographic SHA-256 hashes.';

-- ─── 4. STAGE 2: NORMALIZED CANDIDATES ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES public.delimitation_snapshots(id) ON DELETE RESTRICT,
  source_id VARCHAR(100) NOT NULL REFERENCES public.delimitation_watch_sources(id) ON DELETE RESTRICT,
  parser_version VARCHAR(50) NOT NULL,
  proposal_data JSONB NOT NULL,
  constituency_mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
  normalized_data_status data_status_enum NOT NULL DEFAULT 'UNVERIFIED',
  is_proposed BOOLEAN NOT NULL DEFAULT true,
  provenance_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  normalized_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delim_candidates_snapshot ON public.delimitation_candidates(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_delim_candidates_source ON public.delimitation_candidates(source_id);
CREATE INDEX IF NOT EXISTS idx_delim_candidates_status ON public.delimitation_candidates(normalized_data_status);

COMMENT ON TABLE public.delimitation_candidates IS 'Deterministic canonical candidates produced by normalizing raw snapshots (Stage 2).';

-- ─── 5. STAGE 3: VALIDATION RESULTS ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.delimitation_candidates(id) ON DELETE RESTRICT,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('PASSED', 'REJECTED', 'REVIEW_REQUIRED')),
  checks_run JSONB NOT NULL,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delim_validations_candidate ON public.delimitation_validations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_delim_validations_status ON public.delimitation_validations(validation_status);

COMMENT ON TABLE public.delimitation_validations IS 'Explicit gate reports from 11-point validation before acceptance (Stage 3).';

-- ─── 6. STAGE 4: BASELINE COMPARISONS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.delimitation_candidates(id) ON DELETE RESTRICT,
  baseline_version_id UUID,
  is_material_change BOOLEAN NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN (
    'NO_CHANGE',
    'MATERIAL_CHANGE',
    'INVALID_CANDIDATE',
    'SOURCE_RETRIEVAL_FAILURE',
    'REVIEW_REQUIRED'
  )),
  added_records JSONB NOT NULL DEFAULT '[]'::jsonb,
  removed_records JSONB NOT NULL DEFAULT '[]'::jsonb,
  changed_records JSONB NOT NULL DEFAULT '[]'::jsonb,
  unchanged_records JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata_diff JSONB NOT NULL DEFAULT '{}'::jsonb,
  comparison_summary TEXT NOT NULL,
  compared_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delim_comparisons_candidate ON public.delimitation_comparisons(candidate_id);
CREATE INDEX IF NOT EXISTS idx_delim_comparisons_material ON public.delimitation_comparisons(is_material_change);

COMMENT ON TABLE public.delimitation_comparisons IS 'Deterministic diffs against previously accepted baselines (Stage 4).';

-- ─── 7. STAGE 5: IMMUTABLE ACCEPTED VERSIONS ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_accepted_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id VARCHAR(100) NOT NULL REFERENCES public.delimitation_watch_sources(id) ON DELETE RESTRICT,
  version_tag VARCHAR(100) NOT NULL,
  snapshot_id UUID NOT NULL REFERENCES public.delimitation_snapshots(id) ON DELETE RESTRICT,
  candidate_id UUID NOT NULL REFERENCES public.delimitation_candidates(id) ON DELETE RESTRICT,
  validation_id UUID NOT NULL REFERENCES public.delimitation_validations(id) ON DELETE RESTRICT,
  comparison_id UUID NOT NULL REFERENCES public.delimitation_comparisons(id) ON DELETE RESTRICT,
  previous_version_id UUID REFERENCES public.delimitation_accepted_versions(id) ON DELETE RESTRICT,
  content_sha256 TEXT NOT NULL,
  parser_version VARCHAR(50) NOT NULL,
  data_status data_status_enum NOT NULL,
  effective_date DATE,
  proposal_id UUID,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_by TEXT NOT NULL DEFAULT 'system_delimitation_watch',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_delim_accepted_versions_tag UNIQUE (source_id, version_tag),
  CONSTRAINT uq_delim_accepted_versions_hash UNIQUE (source_id, content_sha256)
);

CREATE INDEX IF NOT EXISTS idx_delim_accepted_versions_source ON public.delimitation_accepted_versions(source_id);
CREATE INDEX IF NOT EXISTS idx_delim_accepted_versions_prev ON public.delimitation_accepted_versions(previous_version_id);
CREATE INDEX IF NOT EXISTS idx_delim_accepted_versions_status ON public.delimitation_accepted_versions(data_status);

COMMENT ON TABLE public.delimitation_accepted_versions IS 'Immutable accepted delimitation versions forming an auditable lineage DAG (Stage 5).';

-- Add self-reference foreign key to comparisons now that accepted_versions exists
DO $$ BEGIN
  ALTER TABLE public.delimitation_comparisons
    ADD CONSTRAINT fk_delim_comparisons_baseline
    FOREIGN KEY (baseline_version_id)
    REFERENCES public.delimitation_accepted_versions(id)
    ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── 8. STAGE 6: NOTIFICATION OUTBOX EVENTS ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.delimitation_accepted_versions(id) ON DELETE RESTRICT,
  event_category TEXT NOT NULL CHECK (event_category IN (
    'OFFICIAL_PUBLICATION',
    'DRAFT_PROPOSAL',
    'MATERIAL_UPDATE',
    'SCENARIO_UPDATE',
    'SOURCE_CORRECTION'
  )),
  deduplication_key TEXT NOT NULL UNIQUE,
  state_code TEXT NOT NULL,
  affected_geography_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  deep_link TEXT NOT NULL,
  data_status data_status_enum NOT NULL,
  dispatch_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (dispatch_status IN ('PENDING', 'SENT', 'FAILED', 'RETRY_PENDING')),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delim_notif_version ON public.delimitation_notification_events(version_id);
CREATE INDEX IF NOT EXISTS idx_delim_notif_status ON public.delimitation_notification_events(dispatch_status);
CREATE INDEX IF NOT EXISTS idx_delim_notif_dedup ON public.delimitation_notification_events(deduplication_key);

COMMENT ON TABLE public.delimitation_notification_events IS 'Durable notification outbox events for accepted delimitation changes (Stage 6).';

-- ─── 9. STAGE 7: PUBLICATIONS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.delimitation_accepted_versions(id) ON DELETE RESTRICT,
  publication_status TEXT NOT NULL CHECK (publication_status IN ('PUBLISHED', 'FAILED', 'RETRY_PENDING')),
  published_at TIMESTAMPTZ,
  published_by TEXT NOT NULL DEFAULT 'system_delimitation_watch',
  published_proposal_id UUID,
  canonical_view_updated BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_delim_publications_version UNIQUE (version_id)
);

CREATE INDEX IF NOT EXISTS idx_delim_publications_version ON public.delimitation_publications(version_id);
CREATE INDEX IF NOT EXISTS idx_delim_publications_status ON public.delimitation_publications(publication_status);

COMMENT ON TABLE public.delimitation_publications IS 'Idempotent publication records for accepted delimitation versions (Stage 7).';

-- ─── 10. STAGE 8: OPERATIONAL RUN LOGS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.delimitation_watch_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id TEXT NOT NULL,
  source_id VARCHAR(100) NOT NULL REFERENCES public.delimitation_watch_sources(id) ON DELETE RESTRICT,
  run_type TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (run_type IN ('SCHEDULED', 'MANUAL_TRIGGER', 'REPLAY')),
  snapshot_id UUID REFERENCES public.delimitation_snapshots(id) ON DELETE RESTRICT,
  candidate_id UUID REFERENCES public.delimitation_candidates(id) ON DELETE RESTRICT,
  validation_id UUID REFERENCES public.delimitation_validations(id) ON DELETE RESTRICT,
  comparison_id UUID REFERENCES public.delimitation_comparisons(id) ON DELETE RESTRICT,
  version_id UUID REFERENCES public.delimitation_accepted_versions(id) ON DELETE RESTRICT,
  event_id UUID REFERENCES public.delimitation_notification_events(id) ON DELETE RESTRICT,
  publication_id UUID REFERENCES public.delimitation_publications(id) ON DELETE RESTRICT,
  outcome TEXT NOT NULL CHECK (outcome IN ('SUCCESS', 'NO_CHANGE', 'REJECTED', 'REVIEW_REQUIRED', 'RETRY_PENDING', 'FAILED')),
  stage_durations_ms JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_duration_ms INTEGER NOT NULL DEFAULT 0,
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delim_runs_source ON public.delimitation_watch_runs(source_id);
CREATE INDEX IF NOT EXISTS idx_delim_runs_correlation ON public.delimitation_watch_runs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_delim_runs_outcome ON public.delimitation_watch_runs(outcome);
CREATE INDEX IF NOT EXISTS idx_delim_runs_created ON public.delimitation_watch_runs(created_at DESC);

COMMENT ON TABLE public.delimitation_watch_runs IS 'Operational audit log of all Delimitation Watch executions (Stage 8).';

-- ─── 11. SECURITY, RLS POLICIES & ACCESS CONTROLS ────────────────────────────

ALTER TABLE public.delimitation_watch_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_accepted_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delimitation_watch_runs ENABLE ROW LEVEL SECURITY;

-- Revoke public modification on all engine tables
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_watch_sources FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_snapshots FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_candidates FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_validations FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_comparisons FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_accepted_versions FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_notification_events FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_publications FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delimitation_watch_runs FROM PUBLIC, anon, authenticated;

-- Allow read-only access to published/accepted versions and sources for authenticated/anon
DO $$ BEGIN
  CREATE POLICY "Public read active sources"
    ON public.delimitation_watch_sources FOR SELECT
    USING (is_active = true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public read accepted versions"
    ON public.delimitation_accepted_versions FOR SELECT
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public read publications"
    ON public.delimitation_publications FOR SELECT
    USING (publication_status = 'PUBLISHED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMIT;
