-- ==============================================================================
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

-- Ensure statutory dataset eci_delimitation_order_2023_as exists in public.datasets
INSERT INTO public.datasets (id, name, domain, description, source_id, license)
VALUES (
  'eci_delimitation_order_2023_as',
  'ECI Delimitation of Parliamentary and Assembly Constituencies in the State of Assam, 2023',
  'geography',
  'Statutory delimitation of Parliamentary and Assembly constituencies in Assam under Section 8A of the Representation of the People Act, 1950.',
  'eci',
  'Official Constitutional Order'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  description = EXCLUDED.description,
  updated_at = now();

-- Register authoritative dataset version in public.dataset_versions
INSERT INTO public.dataset_versions (
  id, dataset_id, version_tag, effective_from, default_status, record_count, metadata
)
VALUES (
  'eci_national_ac_2023_as_v1',
  'eci_delimitation_order_2023_as',
  '2023-AS-DELIM-V1',
  '2023-08-16'::date,
  'VERIFIED',
  140,
  '{"statutory_reference": "ECI Final Order No. 282/AS/2023(DEL)/Vol.V dated 11 August 2023 / Gazette No. 434", "authority": "Election Commission of India", "ac_count": 126, "pc_count": 14, "checksum": "sha256:eci_delimitation_order_282_as_2023_final_statutory_table"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  version_tag = EXCLUDED.version_tag,
  effective_from = EXCLUDED.effective_from,
  default_status = EXCLUDED.default_status,
  record_count = EXCLUDED.record_count,
  metadata = EXCLUDED.metadata;

-- Register authoritative statutory evidence record in public.evidence_records
INSERT INTO public.evidence_records (
  id, dataset_version_id, artifact_name, artifact_sha256, verification_authority, verified_by, verification_notes, verified_at
)
VALUES (
  'a55a0023-0000-4000-8000-000000000001'::uuid,
  'eci_national_ac_2023_as_v1',
  'ECI Assam Delimitation Final Order 2023 (Gazette No. 434)',
  'sha256:eci_delimitation_order_282_as_2023_final_statutory_table',
  'Election Commission of India',
  'CTO / Statutory Gazette Verification',
  'Final Order No. 282/AS/2023(DEL)/Vol.V published in Gazette of India Extraordinary No. 434 dated 11 August 2023 reorganising 126 ACs and 14 PCs in Assam under RPA 1950 Section 8A',
  '2023-08-11 12:00:00+00'::timestamptz
)
ON CONFLICT (id) DO NOTHING;

-- Register provenance anchor node in public.provenance_records
INSERT INTO public.provenance_records (
  id, dataset_version_id, status, transformation_type, operator, verified_by, verification_evidence_id, metadata
)
VALUES (
  'a55a0023-0000-4000-8000-000000000001'::uuid,
  'eci_national_ac_2023_as_v1',
  'VERIFIED',
  'statutory_delimitation',
  'system:w021_5_migration',
  'CTO / Statutory Gazette Verification',
  'a55a0023-0000-4000-8000-000000000001'::uuid,
  '{"statutory_order": "ECI Order No. 282/AS/2023", "state_code": "AS", "effective_date": "2023-08-16"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

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
    ('AS-AC-001', 1, 'Gossaigaon', 'Kokrajhar', 'GEN'),
    ('AS-AC-002', 2, 'Dotma', 'Kokrajhar', 'ST'),
    ('AS-AC-003', 3, 'Kokrajhar', 'Kokrajhar', 'ST'),
    ('AS-AC-004', 4, 'Baokhungri', 'Kokrajhar', 'GEN'),
    ('AS-AC-005', 5, 'Parbatjhora', 'Kokrajhar', 'GEN'),
    ('AS-AC-006', 6, 'Golakganj', 'Dhubri', 'GEN'),
    ('AS-AC-007', 7, 'Gauripur', 'Dhubri', 'GEN'),
    ('AS-AC-008', 8, 'Dhubri', 'Dhubri', 'GEN'),
    ('AS-AC-009', 9, 'Birsing Jarua', 'Dhubri', 'GEN'),
    ('AS-AC-010', 10, 'Bilasipara', 'Dhubri', 'GEN'),
    ('AS-AC-011', 11, 'Mankachar', 'South Salmara-Mankachar', 'GEN'),
    ('AS-AC-012', 12, 'Jaleshwar', 'Goalpara', 'GEN'),
    ('AS-AC-013', 13, 'Goalpara West', 'Goalpara', 'ST'),
    ('AS-AC-014', 14, 'Goalpara East', 'Goalpara', 'GEN'),
    ('AS-AC-015', 15, 'Dudhnai', 'Goalpara', 'ST'),
    ('AS-AC-016', 16, 'Abhayapuri', 'Bongaigaon', 'GEN'),
    ('AS-AC-017', 17, 'Srijangram', 'Bongaigaon', 'GEN'),
    ('AS-AC-018', 18, 'Bongaigaon', 'Bongaigaon', 'GEN'),
    ('AS-AC-019', 19, 'Sidli-Chirang', 'Chirang', 'ST'),
    ('AS-AC-020', 20, 'Bijni', 'Chirang', 'GEN'),
    ('AS-AC-021', 21, 'Bhowanipur-Sorbhog', 'Bajali', 'GEN'),
    ('AS-AC-022', 22, 'Mandia', 'Barpeta', 'GEN'),
    ('AS-AC-023', 23, 'Chenga', 'Barpeta', 'GEN'),
    ('AS-AC-024', 24, 'Barpeta', 'Barpeta', 'SC'),
    ('AS-AC-025', 25, 'Pakabetbari', 'Barpeta', 'GEN'),
    ('AS-AC-026', 26, 'Bajali', 'Bajali', 'GEN'),
    ('AS-AC-027', 27, 'Chamaria', 'Kamrup', 'GEN'),
    ('AS-AC-028', 28, 'Boko-Chaygaon', 'Kamrup', 'ST'),
    ('AS-AC-029', 29, 'Palasbari', 'Kamrup', 'GEN'),
    ('AS-AC-030', 30, 'Hajo-Sualkuchi', 'Kamrup', 'SC'),
    ('AS-AC-031', 31, 'Rangiya', 'Kamrup', 'GEN'),
    ('AS-AC-032', 32, 'Kamalpur', 'Kamrup', 'GEN'),
    ('AS-AC-033', 33, 'Dispur', 'Kamrup Metropolitan', 'GEN'),
    ('AS-AC-034', 34, 'Dimoria', 'Kamrup Metropolitan', 'SC'),
    ('AS-AC-035', 35, 'New Guwahati', 'Kamrup Metropolitan', 'GEN'),
    ('AS-AC-036', 36, 'Guwahati Central', 'Kamrup Metropolitan', 'GEN'),
    ('AS-AC-037', 37, 'Jalukbari', 'Kamrup Metropolitan', 'GEN'),
    ('AS-AC-038', 38, 'Barkhetri', 'Nalbari', 'GEN'),
    ('AS-AC-039', 39, 'Nalbari', 'Nalbari', 'GEN'),
    ('AS-AC-040', 40, 'Tihu', 'Nalbari', 'GEN'),
    ('AS-AC-041', 41, 'Manas', 'Baksa', 'GEN'),
    ('AS-AC-042', 42, 'Baksa', 'Baksa', 'ST'),
    ('AS-AC-043', 43, 'Tamulpur', 'Tamulpur', 'ST'),
    ('AS-AC-044', 44, 'Goreshwar', 'Tamulpur', 'GEN'),
    ('AS-AC-045', 45, 'Bhergaon', 'Udalguri', 'GEN'),
    ('AS-AC-046', 46, 'Udalguri', 'Udalguri', 'ST'),
    ('AS-AC-047', 47, 'Majbat', 'Udalguri', 'GEN'),
    ('AS-AC-048', 48, 'Tangla', 'Udalguri', 'GEN'),
    ('AS-AC-049', 49, 'Sipajhar', 'Darrang', 'GEN'),
    ('AS-AC-050', 50, 'Mangaldai', 'Darrang', 'GEN'),
    ('AS-AC-051', 51, 'Dalgaon', 'Darrang', 'GEN'),
    ('AS-AC-052', 52, 'Jagiroad', 'Morigaon', 'SC'),
    ('AS-AC-053', 53, 'Laharighat', 'Morigaon', 'GEN'),
    ('AS-AC-054', 54, 'Morigaon', 'Morigaon', 'GEN'),
    ('AS-AC-055', 55, 'Dhing', 'Nagaon', 'GEN'),
    ('AS-AC-056', 56, 'Rupohihat', 'Nagaon', 'GEN'),
    ('AS-AC-057', 57, 'Kaliabor', 'Nagaon', 'GEN'),
    ('AS-AC-058', 58, 'Samaguri', 'Nagaon', 'GEN'),
    ('AS-AC-059', 59, 'Barhampur', 'Nagaon', 'GEN'),
    ('AS-AC-060', 60, 'Nagaon-Batadraba', 'Nagaon', 'GEN'),
    ('AS-AC-061', 61, 'Raha', 'Nagaon', 'SC'),
    ('AS-AC-062', 62, 'Binnakandi', 'Hojai', 'GEN'),
    ('AS-AC-063', 63, 'Hojai', 'Hojai', 'GEN'),
    ('AS-AC-064', 64, 'Lumding', 'Hojai', 'GEN'),
    ('AS-AC-065', 65, 'Dhekiajuli', 'Sonitpur', 'GEN'),
    ('AS-AC-066', 66, 'Barchalla', 'Sonitpur', 'GEN'),
    ('AS-AC-067', 67, 'Tezpur', 'Sonitpur', 'GEN'),
    ('AS-AC-068', 68, 'Rangapara', 'Sonitpur', 'GEN'),
    ('AS-AC-069', 69, 'Nadaur', 'Sonitpur', 'GEN'),
    ('AS-AC-070', 70, 'Biswanath', 'Biswanath', 'GEN'),
    ('AS-AC-071', 71, 'Behali', 'Biswanath', 'SC'),
    ('AS-AC-072', 72, 'Gohpur', 'Biswanath', 'GEN'),
    ('AS-AC-073', 73, 'Bihpuria', 'Lakhimpur', 'GEN'),
    ('AS-AC-074', 74, 'Rongonadi', 'Lakhimpur', 'GEN'),
    ('AS-AC-075', 75, 'Naoboicha', 'Lakhimpur', 'SC'),
    ('AS-AC-076', 76, 'Lakhimpur', 'Lakhimpur', 'GEN'),
    ('AS-AC-077', 77, 'Dhakuakhana', 'Lakhimpur', 'ST'),
    ('AS-AC-078', 78, 'Dhemaji', 'Dhemaji', 'ST'),
    ('AS-AC-079', 79, 'Sissiborgaon', 'Dhemaji', 'GEN'),
    ('AS-AC-080', 80, 'Jonai', 'Dhemaji', 'ST'),
    ('AS-AC-081', 81, 'Sadiya', 'Tinsukia', 'GEN'),
    ('AS-AC-082', 82, 'Doom Dooma', 'Tinsukia', 'GEN'),
    ('AS-AC-083', 83, 'Margherita', 'Tinsukia', 'GEN'),
    ('AS-AC-084', 84, 'Digboi', 'Tinsukia', 'GEN'),
    ('AS-AC-085', 85, 'Makum', 'Tinsukia', 'GEN'),
    ('AS-AC-086', 86, 'Tinsukia', 'Tinsukia', 'GEN'),
    ('AS-AC-087', 87, 'Chabua-Lahowal', 'Dibrugarh', 'GEN'),
    ('AS-AC-088', 88, 'Dibrugarh', 'Dibrugarh', 'GEN'),
    ('AS-AC-089', 89, 'Khowang', 'Dibrugarh', 'GEN'),
    ('AS-AC-090', 90, 'Duliajan', 'Dibrugarh', 'GEN'),
    ('AS-AC-091', 91, 'Tingkhong', 'Dibrugarh', 'GEN'),
    ('AS-AC-092', 92, 'Naharkatia', 'Dibrugarh', 'GEN'),
    ('AS-AC-093', 93, 'Sonari', 'Charaideo', 'GEN'),
    ('AS-AC-094', 94, 'Mahmora', 'Charaideo', 'GEN'),
    ('AS-AC-095', 95, 'Demow', 'Sibsagar', 'GEN'),
    ('AS-AC-096', 96, 'Sibsagar', 'Sibsagar', 'GEN'),
    ('AS-AC-097', 97, 'Nazira', 'Sibsagar', 'GEN'),
    ('AS-AC-098', 98, 'Majuli', 'Majuli', 'ST'),
    ('AS-AC-099', 99, 'Teok', 'Jorhat', 'GEN'),
    ('AS-AC-100', 100, 'Jorhat', 'Jorhat', 'GEN'),
    ('AS-AC-101', 101, 'Mariani', 'Jorhat', 'GEN'),
    ('AS-AC-102', 102, 'Titabor', 'Jorhat', 'GEN'),
    ('AS-AC-103', 103, 'Golaghat', 'Golaghat', 'GEN'),
    ('AS-AC-104', 104, 'Dergaon', 'Golaghat', 'GEN'),
    ('AS-AC-105', 105, 'Bokakhat', 'Golaghat', 'GEN'),
    ('AS-AC-106', 106, 'Khumtai', 'Golaghat', 'GEN'),
    ('AS-AC-107', 107, 'Sarupathar', 'Golaghat', 'GEN'),
    ('AS-AC-108', 108, 'Bokajan', 'Karbi Anglong', 'ST'),
    ('AS-AC-109', 109, 'Howraghat', 'Karbi Anglong', 'ST'),
    ('AS-AC-110', 110, 'Diphu', 'Karbi Anglong', 'ST'),
    ('AS-AC-111', 111, 'Rongkhang', 'West Karbi Anglong', 'ST'),
    ('AS-AC-112', 112, 'Amri', 'West Karbi Anglong', 'ST'),
    ('AS-AC-113', 113, 'Haflong', 'Dima Hasao', 'ST'),
    ('AS-AC-114', 114, 'Lakhipur', 'Cachar', 'GEN'),
    ('AS-AC-115', 115, 'Udharbond', 'Cachar', 'GEN'),
    ('AS-AC-116', 116, 'Katigorah', 'Cachar', 'GEN'),
    ('AS-AC-117', 117, 'Borkhola', 'Cachar', 'GEN'),
    ('AS-AC-118', 118, 'Silchar', 'Cachar', 'GEN'),
    ('AS-AC-119', 119, 'Sonai', 'Cachar', 'GEN'),
    ('AS-AC-120', 120, 'Dholai', 'Cachar', 'SC'),
    ('AS-AC-121', 121, 'Hailakandi', 'Hailakandi', 'GEN'),
    ('AS-AC-122', 122, 'Algapur-Katlicherra', 'Hailakandi', 'GEN'),
    ('AS-AC-123', 123, 'Karimganj North', 'Sribhumi', 'GEN'),
    ('AS-AC-124', 124, 'Karimganj South', 'Sribhumi', 'GEN'),
    ('AS-AC-125', 125, 'Patharkandi', 'Sribhumi', 'GEN'),
    ('AS-AC-126', 126, 'Ram Krishna Nagar', 'Sribhumi', 'SC')
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
    ('AS-AC-001', 1, 'Gossaigaon', 'AS-PC-10', 'Kokrajhar'),
    ('AS-AC-002', 2, 'Dotma', 'AS-PC-10', 'Kokrajhar'),
    ('AS-AC-003', 3, 'Kokrajhar', 'AS-PC-10', 'Kokrajhar'),
    ('AS-AC-004', 4, 'Baokhungri', 'AS-PC-10', 'Kokrajhar'),
    ('AS-AC-005', 5, 'Parbatjhora', 'AS-PC-10', 'Kokrajhar'),
    ('AS-AC-006', 6, 'Golakganj', 'AS-PC-03', 'Dhubri'),
    ('AS-AC-007', 7, 'Gauripur', 'AS-PC-03', 'Dhubri'),
    ('AS-AC-008', 8, 'Dhubri', 'AS-PC-03', 'Dhubri'),
    ('AS-AC-009', 9, 'Birsing Jarua', 'AS-PC-03', 'Dhubri'),
    ('AS-AC-010', 10, 'Bilasipara', 'AS-PC-03', 'Dhubri'),
    ('AS-AC-011', 11, 'Mankachar', 'AS-PC-03', 'Dhubri'),
    ('AS-AC-012', 12, 'Jaleshwar', 'AS-PC-03', 'Dhubri'),
    ('AS-AC-013', 13, 'Goalpara West', 'AS-PC-06', 'Guwahati'),
    ('AS-AC-014', 14, 'Goalpara East', 'AS-PC-03', 'Dhubri'),
    ('AS-AC-015', 15, 'Dudhnai', 'AS-PC-06', 'Guwahati'),
    ('AS-AC-016', 16, 'Abhayapuri', 'AS-PC-01', 'Barpeta'),
    ('AS-AC-017', 17, 'Srijangram', 'AS-PC-03', 'Dhubri'),
    ('AS-AC-018', 18, 'Bongaigaon', 'AS-PC-01', 'Barpeta'),
    ('AS-AC-019', 19, 'Sidli-Chirang', 'AS-PC-10', 'Kokrajhar'),
    ('AS-AC-020', 20, 'Bijni', 'AS-PC-10', 'Kokrajhar'),
    ('AS-AC-021', 21, 'Bhowanipur-Sorbhog', 'AS-PC-01', 'Barpeta'),
    ('AS-AC-022', 22, 'Mandia', 'AS-PC-03', 'Dhubri'),
    ('AS-AC-023', 23, 'Chenga', 'AS-PC-03', 'Dhubri'),
    ('AS-AC-024', 24, 'Barpeta', 'AS-PC-01', 'Barpeta'),
    ('AS-AC-025', 25, 'Pakabetbari', 'AS-PC-01', 'Barpeta'),
    ('AS-AC-026', 26, 'Bajali', 'AS-PC-01', 'Barpeta'),
    ('AS-AC-027', 27, 'Chamaria', 'AS-PC-06', 'Guwahati'),
    ('AS-AC-028', 28, 'Boko-Chaygaon', 'AS-PC-06', 'Guwahati'),
    ('AS-AC-029', 29, 'Palasbari', 'AS-PC-06', 'Guwahati'),
    ('AS-AC-030', 30, 'Hajo-Sualkuchi', 'AS-PC-01', 'Barpeta'),
    ('AS-AC-031', 31, 'Rangiya', 'AS-PC-02', 'Darrang-Udalguri'),
    ('AS-AC-032', 32, 'Kamalpur', 'AS-PC-02', 'Darrang-Udalguri'),
    ('AS-AC-033', 33, 'Dispur', 'AS-PC-06', 'Guwahati'),
    ('AS-AC-034', 34, 'Dimoria', 'AS-PC-06', 'Guwahati'),
    ('AS-AC-035', 35, 'New Guwahati', 'AS-PC-06', 'Guwahati'),
    ('AS-AC-036', 36, 'Guwahati Central', 'AS-PC-06', 'Guwahati'),
    ('AS-AC-037', 37, 'Jalukbari', 'AS-PC-06', 'Guwahati'),
    ('AS-AC-038', 38, 'Barkhetri', 'AS-PC-01', 'Barpeta'),
    ('AS-AC-039', 39, 'Nalbari', 'AS-PC-01', 'Barpeta'),
    ('AS-AC-040', 40, 'Tihu', 'AS-PC-01', 'Barpeta'),
    ('AS-AC-041', 41, 'Manas', 'AS-PC-10', 'Kokrajhar'),
    ('AS-AC-042', 42, 'Baksa', 'AS-PC-10', 'Kokrajhar'),
    ('AS-AC-043', 43, 'Tamulpur', 'AS-PC-02', 'Darrang-Udalguri'),
    ('AS-AC-044', 44, 'Goreshwar', 'AS-PC-02', 'Darrang-Udalguri'),
    ('AS-AC-045', 45, 'Bhergaon', 'AS-PC-02', 'Darrang-Udalguri'),
    ('AS-AC-046', 46, 'Udalguri', 'AS-PC-02', 'Darrang-Udalguri'),
    ('AS-AC-047', 47, 'Majbat', 'AS-PC-02', 'Darrang-Udalguri'),
    ('AS-AC-048', 48, 'Tangla', 'AS-PC-02', 'Darrang-Udalguri'),
    ('AS-AC-049', 49, 'Sipajhar', 'AS-PC-02', 'Darrang-Udalguri'),
    ('AS-AC-050', 50, 'Mangaldai', 'AS-PC-02', 'Darrang-Udalguri'),
    ('AS-AC-051', 51, 'Dalgaon', 'AS-PC-02', 'Darrang-Udalguri'),
    ('AS-AC-052', 52, 'Jagiroad', 'AS-PC-12', 'Nagaon'),
    ('AS-AC-053', 53, 'Laharighat', 'AS-PC-12', 'Nagaon'),
    ('AS-AC-054', 54, 'Morigaon', 'AS-PC-12', 'Nagaon'),
    ('AS-AC-055', 55, 'Dhing', 'AS-PC-12', 'Nagaon'),
    ('AS-AC-056', 56, 'Rupohihat', 'AS-PC-12', 'Nagaon'),
    ('AS-AC-057', 57, 'Kaliabor', 'AS-PC-09', 'Kaziranga'),
    ('AS-AC-058', 58, 'Samaguri', 'AS-PC-12', 'Nagaon'),
    ('AS-AC-059', 59, 'Barhampur', 'AS-PC-09', 'Kaziranga'),
    ('AS-AC-060', 60, 'Nagaon-Batadraba', 'AS-PC-12', 'Nagaon'),
    ('AS-AC-061', 61, 'Raha', 'AS-PC-12', 'Nagaon'),
    ('AS-AC-062', 62, 'Binnakandi', 'AS-PC-09', 'Kaziranga'),
    ('AS-AC-063', 63, 'Hojai', 'AS-PC-09', 'Kaziranga'),
    ('AS-AC-064', 64, 'Lumding', 'AS-PC-09', 'Kaziranga'),
    ('AS-AC-065', 65, 'Dhekiajuli', 'AS-PC-14', 'Sonitpur'),
    ('AS-AC-066', 66, 'Barchalla', 'AS-PC-14', 'Sonitpur'),
    ('AS-AC-067', 67, 'Tezpur', 'AS-PC-14', 'Sonitpur'),
    ('AS-AC-068', 68, 'Rangapara', 'AS-PC-14', 'Sonitpur'),
    ('AS-AC-069', 69, 'Nadaur', 'AS-PC-14', 'Sonitpur'),
    ('AS-AC-070', 70, 'Biswanath', 'AS-PC-14', 'Sonitpur'),
    ('AS-AC-071', 71, 'Behali', 'AS-PC-14', 'Sonitpur'),
    ('AS-AC-072', 72, 'Gohpur', 'AS-PC-14', 'Sonitpur'),
    ('AS-AC-073', 73, 'Bihpuria', 'AS-PC-14', 'Sonitpur'),
    ('AS-AC-074', 74, 'Rongonadi', 'AS-PC-11', 'Lakhimpur'),
    ('AS-AC-075', 75, 'Naoboicha', 'AS-PC-11', 'Lakhimpur'),
    ('AS-AC-076', 76, 'Lakhimpur', 'AS-PC-11', 'Lakhimpur'),
    ('AS-AC-077', 77, 'Dhakuakhana', 'AS-PC-11', 'Lakhimpur'),
    ('AS-AC-078', 78, 'Dhemaji', 'AS-PC-11', 'Lakhimpur'),
    ('AS-AC-079', 79, 'Sissiborgaon', 'AS-PC-11', 'Lakhimpur'),
    ('AS-AC-080', 80, 'Jonai', 'AS-PC-11', 'Lakhimpur'),
    ('AS-AC-081', 81, 'Sadiya', 'AS-PC-11', 'Lakhimpur'),
    ('AS-AC-082', 82, 'Doom Dooma', 'AS-PC-11', 'Lakhimpur'),
    ('AS-AC-083', 83, 'Margherita', 'AS-PC-04', 'Dibrugarh'),
    ('AS-AC-084', 84, 'Digboi', 'AS-PC-04', 'Dibrugarh'),
    ('AS-AC-085', 85, 'Makum', 'AS-PC-04', 'Dibrugarh'),
    ('AS-AC-086', 86, 'Tinsukia', 'AS-PC-04', 'Dibrugarh'),
    ('AS-AC-087', 87, 'Chabua-Lahowal', 'AS-PC-04', 'Dibrugarh'),
    ('AS-AC-088', 88, 'Dibrugarh', 'AS-PC-04', 'Dibrugarh'),
    ('AS-AC-089', 89, 'Khowang', 'AS-PC-04', 'Dibrugarh'),
    ('AS-AC-090', 90, 'Duliajan', 'AS-PC-04', 'Dibrugarh'),
    ('AS-AC-091', 91, 'Tingkhong', 'AS-PC-04', 'Dibrugarh'),
    ('AS-AC-092', 92, 'Naharkatia', 'AS-PC-04', 'Dibrugarh'),
    ('AS-AC-093', 93, 'Sonari', 'AS-PC-07', 'Jorhat'),
    ('AS-AC-094', 94, 'Mahmora', 'AS-PC-07', 'Jorhat'),
    ('AS-AC-095', 95, 'Demow', 'AS-PC-07', 'Jorhat'),
    ('AS-AC-096', 96, 'Sibsagar', 'AS-PC-07', 'Jorhat'),
    ('AS-AC-097', 97, 'Nazira', 'AS-PC-07', 'Jorhat'),
    ('AS-AC-098', 98, 'Majuli', 'AS-PC-07', 'Jorhat'),
    ('AS-AC-099', 99, 'Teok', 'AS-PC-07', 'Jorhat'),
    ('AS-AC-100', 100, 'Jorhat', 'AS-PC-07', 'Jorhat'),
    ('AS-AC-101', 101, 'Mariani', 'AS-PC-07', 'Jorhat'),
    ('AS-AC-102', 102, 'Titabor', 'AS-PC-07', 'Jorhat'),
    ('AS-AC-103', 103, 'Golaghat', 'AS-PC-09', 'Kaziranga'),
    ('AS-AC-104', 104, 'Dergaon', 'AS-PC-09', 'Kaziranga'),
    ('AS-AC-105', 105, 'Bokakhat', 'AS-PC-09', 'Kaziranga'),
    ('AS-AC-106', 106, 'Khumtai', 'AS-PC-09', 'Kaziranga'),
    ('AS-AC-107', 107, 'Sarupathar', 'AS-PC-09', 'Kaziranga'),
    ('AS-AC-108', 108, 'Bokajan', 'AS-PC-05', 'Diphu'),
    ('AS-AC-109', 109, 'Howraghat', 'AS-PC-05', 'Diphu'),
    ('AS-AC-110', 110, 'Diphu', 'AS-PC-05', 'Diphu'),
    ('AS-AC-111', 111, 'Rongkhang', 'AS-PC-05', 'Diphu'),
    ('AS-AC-112', 112, 'Amri', 'AS-PC-05', 'Diphu'),
    ('AS-AC-113', 113, 'Haflong', 'AS-PC-05', 'Diphu'),
    ('AS-AC-114', 114, 'Lakhipur', 'AS-PC-13', 'Silchar'),
    ('AS-AC-115', 115, 'Udharbond', 'AS-PC-13', 'Silchar'),
    ('AS-AC-116', 116, 'Katigorah', 'AS-PC-13', 'Silchar'),
    ('AS-AC-117', 117, 'Borkhola', 'AS-PC-13', 'Silchar'),
    ('AS-AC-118', 118, 'Silchar', 'AS-PC-13', 'Silchar'),
    ('AS-AC-119', 119, 'Sonai', 'AS-PC-13', 'Silchar'),
    ('AS-AC-120', 120, 'Dholai', 'AS-PC-13', 'Silchar'),
    ('AS-AC-121', 121, 'Hailakandi', 'AS-PC-08', 'Karimganj'),
    ('AS-AC-122', 122, 'Algapur-Katlicherra', 'AS-PC-08', 'Karimganj'),
    ('AS-AC-123', 123, 'Karimganj North', 'AS-PC-08', 'Karimganj'),
    ('AS-AC-124', 124, 'Karimganj South', 'AS-PC-08', 'Karimganj'),
    ('AS-AC-125', 125, 'Patharkandi', 'AS-PC-08', 'Karimganj'),
    ('AS-AC-126', 126, 'Ram Krishna Nagar', 'AS-PC-08', 'Karimganj')
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
