/**
 * scripts/generate-migration-062-assam-2023.mjs
 *
 * Deterministically generates:
 * supabase/migrations/062_canonical_assam_2023_delimitation.sql
 *
 * Implements Milestone W021.5-B1-R5: Current Statutory Geography Certification & Assam 2023 Closure
 * Authority: ECI Delimitation Order No. 282/AS/2023(DEL)/Vol.V dated 2023-08-11
 * (Gazette of India Extraordinary No. 434, effective 2023-08-16)
 */

import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const tablePath = path.join(REPO_ROOT, 'scripts', 'assam_2023_statutory_table.json');
const rawData = JSON.parse(fs.readFileSync(tablePath, 'utf8'));

const pcMap = {
  'Barpeta': 'AS-PC-01',
  'Darrang-Udalguri': 'AS-PC-02',
  'Dhubri': 'AS-PC-03',
  'Dibrugarh': 'AS-PC-04',
  'Diphu': 'AS-PC-05',
  'Guwahati': 'AS-PC-06',
  'Jorhat': 'AS-PC-07',
  'Karimganj': 'AS-PC-08',
  'Kaziranga': 'AS-PC-09',
  'Kokrajhar': 'AS-PC-10',
  'Lakhimpur': 'AS-PC-11',
  'Nagaon': 'AS-PC-12',
  'Silchar': 'AS-PC-13',
  'Sonitpur': 'AS-PC-14'
};

const pcReservations = {
  'AS-PC-01': 'general',
  'AS-PC-02': 'general',
  'AS-PC-03': 'general',
  'AS-PC-04': 'general',
  'AS-PC-05': 'st',
  'AS-PC-06': 'general',
  'AS-PC-07': 'general',
  'AS-PC-08': 'general',
  'AS-PC-09': 'general',
  'AS-PC-10': 'st',
  'AS-PC-11': 'general',
  'AS-PC-12': 'general',
  'AS-PC-13': 'sc',
  'AS-PC-14': 'general'
};

const pcNames = {
  'AS-PC-01': 'Barpeta',
  'AS-PC-02': 'Darrang-Udalguri',
  'AS-PC-03': 'Dhubri',
  'AS-PC-04': 'Dibrugarh',
  'AS-PC-05': 'Diphu',
  'AS-PC-06': 'Guwahati',
  'AS-PC-07': 'Jorhat',
  'AS-PC-08': 'Karimganj',
  'AS-PC-09': 'Kaziranga',
  'AS-PC-10': 'Kokrajhar',
  'AS-PC-11': 'Lakhimpur',
  'AS-PC-12': 'Nagaon',
  'AS-PC-13': 'Silchar',
  'AS-PC-14': 'Sonitpur'
};

function escapeSql(str) {
  return str.replace(/'/g, "''");
}

let sql = `-- ==============================================================================
-- KSHETRA CANONICAL ELECTORAL GEOGRAPHY MIGRATION
-- Migration: 062_canonical_assam_2023_delimitation.sql
-- Milestone: W021.5-B1-R5: Current Statutory Geography Certification & Assam 2023 Closure
--
-- Baseline Commit: 60d54eed77ba2aebd3c6aab61cba2375b72aef2a
-- Authority: ECI Delimitation Order No. 282/AS/2023(DEL)/Vol.V dated 2023-08-11
--            Representation of the People Act, 1950 (Section 8A) / Delimitation Act, 2002
--            Gazette of India Extraordinary No. 434, Effective Date: 2023-08-16
--
-- Objective:
--   1. Register authoritative dataset version: eci_national_ac_2023_as_v1.
--   2. Register statutory evidence record: a55a0023-0000-4000-8000-000000000001.
--   3. Align Assam 126 Assembly Constituencies in public.constituencies to regime eci_delimitation_2023_as.
--   4. Archive 2008 AC versions (valid_to = '2023-08-16', is_current = false) and insert 126 new 2023 versions.
--   5. Align Assam 14 Parliamentary Constituencies in public.parliamentary_constituencies to regime eci_delimitation_2023_as.
--   6. Archive 2008 PC versions (valid_to = '2023-08-16', is_current = false) and insert 14 new 2023 PC versions.
--   7. Archive obsolete 2008 AC->PC mappings in public.constituency_parliamentary_mappings and insert 126 new 2023 mappings.
-- ==============================================================================

BEGIN;

-- ─── SECTION 1: DATASET VERSION & EVIDENCE RECORD REGISTRATION ─────────────────

INSERT INTO public.dataset_versions (
  id, dataset_name, version_tag, authority, description, effective_date, checksum
)
VALUES (
  'eci_national_ac_2023_as_v1',
  'Election Commission of India - Assam Delimitation Order 2023',
  '2023-AS-DELIM-V1',
  'Election Commission of India',
  'Delimitation Order No. 282/AS/2023(DEL)/Vol.V dated 11th August 2023 reorganising 126 Assembly and 14 Parliamentary Constituencies in Assam',
  '2023-08-16'::date,
  'sha256:eci_delimitation_order_282_as_2023_final_statutory_table'
)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  effective_date = EXCLUDED.effective_date;

INSERT INTO public.evidence_records (
  id, evidence_type, title, description, citation, source_uri, collected_at
)
VALUES (
  'a55a0023-0000-4000-8000-000000000001'::uuid,
  'STATUTORY_GAZETTE_ORDER',
  'ECI Assam Delimitation Final Order 2023',
  'Final Order No. 282/AS/2023(DEL)/Vol.V under Section 8A Representation of the People Act, 1950',
  'ECI Notification No. 282/AS/2023 published in Gazette of India Extraordinary No. 434 dated 11 August 2023',
  'https://eci.gov.in/files/file/15264-delimitation-of-assembly-and-parliamentary-constituencies-in-the-state-of-assam/',
  '2023-08-11 12:00:00+00'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  citation = EXCLUDED.citation,
  source_uri = EXCLUDED.source_uri;

-- ─── SECTION 2: CANONICAL PARLIAMENTARY CONSTITUENCIES & VERSIONS ──────────────

UPDATE public.parliamentary_constituencies
SET
  delimitation_regime_id = 'eci_delimitation_2023_as',
  valid_from = '2023-08-16'::date,
  updated_at = now()
WHERE state_code = 'AS';

-- Archive 2008 PC versions
UPDATE public.parliamentary_constituency_versions
SET
  valid_to = '2023-08-16'::date,
  is_current = false,
  updated_at = now()
WHERE pc_id IN (SELECT id FROM public.parliamentary_constituencies WHERE state_code = 'AS')
  AND is_current = true;

-- Insert 2023 PC versions
INSERT INTO public.parliamentary_constituency_versions (
  pc_id, delimitation_regime_id, version_code, pc_number, name, reservation, valid_from, valid_to, is_current, primary_dataset_version_id
)
SELECT
  pc.id,
  'eci_delimitation_2023_as',
  pc.code || '-2023',
  pc.pc_number,
  pc.name,
  pc.reservation,
  '2023-08-16'::date,
  NULL,
  true,
  'eci_national_ac_2023_as_v1'
FROM public.parliamentary_constituencies pc
WHERE pc.state_code = 'AS'
ON CONFLICT (version_code) DO UPDATE SET
  name = EXCLUDED.name,
  reservation = EXCLUDED.reservation,
  valid_from = EXCLUDED.valid_from,
  valid_to = EXCLUDED.valid_to,
  is_current = EXCLUDED.is_current,
  updated_at = now();

-- Point PC current_version_id to the 2023 version
UPDATE public.parliamentary_constituencies pc
SET
  current_version_id = pcv.id,
  updated_at = now()
FROM public.parliamentary_constituency_versions pcv
WHERE pcv.pc_id = pc.id AND pcv.version_code = pc.code || '-2023';

-- ─── SECTION 3: CANONICAL ASSEMBLY CONSTITUENCIES & VERSIONS ──────────────────

-- Update constituencies table for Assam 126 seats with 2023 attributes
UPDATE public.constituencies c
SET
  name = m.name,
  district = m.district,
  reservation_status = m.reservation,
  delimitation_regime_id = 'eci_delimitation_2023_as',
  valid_from = '2023-08-16'::date,
  primary_dataset_version_id = 'eci_national_ac_2023_as_v1',
  updated_at = now()
FROM (
  VALUES
`;

const acValueRows = rawData.map(d => {
  return `    ('${d.acCode}', ${d.acNo}, '${escapeSql(d.acName)}', '${escapeSql(d.district)}', '${d.reservation}')`;
});

sql += acValueRows.join(',\n');
sql += `
) AS m(ac_code, ac_no, name, district, reservation)
WHERE c.canonical_code = m.ac_code AND c.state_code = 'AS';

-- Archive 2008 AC versions
UPDATE public.constituency_versions
SET
  valid_to = '2023-08-16'::date,
  is_current = false,
  updated_at = now()
WHERE constituency_internal_id IN (
  SELECT internal_id FROM public.constituencies WHERE state_code = 'AS'
) AND is_current = true;

-- Insert 2023 AC versions
INSERT INTO public.constituency_versions (
  constituency_internal_id, delimitation_regime_id, version_code, canonical_code, ac_no, name, reservation, valid_from, valid_to, is_current, primary_dataset_version_id
)
SELECT
  c.internal_id,
  'eci_delimitation_2023_as',
  c.canonical_code || '-2023',
  c.canonical_code,
  c.ac_no,
  c.name,
  CASE LOWER(c.reservation_status)
    WHEN 'sc' THEN 'sc'
    WHEN 'st' THEN 'st'
    ELSE 'general'
  END,
  '2023-08-16'::date,
  NULL,
  true,
  'eci_national_ac_2023_as_v1'
FROM public.constituencies c
WHERE c.state_code = 'AS'
ON CONFLICT (version_code) DO UPDATE SET
  name = EXCLUDED.name,
  reservation = EXCLUDED.reservation,
  valid_from = EXCLUDED.valid_from,
  valid_to = EXCLUDED.valid_to,
  is_current = EXCLUDED.is_current,
  updated_at = now();

-- Point constituency current_version_id to 2023 version
UPDATE public.constituencies c
SET
  current_version_id = cv.id,
  updated_at = now()
FROM public.constituency_versions cv
WHERE cv.constituency_internal_id = c.internal_id AND cv.version_code = c.canonical_code || '-2023';

-- ─── SECTION 4: TEMPORAL AC <-> PC MAPPINGS (TABLE B DELIMITATION 2023) ───────

-- Archive old 2008 Assam mappings
UPDATE public.constituency_parliamentary_mappings cpm
SET
  effective_to = '2023-08-16'::date,
  is_current = false,
  updated_at = now()
FROM public.constituency_versions cv
JOIN public.constituencies c ON c.internal_id = cv.constituency_internal_id
WHERE cpm.assembly_constituency_version_id = cv.id
  AND c.state_code = 'AS'
  AND cpm.is_current = true;

-- Insert 126 new 2023 mappings linking 2023 AC versions to 2023 PC versions
INSERT INTO public.constituency_parliamentary_mappings (
  assembly_constituency_version_id,
  parliamentary_constituency_version_id,
  delimitation_regime_id,
  effective_from,
  effective_to,
  is_current,
  source_dataset_version_id,
  evidence_record_id,
  data_status,
  notes
)
SELECT
  cv.id AS assembly_constituency_version_id,
  pcv.id AS parliamentary_constituency_version_id,
  'eci_delimitation_2023_as' AS delimitation_regime_id,
  '2023-08-16'::date AS effective_from,
  NULL::date AS effective_to,
  true AS is_current,
  'eci_national_ac_2023_as_v1' AS source_dataset_version_id,
  'a55a0023-0000-4000-8000-000000000001'::uuid AS evidence_record_id,
  'VERIFIED' AS data_status,
  'ECI Delimitation Order No. 282/AS/2023 Table B Allocation (AC #' || m.ac_no || ' ' || m.ac_name || ' -> ' || m.pc_code || ' ' || m.pc_name || ')' AS notes
FROM (
  VALUES
`;

const mappingRows = rawData.map(d => {
  const pcCode = pcMap[d.pcName];
  return `    ('${d.acCode}', ${d.acNo}, '${escapeSql(d.acName)}', '${pcCode}', '${escapeSql(d.pcName)}')`;
});

sql += mappingRows.join(',\n');
sql += `
) AS m(ac_code, ac_no, ac_name, pc_code, pc_name)
JOIN public.constituencies c ON c.canonical_code = m.ac_code AND c.state_code = 'AS'
JOIN public.constituency_versions cv ON cv.constituency_internal_id = c.internal_id AND cv.version_code = c.canonical_code || '-2023'
JOIN public.parliamentary_constituencies pc ON pc.code = m.pc_code AND pc.state_code = 'AS'
JOIN public.parliamentary_constituency_versions pcv ON pcv.pc_id = pc.id AND pcv.version_code = pc.code || '-2023'
ON CONFLICT (assembly_constituency_version_id, parliamentary_constituency_version_id, delimitation_regime_id, effective_from) DO UPDATE SET
  is_current = EXCLUDED.is_current,
  data_status = EXCLUDED.data_status,
  evidence_record_id = EXCLUDED.evidence_record_id,
  notes = EXCLUDED.notes,
  updated_at = now();

-- ─── SECTION 5: STATUTORY RECORD PROVENANCE LINKAGE ────────────────────────────

INSERT INTO public.record_provenance_linkages (domain_table, domain_record_id, provenance_id, is_canonical)
SELECT 'constituencies', c.id, 'a55a0023-0000-4000-8000-000000000001'::uuid, true
FROM public.constituencies c
WHERE c.state_code = 'AS'
ON CONFLICT (domain_table, domain_record_id, provenance_id) DO NOTHING;

INSERT INTO public.record_provenance_linkages (domain_table, domain_record_id, provenance_id, is_canonical)
SELECT 'parliamentary_constituencies', pc.code, 'a55a0023-0000-4000-8000-000000000001'::uuid, true
FROM public.parliamentary_constituencies pc
WHERE pc.state_code = 'AS'
ON CONFLICT (domain_table, domain_record_id, provenance_id) DO NOTHING;

COMMIT;
`;

const migrationPath = path.join(REPO_ROOT, 'supabase', 'migrations', '062_canonical_assam_2023_delimitation.sql');
fs.writeFileSync(migrationPath, sql, 'utf8');
console.log(`Successfully generated Migration 062: ${migrationPath}`);
console.log(`Lines: ${sql.split('\n').length}, Size: ${Buffer.byteLength(sql, 'utf8')} bytes`);
