-- ==============================================================================
-- Migration 048: Entity Geometries Schema (W016-C3-R5-R3-R2 Generic Schema)
-- Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- Production: STRICTLY AIR-GAPPED & UNTOUCHED
-- Authority: CTO Directive W016-C3-R5-R3-R2
-- Operating Rule: Zero real geometries inserted. Schema creation & preflight only.
-- Generic Design: Reusable across current and future spatial datasets.
--                 NO hardcoded dataset IDs, evidence UUIDs, artifact SHAs, or snapshot dates.
-- ==============================================================================

BEGIN;

-- ─── 1. EXTENSIONS ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── 2. CANONICAL ENTITY_GEOMETRIES TABLE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.entity_geometries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'mandal',
  mandal_version_id UUID NOT NULL REFERENCES public.mandal_versions(id) ON DELETE RESTRICT,
  dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  provenance_id UUID NOT NULL REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  geometry GEOMETRY(MultiPolygon, 4326) NOT NULL,
  geometry_type TEXT NOT NULL DEFAULT 'MultiPolygon',
  status public.data_status_enum NOT NULL DEFAULT 'OFFICIAL',
  authority_classification TEXT NOT NULL DEFAULT 'statutory_cartographic',
  temporal_classification TEXT NOT NULL DEFAULT 'historical_statutory_baseline',
  source_feature_id TEXT NOT NULL,
  raw_artifact_sha256 TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Structural, spatial, and temporal constraints
  CONSTRAINT chk_entity_geometries_entity_type CHECK (entity_type = 'mandal'),
  CONSTRAINT chk_entity_geometries_not_empty CHECK (NOT ST_IsEmpty(geometry)),
  CONSTRAINT chk_entity_geometries_is_valid CHECK (ST_IsValid(geometry)),
  CONSTRAINT chk_entity_geometries_srid CHECK (ST_SRID(geometry) = 4326),
  CONSTRAINT chk_entity_geometries_geometry_type CHECK (GeometryType(geometry) = 'MULTIPOLYGON'),
  CONSTRAINT chk_entity_geometries_type_match CHECK (geometry_type = 'MultiPolygon'),
  CONSTRAINT chk_entity_geometries_temporal_bounds CHECK (valid_to IS NULL OR valid_to >= valid_from),
  CONSTRAINT chk_entity_geometries_historical_currentness CHECK (
    temporal_classification != 'historical_statutory_baseline' OR is_current = false
  )
);

-- ─── 3. HARDENED UNIQUENESS CONSTRAINT ─────────────────────────────────────────
-- Exactly ONE geometry row per mandal_version_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_entity_geometries_mandal_version
  ON public.entity_geometries (mandal_version_id);

-- ─── 4. JUSTIFIED INDEXES ──────────────────────────────────────────────────────
-- Spatial GiST index for bounding box and intersection queries
CREATE INDEX IF NOT EXISTS idx_entity_geometries_spatial
  ON public.entity_geometries USING GIST (geometry);

-- Referential foreign key join indexes
CREATE INDEX IF NOT EXISTS idx_entity_geometries_dataset_version
  ON public.entity_geometries (dataset_version_id);

CREATE INDEX IF NOT EXISTS idx_entity_geometries_provenance
  ON public.entity_geometries (provenance_id);

-- ─── 5. GENERIC PROVENANCE/DATASET INTEGRITY & VALIDATION TRIGGER ──────────────
-- Generic invariant: verifies dataset_version_id parity and W012 evidence presence.
-- Strictly NO hardcoded dataset_version, evidence UUID, artifact SHA, or date.
CREATE OR REPLACE FUNCTION public.fn_validate_entity_geometry_lineage()
RETURNS TRIGGER AS $$
DECLARE
  v_prov RECORD;
BEGIN
  -- 1. Fetch referenced provenance record
  SELECT dataset_version_id, verification_evidence_id, status
  INTO v_prov
  FROM public.provenance_records
  WHERE id = NEW.provenance_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROVENANCE NOT FOUND: referenced provenance_record % does not exist', NEW.provenance_id
      USING ERRCODE = '23503';
  END IF;

  -- 2. Generic Dataset Parity Invariant: entity_geometries.dataset_version_id must match provenance_records.dataset_version_id
  IF v_prov.dataset_version_id IS DISTINCT FROM NEW.dataset_version_id THEN
    RAISE EXCEPTION 'PROVENANCE DATASET MISMATCH: entity_geometries.dataset_version_id (%) does not match provenance_records.dataset_version_id (%)',
      NEW.dataset_version_id, v_prov.dataset_version_id
      USING ERRCODE = '23514';
  END IF;

  -- 3. Generic W012 Provenance Invariant: provenance record must have an attached verification evidence ID
  IF v_prov.verification_evidence_id IS NULL THEN
    RAISE EXCEPTION 'PROVENANCE EVIDENCE MISSING: referenced provenance record % has NULL verification_evidence_id',
      NEW.provenance_id
      USING ERRCODE = '23514';
  END IF;

  -- 4. Generic Evidence Existence Invariant: referenced evidence record must exist in public.evidence_records
  PERFORM 1 FROM public.evidence_records WHERE id = v_prov.verification_evidence_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROVENANCE EVIDENCE NOT FOUND: evidence record % referenced by provenance % does not exist',
      v_prov.verification_evidence_id, NEW.provenance_id
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_entity_geometry_lineage ON public.entity_geometries;
CREATE TRIGGER trg_validate_entity_geometry_lineage
  BEFORE INSERT OR UPDATE ON public.entity_geometries
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_entity_geometry_lineage();

-- ─── 6. IMMUTABILITY & CONTROLLED LIFECYCLE MUTATION TRIGGER ───────────────────
-- Enforces strict immutability on 16 core identity/spatial/lineage/status columns.
-- Enforces explicit, controlled lifecycle transitions on valid_to, is_current.
CREATE OR REPLACE FUNCTION public.fn_prevent_entity_geometry_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- A. STRICT IMMUTABILITY: Identity, Spatial Coordinates & Source Provenance Columns
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: id cannot be mutated'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.entity_type IS DISTINCT FROM OLD.entity_type THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: entity_type cannot be mutated (OLD: %, NEW: %)',
        OLD.entity_type, NEW.entity_type
        USING ERRCODE = '23514';
    END IF;

    IF NEW.mandal_version_id IS DISTINCT FROM OLD.mandal_version_id THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: mandal_version_id cannot be reassigned (OLD: %, NEW: %)',
        OLD.mandal_version_id, NEW.mandal_version_id
        USING ERRCODE = '23514';
    END IF;

    IF NEW.dataset_version_id IS DISTINCT FROM OLD.dataset_version_id THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: dataset_version_id cannot be mutated (OLD: %, NEW: %)',
        OLD.dataset_version_id, NEW.dataset_version_id
        USING ERRCODE = '23514';
    END IF;

    IF NEW.provenance_id IS DISTINCT FROM OLD.provenance_id THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: provenance_id cannot be mutated (OLD: %, NEW: %)',
        OLD.provenance_id, NEW.provenance_id
        USING ERRCODE = '23514';
    END IF;

    IF NEW.source_feature_id IS DISTINCT FROM OLD.source_feature_id THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: source_feature_id cannot be mutated (OLD: %, NEW: %)',
        OLD.source_feature_id, NEW.source_feature_id
        USING ERRCODE = '23514';
    END IF;

    IF NEW.raw_artifact_sha256 IS DISTINCT FROM OLD.raw_artifact_sha256 THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: raw_artifact_sha256 cannot be mutated (OLD: %, NEW: %)',
        OLD.raw_artifact_sha256, NEW.raw_artifact_sha256
        USING ERRCODE = '23514';
    END IF;

    IF NEW.snapshot_date IS DISTINCT FROM OLD.snapshot_date THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: snapshot_date cannot be mutated (OLD: %, NEW: %)',
        OLD.snapshot_date, NEW.snapshot_date
        USING ERRCODE = '23514';
    END IF;

    IF NEW.geometry_type IS DISTINCT FROM OLD.geometry_type THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: geometry_type cannot be mutated (OLD: %, NEW: %)',
        OLD.geometry_type, NEW.geometry_type
        USING ERRCODE = '23514';
    END IF;

    -- Strict byte-exact coordinate immutability via IS DISTINCT FROM
    IF NEW.geometry IS DISTINCT FROM OLD.geometry THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: Authoritative geometry coordinates cannot be mutated'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.authority_classification IS DISTINCT FROM OLD.authority_classification THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: authority_classification cannot be mutated'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.temporal_classification IS DISTINCT FROM OLD.temporal_classification THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: temporal_classification cannot be mutated'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.valid_from IS DISTINCT FROM OLD.valid_from THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: valid_from cannot be mutated'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.metadata IS DISTINCT FROM OLD.metadata THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: metadata cannot be mutated'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: created_at cannot be mutated'
        USING ERRCODE = '23514';
    END IF;

    -- B. CONTROLLED LIFECYCLE MUTABILITY: valid_to
    -- If valid_to was already set (closed), it cannot be shifted.
    -- If valid_to was NULL, it may transition to a closed date >= valid_from.
    IF OLD.valid_to IS NOT NULL AND NEW.valid_to IS DISTINCT FROM OLD.valid_to THEN
      RAISE EXCEPTION 'LIFECYCLE VIOLATION: valid_to is already closed and cannot be altered'
        USING ERRCODE = '23514';
    END IF;

    -- C. CONTROLLED LIFECYCLE MUTABILITY: is_current
    -- Allowed transition: true -> false (retirement upon supersession).
    -- False -> true is prohibited for historical baseline records.
    IF OLD.is_current = false AND NEW.is_current = true THEN
      IF NEW.temporal_classification = 'historical_statutory_baseline' THEN
        RAISE EXCEPTION 'LIFECYCLE VIOLATION: historical statutory baseline geometry cannot be set to is_current = true'
          USING ERRCODE = '23514';
      END IF;
    END IF;

    -- W012 Data Status is strictly immutable: an OFFICIAL statutory record remains OFFICIAL
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: status cannot be mutated (OLD: %, NEW: %)',
        OLD.status, NEW.status
        USING ERRCODE = '23514';
    END IF;

    -- E. AUTOMATIC UPDATE: updated_at
    NEW.updated_at = now();
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_entity_geometry_mutation ON public.entity_geometries;
CREATE TRIGGER trg_prevent_entity_geometry_mutation
  BEFORE UPDATE ON public.entity_geometries
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_entity_geometry_mutation();

-- ─── 7. ROW LEVEL SECURITY & PRIVILEGE ASSIGNMENTS ─────────────────────────────
ALTER TABLE public.entity_geometries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.entity_geometries FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.entity_geometries FROM anon, authenticated;

GRANT SELECT ON TABLE public.entity_geometries TO anon, authenticated;
GRANT ALL ON TABLE public.entity_geometries TO service_role;

DROP POLICY IF EXISTS "Public read entity_geometries" ON public.entity_geometries;
CREATE POLICY "Public read entity_geometries"
  ON public.entity_geometries FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role full access entity_geometries" ON public.entity_geometries;
CREATE POLICY "Service role full access entity_geometries"
  ON public.entity_geometries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
