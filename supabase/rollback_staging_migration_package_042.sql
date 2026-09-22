-- ==============================================================================
-- Rollback Package for Migration 042 (W015 Geography Relationship Engine)
-- Restores staging to exact W014 baseline (commit bb7c6ec)
-- ==============================================================================

BEGIN;

-- Temporarily disable mutation triggers for clean rollback
ALTER TABLE public.provenance_records DISABLE TRIGGER trg_prevent_provenance_mutation;
ALTER TABLE public.dataset_versions DISABLE TRIGGER trg_prevent_dataset_version_mutation;

-- 1. Remove W012 Provenance Linkages and Records
DELETE FROM public.record_provenance_linkages
WHERE domain_table IN ('mandals', 'mandal_constituency_map', 'polling_booths');

DELETE FROM public.provenance_records
WHERE dataset_version_id IN ('ts_lgd_mandals_2023_v1', 'ts_mandal_ac_mappings_2023_v1', 'eci_ts_booths_2023_v1');

-- 2. Clean Seed Data
DELETE FROM public.polling_booths
WHERE primary_dataset_version_id = 'eci_ts_booths_2023_v1';

DELETE FROM public.mandal_constituency_map
WHERE primary_dataset_version_id = 'ts_mandal_ac_mappings_2023_v1';

DELETE FROM public.mandals
WHERE primary_dataset_version_id = 'ts_lgd_mandals_2023_v1';

-- 3. Remove Governance Registrations
DELETE FROM public.dataset_versions
WHERE id IN ('ts_lgd_mandals_2023_v1', 'ts_mandal_ac_mappings_2023_v1', 'eci_ts_booths_2023_v1');

DELETE FROM public.datasets
WHERE id IN ('ts_lgd_mandals', 'ts_mandal_ac_mappings', 'eci_polling_stations');

DELETE FROM public.data_sources
WHERE id = 'mopr_lgd';

-- Re-enable mutation triggers
ALTER TABLE public.provenance_records ENABLE TRIGGER trg_prevent_provenance_mutation;
ALTER TABLE public.dataset_versions ENABLE TRIGGER trg_prevent_dataset_version_mutation;

-- 4. Revert Constraints and Columns
ALTER TABLE public.polling_booths
  DROP COLUMN IF EXISTS constituency_internal_id,
  DROP COLUMN IF EXISTS primary_dataset_version_id;

ALTER TABLE public.mandal_constituency_map
  DROP CONSTRAINT IF EXISTS uq_mcm_mandal_ac,
  DROP COLUMN IF EXISTS constituency_internal_id,
  DROP COLUMN IF EXISTS primary_dataset_version_id;

ALTER TABLE public.mandals
  DROP COLUMN IF EXISTS district_id,
  DROP COLUMN IF EXISTS primary_dataset_version_id;

COMMIT;
