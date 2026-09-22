-- ==============================================================================
-- KSHETRA DATABASE VERIFICATION: W015 PROVENANCE SOURCE RECORD IDENTIFIERS
-- Target: panIN-staging (fkpigozcqnmcvofuksar)
--
-- Asserts that:
--   1. Zero records have source_record_id matching domain canonical ID
--   2. Exactly 12 mandals have LGD source keys (LGD-MANDAL-*)
--   3. Exactly 10 MCM records have ECI Delimitation keys (ECI-DELIM-2008:*)
--   4. Exactly 4 booths have ECI Polling Station keys (ECI-PS-2023:*)
--   5. Exactly 26 provenance records exist across the 3 W015 datasets
--   6. 100% of records remain UNVERIFIED, zero OFFICIAL
-- ==============================================================================

DO $$
DECLARE
  v_self_referential_mandals INT;
  v_self_referential_mcm INT;
  v_self_referential_booths INT;
  v_lgd_mandals INT;
  v_delim_mcm INT;
  v_ps_booths INT;
  v_total_prov INT;
  v_official_count INT;
BEGIN
  -- 1. Check self-referential IDs (must all be 0)
  SELECT count(*) INTO v_self_referential_mandals
  FROM public.provenance_records pr
  JOIN public.record_provenance_linkages rpl ON rpl.provenance_id = pr.id
  WHERE rpl.domain_table = 'mandals' AND pr.source_record_id = rpl.domain_record_id;

  SELECT count(*) INTO v_self_referential_mcm
  FROM public.provenance_records pr
  JOIN public.record_provenance_linkages rpl ON rpl.provenance_id = pr.id
  WHERE rpl.domain_table = 'mandal_constituency_map' AND pr.source_record_id = rpl.domain_record_id;

  SELECT count(*) INTO v_self_referential_booths
  FROM public.provenance_records pr
  JOIN public.record_provenance_linkages rpl ON rpl.provenance_id = pr.id
  WHERE rpl.domain_table = 'polling_booths' AND pr.source_record_id = rpl.domain_record_id;

  IF v_self_referential_mandals > 0 OR v_self_referential_mcm > 0 OR v_self_referential_booths > 0 THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Found self-referential provenance records (Mandals: %, MCM: %, Booths: %)',
      v_self_referential_mandals, v_self_referential_mcm, v_self_referential_booths;
  END IF;

  -- 2. Verify external source patterns
  SELECT count(*) INTO v_lgd_mandals
  FROM public.provenance_records
  WHERE dataset_version_id = 'ts_lgd_mandals_2023_v1' AND source_record_id LIKE 'LGD-MANDAL-%';

  SELECT count(*) INTO v_delim_mcm
  FROM public.provenance_records
  WHERE dataset_version_id = 'ts_mandal_ac_mappings_2023_v1' AND source_record_id LIKE 'ECI-DELIM-2008:AC-%:MDL-%';

  SELECT count(*) INTO v_ps_booths
  FROM public.provenance_records
  WHERE dataset_version_id = 'eci_ts_booths_2023_v1' AND source_record_id LIKE 'ECI-PS-2023:AC-%:PS-%';

  IF v_lgd_mandals != 12 THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Expected 12 LGD mandal source records, found %', v_lgd_mandals;
  END IF;

  IF v_delim_mcm != 10 THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Expected 10 Delimitation MCM source records, found %', v_delim_mcm;
  END IF;

  IF v_ps_booths != 4 THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Expected 4 Polling Station booth source records, found %', v_ps_booths;
  END IF;

  -- 3. Verify total count and governance status
  SELECT count(*) INTO v_total_prov
  FROM public.provenance_records
  WHERE dataset_version_id IN ('ts_lgd_mandals_2023_v1', 'ts_mandal_ac_mappings_2023_v1', 'eci_ts_booths_2023_v1');

  SELECT count(*) INTO v_official_count
  FROM public.provenance_records
  WHERE dataset_version_id IN ('ts_lgd_mandals_2023_v1', 'ts_mandal_ac_mappings_2023_v1', 'eci_ts_booths_2023_v1')
    AND status = 'OFFICIAL';

  IF v_total_prov != 26 THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Expected 26 total W015 provenance records, found %', v_total_prov;
  END IF;

  IF v_official_count > 0 THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Found % OFFICIAL records, expected 0 (all must be UNVERIFIED)', v_official_count;
  END IF;

  RAISE NOTICE 'SUCCESS: All 26 W015 provenance records verified as authoritative, non-self-referential, and UNVERIFIED.';
END $$;
