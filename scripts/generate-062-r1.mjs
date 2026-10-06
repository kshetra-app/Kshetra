import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO_ROOT = process.cwd();
const auth062Path = path.join(REPO_ROOT, 'supabase', 'migrations', '062_canonical_assam_2023_delimitation.sql');
const authContent = fs.readFileSync(auth062Path, 'utf8');

// Replace Section 1
const origS1 = `INSERT INTO public.dataset_versions (
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
  source_uri = EXCLUDED.source_uri;`;

const newS1 = `-- Ensure statutory dataset eci_delimitation_order_2023_as exists in public.datasets
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
ON CONFLICT (id) DO NOTHING;`;

if (!authContent.includes(origS1)) {
  console.error('ERROR: original Section 1 not found in authContent');
  process.exit(1);
}

const r1Content = authContent.replace(origS1, newS1);

const r1Path = path.join(REPO_ROOT, 'supabase', 'staging_packages', '062-R1_canonical_assam_2023_delimitation.sql');
fs.writeFileSync(r1Path, r1Content, 'utf8');

const r1Hash = crypto.createHash('sha256').update(fs.readFileSync(r1Path)).digest('hex');
console.log('062-R1 package written successfully.');
console.log('Path:', r1Path);
console.log('Bytes:', Buffer.byteLength(r1Content, 'utf8'));
console.log('Lines:', r1Content.split('\\n').length);
console.log('SHA-256:', r1Hash);
