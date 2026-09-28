-- ==============================================================================
-- Migration 048: Entity Geometries Schema & Staging Preflight (W016-C3-R5-R3)
-- Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- Production: STRICTLY AIR-GAPPED & UNTOUCHED
-- Authority: CTO Directive W016-C3-R5-R3
-- Operating Rule: Zero real geometries inserted. Schema creation & preflight only.
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
  snapshot_date DATE NOT NULL DEFAULT '2016-10-11',
  valid_from DATE NOT NULL DEFAULT '2016-10-11',
  valid_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Spatial integrity check constraints
  CONSTRAINT chk_entity_geometries_not_empty CHECK (NOT ST_IsEmpty(geometry)),
  CONSTRAINT chk_entity_geometries_is_valid CHECK (ST_IsValid(geometry)),
  CONSTRAINT chk_entity_geometries_srid CHECK (ST_SRID(geometry) = 4326),
  CONSTRAINT chk_entity_geometries_geometry_type CHECK (GeometryType(geometry) = 'MULTIPOLYGON'),
  CONSTRAINT chk_entity_geometries_type_match CHECK (geometry_type = 'MultiPolygon'),
  CONSTRAINT chk_entity_geometries_sha256 CHECK (raw_artifact_sha256 = 'aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db')
);

-- ─── 3. HARDENED UNIQUENESS CONSTRAINT ─────────────────────────────────────────
-- Exactly ONE geometry row per mandal_version_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_entity_geometries_mandal_version
  ON public.entity_geometries (mandal_version_id);

-- ─── 4. SPATIAL & REFERENTIAL INDEXES ──────────────────────────────────────────
-- Spatial GiST index for bounding box and intersection queries
CREATE INDEX IF NOT EXISTS idx_entity_geometries_spatial
  ON public.entity_geometries USING GIST (geometry);

-- Referential foreign key and filter indexes
CREATE INDEX IF NOT EXISTS idx_entity_geometries_dataset_version
  ON public.entity_geometries (dataset_version_id);

CREATE INDEX IF NOT EXISTS idx_entity_geometries_provenance
  ON public.entity_geometries (provenance_id);

CREATE INDEX IF NOT EXISTS idx_entity_geometries_source_feature
  ON public.entity_geometries (source_feature_id);

CREATE INDEX IF NOT EXISTS idx_entity_geometries_status
  ON public.entity_geometries (status);

-- ─── 5. IMMUTABILITY TRIGGER & WRITE-PATH PROTECTION ───────────────────────────
CREATE OR REPLACE FUNCTION public.fn_prevent_entity_geometry_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.mandal_version_id IS DISTINCT FROM NEW.mandal_version_id THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: mandal_version_id cannot be reassigned (OLD: %, NEW: %)',
        OLD.mandal_version_id, NEW.mandal_version_id
        USING ERRCODE = '23514';
    END IF;

    IF OLD.dataset_version_id IS DISTINCT FROM NEW.dataset_version_id THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: dataset_version_id cannot be mutated (OLD: %, NEW: %)',
        OLD.dataset_version_id, NEW.dataset_version_id
        USING ERRCODE = '23514';
    END IF;

    IF OLD.provenance_id IS DISTINCT FROM NEW.provenance_id THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: provenance_id cannot be mutated (OLD: %, NEW: %)',
        OLD.provenance_id, NEW.provenance_id
        USING ERRCODE = '23514';
    END IF;

    IF OLD.source_feature_id IS DISTINCT FROM NEW.source_feature_id THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: source_feature_id cannot be mutated (OLD: %, NEW: %)',
        OLD.source_feature_id, NEW.source_feature_id
        USING ERRCODE = '23514';
    END IF;

    IF OLD.raw_artifact_sha256 IS DISTINCT FROM NEW.raw_artifact_sha256 THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: raw_artifact_sha256 cannot be mutated (OLD: %, NEW: %)',
        OLD.raw_artifact_sha256, NEW.raw_artifact_sha256
        USING ERRCODE = '23514';
    END IF;

    IF OLD.snapshot_date IS DISTINCT FROM NEW.snapshot_date THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: snapshot_date cannot be mutated (OLD: %, NEW: %)',
        OLD.snapshot_date, NEW.snapshot_date
        USING ERRCODE = '23514';
    END IF;

    IF NOT ST_Equals(OLD.geometry, NEW.geometry) THEN
      RAISE EXCEPTION 'IMMUTABILITY VIOLATION: authoritative geometry coordinates cannot be mutated'
        USING ERRCODE = '23514';
    END IF;

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

-- ─── 6. ROW LEVEL SECURITY & PRIVILEGE ASSIGNMENTS ─────────────────────────────
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
