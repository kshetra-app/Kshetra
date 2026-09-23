-- ==============================================================================
-- KSHETRA STAGING MIGRATION PACKAGE 043 ROLLBACK
-- Target: panIN-staging (fkpigozcqnmcvofuksar)
-- Reverts: Migration 043 (W015-B2 Remediation)
-- Restores: Migration 042 baseline state (commit a4dda2f)
-- ==============================================================================

BEGIN;

-- Temporarily disable append-only trigger
ALTER TABLE public.provenance_records DISABLE TRIGGER trg_prevent_provenance_mutation;

-- 1. Revert 12 Mandals LGD Codes
UPDATE public.mandals SET lgd_code = 7101 WHERE id = 'TS-MDL-7101';
UPDATE public.mandals SET lgd_code = 7102 WHERE id = 'TS-MDL-7102';
UPDATE public.mandals SET lgd_code = 7103 WHERE id = 'TS-MDL-7103';
UPDATE public.mandals SET lgd_code = 7104 WHERE id = 'TS-MDL-7104';
UPDATE public.mandals SET lgd_code = 7105 WHERE id = 'TS-MDL-7105';
UPDATE public.mandals SET lgd_code = 5320 WHERE id = 'TS-MDL-5320';
UPDATE public.mandals SET lgd_code = 5321 WHERE id = 'TS-MDL-5321';
UPDATE public.mandals SET lgd_code = 5322 WHERE id = 'TS-MDL-5322';
UPDATE public.mandals SET lgd_code = 5323 WHERE id = 'TS-MDL-5323';
UPDATE public.mandals SET lgd_code = 5324 WHERE id = 'TS-MDL-5324';
UPDATE public.mandals SET lgd_code = 5328 WHERE id = 'TS-MDL-5328';
UPDATE public.mandals SET lgd_code = 5329 WHERE id = 'TS-MDL-5329';

-- 2. Revert Mandals Provenance Records
UPDATE public.provenance_records pr
SET
  source_record_id = 'LGD-MANDAL-' || m.lgd_code::text,
  transformation_type = 'source_backed_seed',
  operator = 'system:w015_authoritative_sync',
  metadata = jsonb_build_object(
    'source_authority', 'Ministry of Panchayati Raj, Government of India',
    'source_registry', 'Local Government Directory (LGD)',
    'source_entity', 'subdistrict_mandal',
    'lgd_code', m.lgd_code,
    'mandal_name', m.name,
    'district_name', m.district,
    'statutory_reference', 'Local Government Directory (LGD), Ministry of Panchayati Raj, GoI',
    'source_url', 'https://lgdirectory.gov.in',
    'effective_date', '2023-01-01'
  )
FROM public.record_provenance_linkages rpl
JOIN public.mandals m ON m.id = rpl.domain_record_id
WHERE rpl.domain_table = 'mandals'
  AND rpl.provenance_id = pr.id
  AND pr.dataset_version_id = 'ts_lgd_mandals_2023_v1';

-- 3. Restore Spurious MCM Rows
DO $$
DECLARE
  v_ac2_internal UUID;
  v_ac3_internal UUID;
  v_ac4_internal UUID;
  v_mcm_kotapalli_id BIGINT;
  v_mcm_hajipur_id BIGINT;
BEGIN
  SELECT internal_id INTO v_ac2_internal FROM public.constituencies WHERE canonical_code = 'TS-AC-002';
  SELECT internal_id INTO v_ac3_internal FROM public.constituencies WHERE canonical_code = 'TS-AC-003';
  SELECT internal_id INTO v_ac4_internal FROM public.constituencies WHERE canonical_code = 'TS-AC-004';

  -- Revert Kotapalli in AC 2 to partial
  UPDATE public.mandal_constituency_map
  SET overlap_type = 'partial'
  WHERE mandal_id = 'TS-MDL-5328' AND constituency_internal_id = v_ac2_internal;

  -- Revert Hajipur in AC 4 to partial
  UPDATE public.mandal_constituency_map
  SET overlap_type = 'partial'
  WHERE mandal_id = 'TS-MDL-5329' AND constituency_internal_id = v_ac4_internal;

  -- Restore Kotapalli in AC 4
  INSERT INTO public.mandal_constituency_map (mandal_id, constituency_id, constituency_internal_id, overlap_type, primary_dataset_version_id)
  VALUES ('TS-MDL-5328', 'TS-AC-4', v_ac4_internal, 'partial', 'ts_mandal_ac_mappings_2023_v1')
  RETURNING id INTO v_mcm_kotapalli_id;

  -- Restore Hajipur in AC 3
  INSERT INTO public.mandal_constituency_map (mandal_id, constituency_id, constituency_internal_id, overlap_type, primary_dataset_version_id)
  VALUES ('TS-MDL-5329', 'TS-AC-3', v_ac3_internal, 'partial', 'ts_mandal_ac_mappings_2023_v1')
  RETURNING id INTO v_mcm_hajipur_id;

  -- Restore linkages
  IF v_mcm_kotapalli_id IS NOT NULL THEN
    INSERT INTO public.record_provenance_linkages (domain_table, domain_record_id, provenance_id, is_canonical)
    SELECT 'mandal_constituency_map', v_mcm_kotapalli_id::text, pr.id, true
    FROM public.provenance_records pr
    WHERE pr.metadata->>'purged_reason' LIKE '%Kotapalli%'
    LIMIT 1;
  END IF;

  IF v_mcm_hajipur_id IS NOT NULL THEN
    INSERT INTO public.record_provenance_linkages (domain_table, domain_record_id, provenance_id, is_canonical)
    SELECT 'mandal_constituency_map', v_mcm_hajipur_id::text, pr.id, true
    FROM public.provenance_records pr
    WHERE pr.metadata->>'purged_reason' LIKE '%Hajipur%'
    LIMIT 1;
  END IF;
END $$;

-- 4. Revert MCM Provenance Records
UPDATE public.provenance_records pr
SET
  source_record_id = 'ECI-DELIM-2008:AC-' || lpad(replace(c.canonical_code, 'TS-AC-', ''), 3, '0') || ':MDL-' || m.lgd_code::text,
  transformation_type = 'source_backed_seed',
  operator = 'system:w015_authoritative_sync'
FROM public.record_provenance_linkages rpl
JOIN public.mandal_constituency_map mcm ON mcm.id::text = rpl.domain_record_id
JOIN public.mandals m ON m.id = mcm.mandal_id
JOIN public.constituencies c ON c.internal_id = mcm.constituency_internal_id
WHERE rpl.domain_table = 'mandal_constituency_map'
  AND rpl.provenance_id = pr.id
  AND pr.dataset_version_id = 'ts_mandal_ac_mappings_2023_v1';

-- 5. Delete Mandal Lineage Record
DELETE FROM public.record_provenance_linkages
WHERE domain_table = 'geography_entity_lineage'
  AND provenance_id = md5('pr_lineage_mancherial_hajipur_split')::uuid;

DELETE FROM public.provenance_records
WHERE id = md5('pr_lineage_mancherial_hajipur_split')::uuid;

DELETE FROM public.geography_entity_lineage
WHERE entity_type = 'mandal'
  AND predecessor_internal_id = md5('mandals:TS-MDL-5321')::uuid
  AND successor_internal_id = md5('mandals:TS-MDL-5329')::uuid;

-- 6. Revert Polling Booths Provenance Records
UPDATE public.provenance_records pr
SET
  source_record_id = 'ECI-PS-2023:AC-' || lpad(replace(c.canonical_code, 'TS-AC-', ''), 3, '0') || ':PS-' || lpad(pb.booth_number::text, 3, '0'),
  transformation_type = 'source_backed_seed',
  operator = 'system:w015_authoritative_sync'
FROM public.record_provenance_linkages rpl
JOIN public.polling_booths pb ON pb.id = rpl.domain_record_id
JOIN public.constituencies c ON c.internal_id = pb.constituency_internal_id
WHERE rpl.domain_table = 'polling_booths'
  AND rpl.provenance_id = pr.id
  AND pr.dataset_version_id = 'eci_ts_booths_2023_v1';

-- 7. Revert geography_entity_lineage CHECK constraint
ALTER TABLE public.geography_entity_lineage
  DROP CONSTRAINT IF EXISTS geography_entity_lineage_entity_type_check;

ALTER TABLE public.geography_entity_lineage
  ADD CONSTRAINT geography_entity_lineage_entity_type_check
    CHECK (entity_type IN ('state', 'district', 'parliamentary_constituency', 'constituency'));

-- Re-enable append-only trigger
ALTER TABLE public.provenance_records ENABLE TRIGGER trg_prevent_provenance_mutation;

COMMIT;
