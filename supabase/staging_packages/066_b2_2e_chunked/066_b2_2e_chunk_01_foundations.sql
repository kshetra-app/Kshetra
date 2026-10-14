-- ==============================================================================
-- W021.5-B2.2-E Chunk 01: Foundations & Lineage (E0, E2) - HARDENED REMEDIATION
-- Purpose: Ingest batch provenance anchor and canonical Assam delimitation lineage
-- Expected Rows: 127 (E0: 1 provenance anchor, E2: 126 Assam 2008->2023 transitions)
-- Dependency: Migration 066 DDL (Datasets & Versions) & Migration 060 Schema
-- Incident Remediation: INC-W021.5-066-CHUNK01-42703 (Option 2 Implementation)
-- Invariants:
--   - 100% relational resolution against public.constituency_versions(id)
--   - Turnout table decoupled and deferred
--   - DO UPDATE = 0, DELETE = 0, DROP = 0, TRUNCATE = 0, ALTER = 0
--   - Fail-closed PL/pgSQL validation block with automatic rollback on discrepancy
-- ==============================================================================

BEGIN;

-- ─── E0: BATCH PROVENANCE RECORD ─────────────────────────────────────────────
INSERT INTO public.provenance_records (
  id, dataset_version_id, status, transformation_type, operator, metadata, created_at
)
VALUES (
  '0215b22e-0000-0000-0000-000000000001'::uuid,
  'myneta_candidate_disclosures_2024_v1',
  'OFFICIAL',
  'canonical_ingest',
  'system:w021.5_b2.2e_pipeline',
  '{"source": "ADR MyNeta Form 26 / ECI Delimitation / ECI Statistical Reports", "milestone": "W021.5-B2.2-E", "record_count": 8802}'::jsonb,
  now()
)
ON CONFLICT (id) DO NOTHING;


-- ─── E2: PRE-INSERTION FAIL-CLOSED ASSERTION BLOCK ───────────────────────────
DO $$
DECLARE
  v_source_count INTEGER;
  v_target_count INTEGER;
  v_pair_count INTEGER;
  v_missing_source INTEGER;
  v_missing_target INTEGER;
  v_self_links INTEGER;
  v_duplicate_pairs INTEGER;
BEGIN
  -- 1. Assert exactly 126 Assam source versions exist for 2008
  SELECT count(*) INTO v_source_count
  FROM public.constituency_versions
  WHERE canonical_code LIKE 'AS-%' AND delimitation_regime_id = 'eci_delimitation_2008';

  IF v_source_count <> 126 THEN
    RAISE EXCEPTION 'FAIL-CLOSED: Expected 126 Assam 2008 source versions, found %', v_source_count;
  END IF;

  -- 2. Assert exactly 126 Assam target versions exist for 2023
  SELECT count(*) INTO v_target_count
  FROM public.constituency_versions
  WHERE canonical_code LIKE 'AS-%' AND delimitation_regime_id = 'eci_delimitation_2023_as';

  IF v_target_count <> 126 THEN
    RAISE EXCEPTION 'FAIL-CLOSED: Expected 126 Assam 2023 target versions, found %', v_target_count;
  END IF;

  -- 3. Assert exactly 126 1-to-1 pairs resolve without nulls or self-links
  SELECT 
    count(*),
    COUNT(*) FILTER (WHERE v_src.id IS NULL),
    COUNT(*) FILTER (WHERE v_tgt.id IS NULL),
    COUNT(*) FILTER (WHERE v_src.id = v_tgt.id)
  INTO v_pair_count, v_missing_source, v_missing_target, v_self_links
  FROM public.constituencies c
  LEFT JOIN public.constituency_versions v_src 
    ON v_src.constituency_internal_id = c.internal_id 
    AND v_src.version_code = c.canonical_code || '-2008'
  LEFT JOIN public.constituency_versions v_tgt 
    ON v_tgt.constituency_internal_id = c.internal_id 
    AND v_tgt.version_code = c.canonical_code || '-2023'
  WHERE c.state_code = 'AS';

  IF v_pair_count <> 126 OR v_missing_source > 0 OR v_missing_target > 0 OR v_self_links > 0 THEN
    RAISE EXCEPTION 'FAIL-CLOSED: Pair resolution failed: pairs=%, missing_src=%, missing_tgt=%, self_links=%',
      v_pair_count, v_missing_source, v_missing_target, v_self_links;
  END IF;

  -- 4. Check for duplicate pairs
  SELECT count(*) - count(DISTINCT (v_src.id, v_tgt.id)) INTO v_duplicate_pairs
  FROM public.constituencies c
  JOIN public.constituency_versions v_src 
    ON v_src.constituency_internal_id = c.internal_id 
    AND v_src.version_code = c.canonical_code || '-2008'
  JOIN public.constituency_versions v_tgt 
    ON v_tgt.constituency_internal_id = c.internal_id 
    AND v_tgt.version_code = c.canonical_code || '-2023'
  WHERE c.state_code = 'AS';

  IF v_duplicate_pairs > 0 THEN
    RAISE EXCEPTION 'FAIL-CLOSED: Duplicate version pairs detected: %', v_duplicate_pairs;
  END IF;

  RAISE NOTICE 'Validation passed: 126 Assam 2008->2023 version pairs verified.';
END $$;


-- ─── E2: CANONICAL ASSAM 2023 DELIMITATION LINEAGE (126 ROWS) ─────────────────
INSERT INTO public.constituency_lineage (
  source_constituency_version_id,
  target_constituency_version_id,
  relationship_type,
  effective_date,
  source_dataset_version_id,
  evidence_record_id,
  data_status,
  notes
)
SELECT
  v_src.id AS source_constituency_version_id,
  v_tgt.id AS target_constituency_version_id,
  'CONTINUES_AS' AS relationship_type,
  '2023-08-16'::date AS effective_date,
  'eci_constituency_lineage_regimes_2024_v1' AS source_dataset_version_id,
  'a55a0023-0000-4000-8000-000000000001'::uuid AS evidence_record_id,
  'VERIFIED' AS data_status,
  'Assam 2023 Delimitation transition for ' || c.canonical_code || ' (' || c.name || ')' AS notes
FROM public.constituencies c
JOIN public.constituency_versions v_src
  ON v_src.constituency_internal_id = c.internal_id
  AND v_src.version_code = c.canonical_code || '-2008'
JOIN public.constituency_versions v_tgt
  ON v_tgt.constituency_internal_id = c.internal_id
  AND v_tgt.version_code = c.canonical_code || '-2023'
WHERE c.state_code = 'AS'
ORDER BY c.ac_no
ON CONFLICT (source_constituency_version_id, target_constituency_version_id, relationship_type, effective_date)
DO NOTHING;


-- ─── E2: POST-INSERTION FAIL-CLOSED VERIFICATION BLOCK ────────────────────────
DO $$
DECLARE
  v_inserted_count INTEGER;
BEGIN
  SELECT count(*) INTO v_inserted_count
  FROM public.constituency_lineage l
  JOIN public.constituency_versions v_src ON v_src.id = l.source_constituency_version_id
  WHERE v_src.canonical_code LIKE 'AS-%'
    AND l.effective_date = '2023-08-16'::date
    AND l.source_dataset_version_id = 'eci_constituency_lineage_regimes_2024_v1';

  IF v_inserted_count <> 126 THEN
    RAISE EXCEPTION 'FAIL-CLOSED: Expected 126 Assam lineage records in public.constituency_lineage, found %', v_inserted_count;
  END IF;

  RAISE NOTICE 'Post-insertion check passed: exactly 126 Assam lineage records verified.';
END $$;

COMMIT;
