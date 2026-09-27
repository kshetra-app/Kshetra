import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// RFC 4122 UUIDv5 implementation
function uuidv5(name, namespace) {
  const ns = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const n = Buffer.from(name, 'utf8');
  const hash = crypto.createHash('sha1').update(Buffer.concat([ns, n])).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString('hex', 0, 16);
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32)
  ].join('-');
}

const NS_PROVENANCE = 'e0160000-0000-0000-0000-000000000002';
const NS_LINKAGES = 'e0160000-0000-0000-0000-000000000003';

const csvPath = path.resolve('reports/w016_c3_r5_geometry_reconciliation.csv');
const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
const header = lines[0].split(',');
const rows = lines.slice(1).map(l => {
  const parts = l.split(',');
  const obj = {};
  header.forEach((h, i) => obj[h.trim()] = parts[i]?.trim());
  return obj;
});

console.log(`Loaded ${rows.length} reconciliation records from ${csvPath}`);

const SPATIAL_EVIDENCE_ID = 'e0160000-0000-0000-0000-000000001013';
const SPATIAL_ARTIFACT_SHA = 'aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db';
const SPATIAL_DATASET_ID = 'geo_mandal_boundaries';
const SPATIAL_DATASET_VERSION_ID = 'tgrac_mandals_2016_v1';

let sql = `-- =============================================================================
-- Migration 047: W016-C3-R5-R2 Spatial Evidence & Dataset Governance Reconciliation
-- Execution Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- Production: STRICTLY AIR-GAPPED & UNTOUCHED
--
-- Objective:
-- Establish dedicated W012 spatial evidence, dedicated spatial dataset & version,
-- and 589 spatial provenance nodes for the preserved TGRAC 589-feature geometry artifact.
--
-- Strict Governance Bounds:
-- 1. ZERO GEOMETRY ROWS INSERTED.
-- 2. ZERO MODIFICATION to public.mandals or public.mandal_versions.
-- 3. ZERO MODIFICATION to existing legal evidence e0160000-0000-0000-0000-000000002016.
-- 4. ZERO MUTATION of existing baseline dataset ts_lgd_mandals_2016_v1.
-- 5. Strict append-only idempotency via ON CONFLICT (id) DO NOTHING.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 1: Register Dedicated W012 Spatial Evidence Record
-- -----------------------------------------------------------------------------
INSERT INTO public.evidence_records (
  id,
  dataset_version_id,
  artifact_name,
  artifact_sha256,
  verification_authority,
  verified_by,
  verification_notes,
  verified_at,
  created_at
) VALUES (
  '${SPATIAL_EVIDENCE_ID}',
  NULL,
  'tgrac_mandals_raw.json',
  '${SPATIAL_ARTIFACT_SHA}',
  'Telangana State Remote Sensing Applications Centre (TGRAC / TRAC), Planning Department, Government of Telangana',
  'CTO / Spatial Cadastral Ingest Verification',
  'Authoritative 589-feature cartographic geometry source representing the 2016-10-11 statutory baseline spatial snapshot in EPSG:4326',
  '2026-09-24 16:51:45+05:30',
  now()
) ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Step 2: Register Primary Data Source in public.data_sources
-- -----------------------------------------------------------------------------
INSERT INTO public.data_sources (
  id,
  name,
  publisher,
  authority_level,
  canonical_url,
  license,
  retrieval_method,
  refresh_frequency,
  is_active,
  metadata
) VALUES (
  'tgrac',
  'Telangana State Remote Sensing Applications Centre (TGRAC)',
  'Planning Department, Government of Telangana',
  'statutory',
  'https://tgrac.telangana.gov.in',
  'Government Open Data / Scientific GIS Reference',
  'arcgis_rest_api',
  'administrative_restructuring',
  true,
  '{"nodal_agency": "TGRAC / TRAC", "department": "Planning Department", "role": "State Nodal Spatial Mapping Agency"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Step 3: Register Dedicated Spatial Dataset
-- -----------------------------------------------------------------------------
INSERT INTO public.datasets (
  id,
  name,
  domain,
  description,
  source_id,
  license,
  created_at,
  updated_at
) VALUES (
  '${SPATIAL_DATASET_ID}',
  'Telangana Mandal Boundaries GeoJSON',
  'geography',
  'Authoritative cartographic mandal boundaries for Telangana state published by TGRAC.',
  'tgrac',
  'Government Open Data / Scientific GIS Reference',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Step 4: Register Dedicated Spatial Dataset Version (OFFICIAL)
-- -----------------------------------------------------------------------------
INSERT INTO public.dataset_versions (
  id,
  dataset_id,
  version_tag,
  effective_from,
  effective_to,
  retrieved_at,
  record_count,
  checksum_sha256,
  storage_path,
  default_status,
  verification_evidence_id,
  metadata,
  created_at
) VALUES (
  '${SPATIAL_DATASET_VERSION_ID}',
  '${SPATIAL_DATASET_ID}',
  '2016_v1',
  '2016-10-11',
  NULL,
  '2026-09-24 16:51:45+05:30',
  589,
  '${SPATIAL_ARTIFACT_SHA}',
  'data/geo/candidate_authoritative/tgrac_mandals_raw.json',
  'OFFICIAL',
  '${SPATIAL_EVIDENCE_ID}',
  '{"snapshot_date": "2016-10-11", "spatial_reference": "EPSG:4326", "feature_count": 589, "authority": "TGRAC / TRAC, Planning Department, Government of Telangana", "source_service_url": "https://tgrac.telangana.gov.in/arcgis/rest/services/DistrictFormation_Folder/DistrictFormation/MapServer/13/query?where=1=1&outFields=*&returnGeometry=true&f=json", "temporal_scope": "Historical statutory baseline spatial snapshot as of 2016-10-11; feature-level legal validity governed independently by mandal_versions temporal columns."}'::jsonb,
  now()
) ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Step 5: Register 589 Spatial Provenance Nodes (OFFICIAL)
-- -----------------------------------------------------------------------------
INSERT INTO public.provenance_records (
  id,
  dataset_version_id,
  source_record_id,
  parent_provenance_id,
  status,
  transformation_type,
  transform_version,
  operator,
  verified_by,
  verification_evidence_id,
  metadata,
  created_at
) VALUES
`;

const provValues = rows.map((r, idx) => {
  const provId = uuidv5('spatial:' + r.historical_version_code, NS_PROVENANCE);
  const metadata = JSON.stringify({
    lineage_type: 'spatial_cadastral',
    tgrac_feature_index: parseInt(r.tgrac_feature_id, 10),
    source_name: r.source_name,
    source_district: r.source_district,
    mandal_version_id: r.historical_mandal_version_id,
    version_code: r.historical_version_code,
    stable_mandal_id: r.canonical_stable_mandal_id,
    spatial_reference: 'EPSG:4326',
    snapshot_date: '2016-10-11'
  }).replace(/'/g, "''");

  return `  ('${provId}', '${SPATIAL_DATASET_VERSION_ID}', '${r.historical_version_code}', NULL, 'OFFICIAL', 'spatial_cadastral_ingest', '1.0', 'cto', 'CTO / Spatial Cadastral Ingest Verification', '${SPATIAL_EVIDENCE_ID}', '${metadata}'::jsonb, now())`;
});

sql += provValues.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n\n';

sql += `-- -----------------------------------------------------------------------------
-- Step 6: Register 589 Record Provenance Linkages (Secondary Non-Canonical Linkage)
-- -----------------------------------------------------------------------------
INSERT INTO public.record_provenance_linkages (
  id,
  domain_table,
  domain_record_id,
  provenance_id,
  is_canonical,
  created_at
) VALUES
`;

const linkValues = rows.map(r => {
  const provId = uuidv5('spatial:' + r.historical_version_code, NS_PROVENANCE);
  const linkId = uuidv5('spatial_link:' + r.historical_version_code, NS_LINKAGES);
  return `  ('${linkId}', 'mandal_versions', '${r.historical_mandal_version_id}', '${provId}', false, now())`;
});

sql += linkValues.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n';

const outPath = path.resolve('supabase/migrations/047_w016_c3_r5_r2_spatial_governance_reconciliation.sql');
fs.writeFileSync(outPath, sql, 'utf8');

const stat = fs.statSync(outPath);
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(outPath)).digest('hex');

console.log(`Generated migration 047 at ${outPath}`);
console.log(`Size: ${stat.size} bytes`);
console.log(`SHA-256: ${sha256}`);
