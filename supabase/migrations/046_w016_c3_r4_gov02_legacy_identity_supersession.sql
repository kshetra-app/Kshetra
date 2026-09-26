-- ============================================================================
-- Migration 046: Legacy Pilot Identity Lineage Supersession & Provenance Reconcile
-- Job: W016-C3-R4-GOV-05 (Executable Preflight / Non-Destructive Provenance Repair)
--
-- Objective:
-- 1. Preserve historical source claims in ts_lgd_mandals_2023_v1 by retaining
--    domain_record_id = LEGACY_ID in public.record_provenance_linkages with is_canonical = false.
-- 2. Create 12 append-only supersession nodes in public.provenance_records under
--    ts_lgd_mandals_2026_v1, with parent_provenance_id pointing to legacy provenance records.
-- 3. Establish canonical linkages connecting canonical mandal IDs to the supersession nodes
--    with is_canonical = true.
-- 4. Reconcile metadata for the Mancherial-Hajipur statutory split (G.O.Ms.No. 222)
--    in public.geography_entity_lineage and public.provenance_records.
-- 5. Guarantee zero mutation of public.mandals (maintaining strictly 621 statutory anchors)
--    and zero mutation of immutable dataset_versions snapshot fields.
--
-- Safety & Idempotency:
-- - Fully transactional (atomic commit or rollback).
-- - Fail-closed assertion guards before, during, and after mutation.
-- - Idempotent ON CONFLICT handlers.
-- ============================================================================

DO $$
DECLARE
  v_mandals_count INTEGER;
  v_versions_count INTEGER;
  v_rpl_demoted_count INTEGER;
  v_supersession_count INTEGER;
BEGIN
  -- ─── 1. PRECONDITION GUARDS ──────────────────────────────────────────────────
  
  -- Assert exactly 621 canonical mandal anchors exist
  SELECT COUNT(*) INTO v_mandals_count FROM public.mandals;
  IF v_mandals_count != 621 THEN
    RAISE EXCEPTION 'PRECONDITION_FAILED: public.mandals count is %, expected 621', v_mandals_count;
  END IF;

  -- Assert dataset versions exist
  IF NOT EXISTS (SELECT 1 FROM public.dataset_versions WHERE id = 'ts_lgd_mandals_2026_v1') THEN
    RAISE EXCEPTION 'PRECONDITION_FAILED: dataset_version ts_lgd_mandals_2026_v1 missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.dataset_versions WHERE id = 'ts_lgd_mandals_2023_v1') THEN
    RAISE EXCEPTION 'PRECONDITION_FAILED: dataset_version ts_lgd_mandals_2023_v1 missing';
  END IF;

  -- Assert all 12 canonical target anchors exist in public.mandals
  IF (
    SELECT COUNT(DISTINCT id) FROM public.mandals WHERE id IN (
      'TS-MDL-4315', 'TS-MDL-4318', 'TS-MDL-4329', 'TS-MDL-4333', 'TS-MDL-4319',
      'TS-MDL-4353', 'TS-MDL-4354', 'TS-MDL-4348', 'TS-MDL-4356', 'TS-MDL-4350',
      'TS-MDL-4351', 'TS-MDL-6227'
    )
  ) != 12 THEN
    RAISE EXCEPTION 'PRECONDITION_FAILED: One or more canonical replacement mandals missing in public.mandals';
  END IF;

  -- ─── 2. DEMOTE 12 HISTORICAL PROVENANCE LINKAGES (is_canonical = false) ───────
  -- Preserves historical domain_record_id = LEGACY_ID while marking linkage non-canonical.
  UPDATE public.record_provenance_linkages
  SET is_canonical = false
  WHERE domain_table = 'mandals'
    AND domain_record_id IN (
      'TS-MDL-7101', 'TS-MDL-7102', 'TS-MDL-7103', 'TS-MDL-7104', 'TS-MDL-7105',
      'TS-MDL-5320', 'TS-MDL-5321', 'TS-MDL-5322', 'TS-MDL-5323', 'TS-MDL-5324',
      'TS-MDL-5328', 'TS-MDL-5329'
    )
    AND is_canonical = true;

  -- ─── 3. INSERT 12 APPEND-ONLY SUPERSESSION PROVENANCE NODES ──────────────────
  -- Deterministic UUIDs: md5('pr_supersede_mandal_' || legacy_id)::uuid
  -- Parent pointer chains back to historical provenance record.
  
  -- Temporary table mapping the 12 authoritative pairs
  CREATE TEMP TABLE temp_legacy_canonical_pairs (
    legacy_id TEXT PRIMARY KEY,
    legacy_name TEXT NOT NULL,
    legacy_pilot_lgd INTEGER NOT NULL,
    canonical_id TEXT NOT NULL,
    canonical_name TEXT NOT NULL,
    canonical_lgd INTEGER NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO temp_legacy_canonical_pairs VALUES
    ('TS-MDL-7101', 'Sirpur (T)',  7101, 'TS-MDL-4315', 'Sirpur (T)',  4315),
    ('TS-MDL-7102', 'Kagaznagar',  7102, 'TS-MDL-4318', 'Kagaznagar',  4318),
    ('TS-MDL-7103', 'Dahegaon',    7103, 'TS-MDL-4329', 'Dahegoan',    4329),
    ('TS-MDL-7104', 'Tiryani',     7104, 'TS-MDL-4333', 'Tiryani',     4333),
    ('TS-MDL-7105', 'Asifabad',    7105, 'TS-MDL-4319', 'Asifabad',    4319),
    ('TS-MDL-5320', 'Luxettipet',  5320, 'TS-MDL-4353', 'Luxettipet',  4353),
    ('TS-MDL-5321', 'Mancherial',  5321, 'TS-MDL-4354', 'Mancherial',  4354),
    ('TS-MDL-5322', 'Dandepally',  5322, 'TS-MDL-4348', 'Dandepally',  4348),
    ('TS-MDL-5323', 'Chennur',     5323, 'TS-MDL-4356', 'Chennur',     4356),
    ('TS-MDL-5324', 'Bellampalli', 5324, 'TS-MDL-4350', 'Bellampally', 4350),
    ('TS-MDL-5328', 'Kotapalli',   5328, 'TS-MDL-4351', 'Kotapally',   4351),
    ('TS-MDL-5329', 'Hajipur',     5329, 'TS-MDL-6227', 'Hajipur',     6227);

  INSERT INTO public.provenance_records (
    id,
    dataset_version_id,
    source_record_id,
    parent_provenance_id,
    status,
    transformation_type,
    transform_version,
    operator,
    metadata
  )
  SELECT
    md5('pr_supersede_mandal_' || p.legacy_id)::uuid,
    'ts_lgd_mandals_2026_v1',
    'LGD-MANDAL-' || p.canonical_lgd::text,
    rpl.provenance_id,
    'OFFICIAL',
    'pilot_to_statutory_supersession',
    '1.0',
    'system:w016_c3_r4_supersession',
    jsonb_build_object(
      'legacy_pilot_id', p.legacy_id,
      'legacy_pilot_name', p.legacy_name,
      'legacy_pilot_lgd_code', p.legacy_pilot_lgd,
      'canonical_mandal_id', p.canonical_id,
      'canonical_mandal_name', p.canonical_name,
      'canonical_lgd_code', p.canonical_lgd,
      'supersession_type', 'SYNTHETIC_PILOT_TO_STATUTORY_BASELINE',
      'supersession_reason', 'Supersession of pre-W016 synthetic pilot identity with authentic statutory MoPR LGD 2026 baseline',
      'statutory_reference', 'MoPR LGD 2026 Directory snapshot; G.O.Ms. Nos. 214-245 Rev (2016-10-11)',
      'reconciliation_timestamp', now()
    )
  FROM temp_legacy_canonical_pairs p
  JOIN public.record_provenance_linkages rpl
    ON rpl.domain_table = 'mandals'
   AND rpl.domain_record_id = p.legacy_id
  ON CONFLICT (id) DO UPDATE SET
    metadata = EXCLUDED.metadata,
    source_record_id = EXCLUDED.source_record_id;

  -- ─── 4. ESTABLISH CANONICAL PROVENANCE LINKAGES (is_canonical = true) ────────
  -- Links the active canonical mandal to the supersession node
  INSERT INTO public.record_provenance_linkages (
    domain_table,
    domain_record_id,
    provenance_id,
    is_canonical
  )
  SELECT
    'mandals',
    p.canonical_id,
    md5('pr_supersede_mandal_' || p.legacy_id)::uuid,
    true
  FROM temp_legacy_canonical_pairs p
  ON CONFLICT (domain_table, domain_record_id, provenance_id) DO NOTHING;

  -- ─── 5. RECONCILE GEOGRAPHY ENTITY LINEAGE METADATA (MANCHERIAL-HAJIPUR SPLIT) 
  -- Preserves historical legal split G.O.Ms.No. 222 while linking to canonical mandal IDs
  UPDATE public.geography_entity_lineage
  SET
    predecessor_internal_id = md5('mandals:TS-MDL-4354')::uuid,
    successor_internal_id = md5('mandals:TS-MDL-6227')::uuid,
    metadata = metadata || jsonb_build_object(
      'predecessor_mandal_id', 'TS-MDL-4354',
      'predecessor_mandal_name', 'Mancherial',
      'successor_mandal_id', 'TS-MDL-6227',
      'successor_mandal_name', 'Hajipur',
      'canonical_lgd_code', 6227,
      'legacy_pilot_predecessor_id', 'TS-MDL-5321',
      'legacy_pilot_successor_id', 'TS-MDL-5329',
      'legacy_pilot_lgd_code', 5949,
      'reconciliation_audit', 'W016-C3-R4-GOV-05 canonical cross-reference'
    )
  WHERE id = '68e465c2-a00b-478d-8082-e0cf1f3bbe67'::uuid;

  -- ─── 6. RECONCILE PROVENANCE RECORD METADATA (SPLIT LINEAGE PROVENANCE) ───────
  UPDATE public.provenance_records
  SET metadata = metadata || jsonb_build_object(
    'predecessor', 'TS-MDL-4354',
    'successor', 'TS-MDL-6227',
    'legacy_pilot_predecessor', 'TS-MDL-5321',
    'legacy_pilot_successor', 'TS-MDL-5329',
    'reconciliation_audit', 'W016-C3-R4-GOV-05 canonical cross-reference'
  )
  WHERE id = '8c350901-a5d8-fe3d-c5b2-6ffe37601908'::uuid;

  -- ─── 7. POSTCONDITION INVARIANT GUARDS ────────────────────────────────────────

  -- Assert public.mandals count remains strictly 621
  SELECT COUNT(*) INTO v_mandals_count FROM public.mandals;
  IF v_mandals_count != 621 THEN
    RAISE EXCEPTION 'POSTCONDITION_FAILED: public.mandals count changed to %, expected 621', v_mandals_count;
  END IF;

  -- Assert total mandal_versions remains strictly 1210
  SELECT COUNT(*) INTO v_versions_count FROM public.mandal_versions;
  IF v_versions_count != 1210 THEN
    RAISE EXCEPTION 'POSTCONDITION_FAILED: public.mandal_versions count is %, expected 1210', v_versions_count;
  END IF;

  -- Assert 0 legacy mandals have is_canonical = true in record_provenance_linkages
  SELECT COUNT(*) INTO v_rpl_demoted_count
  FROM public.record_provenance_linkages
  WHERE domain_table = 'mandals'
    AND domain_record_id IN (
      'TS-MDL-7101', 'TS-MDL-7102', 'TS-MDL-7103', 'TS-MDL-7104', 'TS-MDL-7105',
      'TS-MDL-5320', 'TS-MDL-5321', 'TS-MDL-5322', 'TS-MDL-5323', 'TS-MDL-5324',
      'TS-MDL-5328', 'TS-MDL-5329'
    )
    AND is_canonical = true;
  IF v_rpl_demoted_count != 0 THEN
    RAISE EXCEPTION 'POSTCONDITION_FAILED: % legacy mandal linkages remain marked as canonical', v_rpl_demoted_count;
  END IF;

  -- Assert exactly 12 legacy linkages exist with is_canonical = false
  SELECT COUNT(*) INTO v_rpl_demoted_count
  FROM public.record_provenance_linkages
  WHERE domain_table = 'mandals'
    AND domain_record_id IN (
      'TS-MDL-7101', 'TS-MDL-7102', 'TS-MDL-7103', 'TS-MDL-7104', 'TS-MDL-7105',
      'TS-MDL-5320', 'TS-MDL-5321', 'TS-MDL-5322', 'TS-MDL-5323', 'TS-MDL-5324',
      'TS-MDL-5328', 'TS-MDL-5329'
    )
    AND is_canonical = false;
  IF v_rpl_demoted_count != 12 THEN
    RAISE EXCEPTION 'POSTCONDITION_FAILED: Expected 12 non-canonical legacy linkages, found %', v_rpl_demoted_count;
  END IF;

  -- Assert exactly 12 supersession provenance records created
  SELECT COUNT(*) INTO v_supersession_count
  FROM public.provenance_records
  WHERE transformation_type = 'pilot_to_statutory_supersession';
  IF v_supersession_count != 12 THEN
    RAISE EXCEPTION 'POSTCONDITION_FAILED: Expected 12 supersession provenance records, found %', v_supersession_count;
  END IF;

  RAISE NOTICE 'SUCCESS: Migration 046 preflight checks and logic verified atomically.';
END $$;
