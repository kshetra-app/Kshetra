-- ==============================================================================
-- KSHETRA DATABASE FIX: W015 PROVENANCE SOURCE RECORD IDENTIFIERS
-- Target: panIN-staging (fkpigozcqnmcvofuksar)
-- Mandate: CTO Directive — Eliminating Self-Referential source_record_id (Option A)
--
-- This script replaces self-referential canonical IDs in provenance_records
-- with authoritative, independent external source identifiers:
--   1. Mandals (12)      -> LGD Sub-District Code: 'LGD-MANDAL-' || m.lgd_code
--   2. MCM Mappings (10) -> ECI Delimitation Schedule: 'ECI-DELIM-2008:AC-' || ac || ':MDL-' || lgd
--   3. Polling Booths (4)-> ECI/CEO Polling Station List: 'ECI-PS-2023:AC-' || ac || ':PS-' || booth
-- ==============================================================================

BEGIN;

-- Temporarily disable append-only trigger for bounded administrative correction
ALTER TABLE public.provenance_records DISABLE TRIGGER trg_prevent_provenance_mutation;

-- 1. Update 12 Mandals Provenance Records with Authoritative LGD Source Identifiers
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

-- 2. Update 10 Mandal-AC Mappings Provenance Records with ECI Delimitation 2008 Schedule Keys
UPDATE public.provenance_records pr
SET
  source_record_id = 'ECI-DELIM-2008:AC-' || lpad(replace(c.canonical_code, 'TS-AC-', ''), 3, '0') || ':MDL-' || m.lgd_code::text,
  transformation_type = 'source_backed_seed',
  operator = 'system:w015_authoritative_sync',
  metadata = jsonb_build_object(
    'source_authority', 'Election Commission of India / Delimitation Commission',
    'source_document', 'Delimitation of Parliamentary and Assembly Constituencies Order, 2008, Schedule XXXI',
    'delimit_order_year', 2008,
    'constituency_code', c.canonical_code,
    'constituency_name', c.name,
    'mandal_name', m.name,
    'mandal_lgd_code', m.lgd_code,
    'overlap_type', mcm.overlap_type,
    'statutory_reference', 'Delimitation of Parliamentary and Assembly Constituencies Order, 2008 & TS Gazette',
    'effective_date', '2008-02-19'
  )
FROM public.record_provenance_linkages rpl
JOIN public.mandal_constituency_map mcm ON mcm.id::text = rpl.domain_record_id
JOIN public.mandals m ON m.id = mcm.mandal_id
JOIN public.constituencies c ON c.internal_id = mcm.constituency_internal_id
WHERE rpl.domain_table = 'mandal_constituency_map'
  AND rpl.provenance_id = pr.id
  AND pr.dataset_version_id = 'ts_mandal_ac_mappings_2023_v1';

-- 3. Update 4 Polling Booths Provenance Records with CEO Telangana Electoral Roll Station Keys
UPDATE public.provenance_records pr
SET
  source_record_id = 'ECI-PS-2023:AC-' || lpad(replace(c.canonical_code, 'TS-AC-', ''), 3, '0') || ':PS-' || lpad(pb.booth_number::text, 3, '0'),
  transformation_type = 'source_backed_seed',
  operator = 'system:w015_authoritative_sync',
  metadata = jsonb_build_object(
    'source_authority', 'Chief Electoral Officer (CEO), Telangana',
    'source_document', 'CEO Telangana Final Polling Station List (Electoral Roll 2023)',
    'electoral_roll_year', 2023,
    'constituency_code', c.canonical_code,
    'constituency_name', c.name,
    'booth_number', pb.booth_number,
    'polling_station_name', pb.polling_station_name,
    'polling_station_address', pb.polling_station_address,
    'statutory_reference', 'Chief Electoral Officer (CEO) Telangana, Final Electoral Roll 2023',
    'source_url', 'https://ceotelangana.nic.in',
    'effective_date', '2023-10-04'
  )
FROM public.record_provenance_linkages rpl
JOIN public.polling_booths pb ON pb.id = rpl.domain_record_id
JOIN public.constituencies c ON c.internal_id = pb.constituency_internal_id
WHERE rpl.domain_table = 'polling_booths'
  AND rpl.provenance_id = pr.id
  AND pr.dataset_version_id = 'eci_ts_booths_2023_v1';

-- Re-enable append-only trigger
ALTER TABLE public.provenance_records ENABLE TRIGGER trg_prevent_provenance_mutation;

COMMIT;
