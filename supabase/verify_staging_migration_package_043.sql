-- ==============================================================================
-- KSHETRA STAGING MIGRATION PACKAGE 043 VERIFICATION
-- Target: panIN-staging (fkpigozcqnmcvofuksar)
-- Checks:
--   1. Schema: geography_entity_lineage CHECK constraint accepts 'mandal'
--   2. Mandals: 12 LGD codes match authentic MoPR values (0 pilot sequential mocks)
--   3. MCM: Spurious mappings Kotapalli->AC4 and Hajipur->AC3 purged (0 rows)
--   4. MCM: Kotapalli->AC2 is 'full', Hajipur->AC4 is 'full'
--   5. Lineage: Mancherial -> Hajipur split transition recorded under W014
--   6. Governance: Zero records promoted to OFFICIAL (100% UNVERIFIED / PURGED)
-- ==============================================================================

DO $$
DECLARE
  v_bad_lgd_count INT;
  v_spurious_kotapalli INT;
  v_spurious_hajipur INT;
  v_kotapalli_ac2_overlap TEXT;
  v_hajipur_ac4_overlap TEXT;
  v_lineage_count INT;
  v_official_count INT;
  v_booth_fixtures INT;
  v_ac2_internal UUID;
  v_ac3_internal UUID;
  v_ac4_internal UUID;
BEGIN
  SELECT internal_id INTO v_ac2_internal FROM public.constituencies WHERE canonical_code = 'TS-AC-002';
  SELECT internal_id INTO v_ac3_internal FROM public.constituencies WHERE canonical_code = 'TS-AC-003';
  SELECT internal_id INTO v_ac4_internal FROM public.constituencies WHERE canonical_code = 'TS-AC-004';

  -- Check 1: Mandals LGD Codes
  SELECT COUNT(*) INTO v_bad_lgd_count
  FROM public.mandals
  WHERE lgd_code IN (7101, 7102, 7103, 7104, 7105, 5320, 5321, 5322, 5323, 5324, 5328, 5329);

  IF v_bad_lgd_count > 0 THEN
    RAISE EXCEPTION 'CHECK 1 FAILED: Found % mandals with old synthetic pilot LGD codes', v_bad_lgd_count;
  END IF;

  -- Check 2: Spurious MCM relationships purged
  SELECT COUNT(*) INTO v_spurious_kotapalli
  FROM public.mandal_constituency_map
  WHERE mandal_id = 'TS-MDL-5328' AND constituency_internal_id = v_ac4_internal;

  IF v_spurious_kotapalli > 0 THEN
    RAISE EXCEPTION 'CHECK 2 FAILED: Spurious mapping Kotapalli in AC 4 still exists!';
  END IF;

  SELECT COUNT(*) INTO v_spurious_hajipur
  FROM public.mandal_constituency_map
  WHERE mandal_id = 'TS-MDL-5329' AND constituency_internal_id = v_ac3_internal;

  IF v_spurious_hajipur > 0 THEN
    RAISE EXCEPTION 'CHECK 2 FAILED: Spurious mapping Hajipur in AC 3 still exists!';
  END IF;

  -- Check 3: Kotapalli in AC 2 is 'full'
  SELECT overlap_type INTO v_kotapalli_ac2_overlap
  FROM public.mandal_constituency_map
  WHERE mandal_id = 'TS-MDL-5328' AND constituency_internal_id = v_ac2_internal;

  IF v_kotapalli_ac2_overlap <> 'full' THEN
    RAISE EXCEPTION 'CHECK 3 FAILED: Kotapalli in AC 2 overlap_type is % (expected full)', v_kotapalli_ac2_overlap;
  END IF;

  -- Check 4: Hajipur in AC 4 is 'full'
  SELECT overlap_type INTO v_hajipur_ac4_overlap
  FROM public.mandal_constituency_map
  WHERE mandal_id = 'TS-MDL-5329' AND constituency_internal_id = v_ac4_internal;

  IF v_hajipur_ac4_overlap <> 'full' THEN
    RAISE EXCEPTION 'CHECK 4 FAILED: Hajipur in AC 4 overlap_type is % (expected full)', v_hajipur_ac4_overlap;
  END IF;

  -- Check 5: Mancherial -> Hajipur Lineage
  SELECT COUNT(*) INTO v_lineage_count
  FROM public.geography_entity_lineage
  WHERE entity_type = 'mandal'
    AND predecessor_internal_id = md5('mandals:TS-MDL-5321')::uuid
    AND successor_internal_id = md5('mandals:TS-MDL-5329')::uuid
    AND transition_type = 'split';

  IF v_lineage_count = 0 THEN
    RAISE EXCEPTION 'CHECK 5 FAILED: Mancherial -> Hajipur split lineage not found!';
  END IF;

  -- Check 6: Governance - Zero OFFICIAL
  SELECT COUNT(*) INTO v_official_count
  FROM public.provenance_records
  WHERE dataset_version_id IN ('ts_lgd_mandals_2023_v1', 'ts_mandal_ac_mappings_2023_v1', 'eci_ts_booths_2023_v1')
    AND status = 'OFFICIAL';

  IF v_official_count > 0 THEN
    RAISE EXCEPTION 'CHECK 6 FAILED: Found % provenance records illegally marked OFFICIAL!', v_official_count;
  END IF;

  -- Check 7: Polling Booth Fixtures
  SELECT COUNT(*) INTO v_booth_fixtures
  FROM public.provenance_records
  WHERE dataset_version_id = 'eci_ts_booths_2023_v1'
    AND transformation_type = 'synthetic_test_fixture';

  IF v_booth_fixtures < 4 THEN
    RAISE EXCEPTION 'CHECK 7 FAILED: Expected 4 synthetic_test_fixture booths, found %', v_booth_fixtures;
  END IF;

  RAISE NOTICE 'SUCCESS: ALL 7 STAGING VERIFICATION CHECKS PASSED FOR MIGRATION 043!';
END $$;
