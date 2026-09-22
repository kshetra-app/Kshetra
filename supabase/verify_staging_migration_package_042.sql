-- ==============================================================================
-- verify_staging_migration_package_042.sql
-- Authoritative SQL-level verification checks for Migration 042 on panIN-staging
-- ==============================================================================

DO $$
DECLARE
  v_mandals_count INT;
  v_mandals_fk_count INT;
  v_mcm_count INT;
  v_mcm_fk_count INT;
  v_booths_count INT;
  v_booths_fk_count INT;
  v_ds_count INT;
  v_dv_count INT;
  v_prov_count INT;
  v_linkage_count INT;
BEGIN
  RAISE NOTICE '=== EXECUTING MIGRATION 042 SQL VERIFICATION ===';

  -- Check 1: Mandals count and district_id FK resolution
  SELECT COUNT(*) INTO v_mandals_count FROM public.mandals WHERE primary_dataset_version_id = 'ts_lgd_mandals_2023_v1';
  IF v_mandals_count < 12 THEN
    RAISE EXCEPTION 'Check 1 Failed: Expected at least 12 seeded mandals, got %', v_mandals_count;
  END IF;

  SELECT COUNT(*) INTO v_mandals_fk_count
  FROM public.mandals m
  JOIN public.districts d ON m.district_id = d.id
  WHERE m.primary_dataset_version_id = 'ts_lgd_mandals_2023_v1';

  IF v_mandals_fk_count != v_mandals_count THEN
    RAISE EXCEPTION 'Check 1 Failed: Not all mandals resolve valid district_id FK (expected %, got %)', v_mandals_count, v_mandals_fk_count;
  END IF;
  RAISE NOTICE 'Check 1 PASS: % mandals verified with valid district_id FK', v_mandals_count;

  -- Check 2: Mandal-AC containment mappings and FK resolution
  SELECT COUNT(*) INTO v_mcm_count FROM public.mandal_constituency_map WHERE primary_dataset_version_id = 'ts_mandal_ac_mappings_2023_v1';
  IF v_mcm_count < 9 THEN
    RAISE EXCEPTION 'Check 2 Failed: Expected at least 9 mandal-AC mappings, got %', v_mcm_count;
  END IF;

  SELECT COUNT(*) INTO v_mcm_fk_count
  FROM public.mandal_constituency_map mcm
  JOIN public.mandals m ON mcm.mandal_id = m.id
  JOIN public.constituencies c ON mcm.constituency_internal_id = c.internal_id
  WHERE mcm.primary_dataset_version_id = 'ts_mandal_ac_mappings_2023_v1';

  IF v_mcm_fk_count != v_mcm_count THEN
    RAISE EXCEPTION 'Check 2 Failed: Not all mandal_constituency_map rows resolve valid FKs (expected %, got %)', v_mcm_count, v_mcm_fk_count;
  END IF;
  RAISE NOTICE 'Check 2 PASS: % mandal-AC mappings verified with valid mandal and constituency FKs', v_mcm_count;

  -- Check 3: Polling booths and AC containment invariant
  SELECT COUNT(*) INTO v_booths_count FROM public.polling_booths WHERE primary_dataset_version_id = 'eci_ts_booths_2023_v1';
  IF v_booths_count < 4 THEN
    RAISE EXCEPTION 'Check 3 Failed: Expected at least 4 seeded booths, got %', v_booths_count;
  END IF;

  SELECT COUNT(*) INTO v_booths_fk_count
  FROM public.polling_booths pb
  JOIN public.constituencies c ON pb.constituency_internal_id = c.internal_id
  WHERE pb.primary_dataset_version_id = 'eci_ts_booths_2023_v1';

  IF v_booths_fk_count != v_booths_count THEN
    RAISE EXCEPTION 'Check 3 Failed: Not all polling booths resolve valid constituency_internal_id FK (expected %, got %)', v_booths_count, v_booths_fk_count;
  END IF;
  RAISE NOTICE 'Check 3 PASS: % polling booths verified with valid constituency FKs', v_booths_count;

  -- Check 4: Governance Catalog Data Sources & Datasets
  SELECT COUNT(*) INTO v_ds_count FROM public.data_sources WHERE id = 'mopr_lgd';
  IF v_ds_count != 1 THEN
    RAISE EXCEPTION 'Check 4 Failed: mopr_lgd data source not found';
  END IF;

  SELECT COUNT(*) INTO v_dv_count
  FROM public.dataset_versions
  WHERE id IN ('ts_lgd_mandals_2023_v1', 'ts_mandal_ac_mappings_2023_v1', 'eci_ts_booths_2023_v1')
    AND default_status = 'UNVERIFIED';

  IF v_dv_count != 3 THEN
    RAISE EXCEPTION 'Check 4 Failed: Expected 3 UNVERIFIED dataset versions, got %', v_dv_count;
  END IF;
  RAISE NOTICE 'Check 4 PASS: W012 governance registrations verified (100%% UNVERIFIED)';

  -- Check 5: Provenance Records & Linkages
  SELECT COUNT(*) INTO v_prov_count
  FROM public.provenance_records
  WHERE dataset_version_id IN ('ts_lgd_mandals_2023_v1', 'ts_mandal_ac_mappings_2023_v1', 'eci_ts_booths_2023_v1');

  SELECT COUNT(*) INTO v_linkage_count
  FROM public.record_provenance_linkages
  WHERE domain_table IN ('mandals', 'mandal_constituency_map', 'polling_booths');

  IF v_prov_count < 25 OR v_linkage_count < 25 THEN
    RAISE EXCEPTION 'Check 5 Failed: Insufficient provenance records (%) or linkages (%)', v_prov_count, v_linkage_count;
  END IF;
  RAISE NOTICE 'Check 5 PASS: % provenance records and % linkages verified', v_prov_count, v_linkage_count;

  -- Check 6: Row Level Security enabled on modified tables
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('mandals', 'mandal_constituency_map', 'polling_booths')
      AND rowsecurity = false
  ) THEN
    RAISE EXCEPTION 'Check 6 Failed: RLS not enabled on mandals, mandal_constituency_map, or polling_booths';
  END IF;
  RAISE NOTICE 'Check 6 PASS: RLS enabled on all W015 relationship tables';

  RAISE NOTICE '=== ALL MIGRATION 042 SQL VERIFICATION CHECKS PASSED ===';
END $$;
