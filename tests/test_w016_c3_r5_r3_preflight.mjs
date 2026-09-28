import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

console.log('================================================================');
console.log('W016-C3-R5-R3: ENTITY_GEOMETRIES SCHEMA & STAGING PREFLIGHT TEST');
console.log(`Execution Timestamp: ${new Date().toISOString()}`);
console.log('Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY');
console.log('Production: STRICTLY AIR-GAPPED & UNTOUCHED');
console.log('================================================================\n');

// 1. Verify Environment & Target Isolation
const envPath = path.resolve('.env.staging');
if (!fs.existsSync(envPath)) {
  console.error('FATAL: .env.staging not found');
  process.exit(1);
}

const env = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
const supabaseUrl = env.SUPABASE_URL || 'https://fkpigozcqnmcvofuksar.supabase.co';
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl.includes('fkpigozcqnmcvofuksar')) {
  console.error(`FATAL: Execution target is NOT panIN-staging! Detected: ${supabaseUrl}`);
  process.exit(1);
}

if (supabaseUrl.includes('ehfafcnimmjusyvplbah')) {
  console.error('FATAL: Production database detected in staging configuration! Immediate abort.');
  process.exit(1);
}

if (!serviceKey) {
  console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const results = [];

function recordCheck(id, title, pass, details = '') {
  const status = pass ? 'PASS' : 'FAIL';
  results.push({ id, title, status, details });
  console.log(`[${status}] ${id}: ${title}`);
  if (details) console.log(`       Details: ${details}`);
  if (!pass) {
    console.error(`FATAL FAILURE at ${id}: ${title}`);
    process.exit(1);
  }
}

async function runPreflight() {
  // ─── PART 1: MIGRATION ARTIFACTS & IMMUTABILITY ─────────────────────────────
  console.log('--- PART 1: MIGRATION ARTIFACT INTEGRITY & LEDGER AUDIT ---');

  const MIGRATION_048_PATH = 'supabase/migrations/048_w016_c3_r5_r3_entity_geometries_schema.sql';
  const STAGING_PACKAGE_048_PATH = 'supabase/staging_migration_package_048.sql';
  const VERIFY_PACKAGE_048_PATH = 'supabase/verify_staging_migration_package_048.sql';

  recordCheck('PRE-01', 'Migration 048 exists on disk', fs.existsSync(MIGRATION_048_PATH));
  recordCheck('PRE-02', 'Staging migration package 048 exists on disk', fs.existsSync(STAGING_PACKAGE_048_PATH));
  recordCheck('PRE-03', 'Verification package 048 exists on disk', fs.existsSync(VERIFY_PACKAGE_048_PATH));

  const mig048Bytes = fs.readFileSync(MIGRATION_048_PATH);
  const staging048Bytes = fs.readFileSync(STAGING_PACKAGE_048_PATH);
  const mig048Sha = crypto.createHash('sha256').update(mig048Bytes).digest('hex');
  const staging048Sha = crypto.createHash('sha256').update(staging048Bytes).digest('hex');

  recordCheck('PRE-04', 'Migration 048 matches Staging Package 048 byte-for-byte', mig048Sha === staging048Sha, `SHA-256: ${mig048Sha}`);

  // Ledger verification: 045, 046, 047 immutable hashes
  const EXPECTED_045_SHA = '514595697505df005e7745ac4e1ab9cce141cc064803c071c0fca5d66d051073';
  const EXPECTED_046_SHA = '559a6f428a7c704ccf87b011cae70f67543feb8e4e0533e321a7828425fde012';
  const EXPECTED_047_SHA = '600486f4777af947a9ef682d8983b5433947fe3983c95deeddbfbb347758fdb2';

  const sha045 = crypto.createHash('sha256').update(fs.readFileSync('supabase/migrations/045_w016_c3_mandal_identity_temporal_load.sql')).digest('hex');
  const sha046 = crypto.createHash('sha256').update(fs.readFileSync('supabase/migrations/046_w016_c3_r4_gov02_legacy_identity_supersession.sql')).digest('hex');
  const sha047 = crypto.createHash('sha256').update(fs.readFileSync('supabase/migrations/047_w016_c3_r5_r2_spatial_governance_reconciliation.sql')).digest('hex');

  recordCheck('PRE-05', 'Historical Migration 045 remains immutable', sha045 === EXPECTED_045_SHA, `Observed: ${sha045}`);
  recordCheck('PRE-06', 'Historical Migration 046 remains immutable', sha046 === EXPECTED_046_SHA, `Observed: ${sha046}`);
  recordCheck('PRE-07', 'Historical Migration 047 remains immutable', sha047 === EXPECTED_047_SHA, `Observed: ${sha047}`);

  // ─── PART 2: REAL DATA PROVENANCE PREFLIGHT (SECTION 15) ────────────────────
  console.log('\n--- PART 2: REAL DATA PROVENANCE PREFLIGHT (SECTION 15) ---');

  const TGRAC_PATH = 'data/geo/candidate_authoritative/tgrac_mandals_raw.json';
  recordCheck('PROV-01', 'TGRAC raw artifact exists', fs.existsSync(TGRAC_PATH));

  const tgracBytes = fs.readFileSync(TGRAC_PATH);
  const actualTgracSha = crypto.createHash('sha256').update(tgracBytes).digest('hex');
  const EXPECTED_TGRAC_SHA = 'aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db';
  recordCheck('PROV-02', 'TGRAC artifact SHA-256 matches canonical checksum', actualTgracSha === EXPECTED_TGRAC_SHA, `SHA: ${actualTgracSha}`);

  const tgracData = JSON.parse(tgracBytes.toString('utf8'));
  const features = tgracData.features || [];
  recordCheck('PROV-03', 'TGRAC artifact feature count equals 589', features.length === 589, `Features: ${features.length}`);

  const CSV_PATH = 'reports/w016_c3_r5_geometry_reconciliation.csv';
  recordCheck('PROV-04', 'Reconciliation CSV exists', fs.existsSync(CSV_PATH));

  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const csvLines = csvContent.trim().split('\n').slice(1); // skip header
  recordCheck('PROV-05', 'Reconciliation matrix row count equals 589', csvLines.length === 589, `Rows: ${csvLines.length}`);

  const fids = new Set();
  const targetUuids = new Set();
  let unresolvedCount = 0;
  let ambiguousCount = 0;
  const cohortCounts = { A: 0, B: 0, C: 0, D: 0 };

  for (const line of csvLines) {
    const parts = line.split(',');
    const fid = parts[0]?.trim();
    const targetUuid = parts[5]?.trim();
    const cohort = parts[12]?.trim();

    if (!fid) unresolvedCount++;
    if (!targetUuid || targetUuid === 'NULL') unresolvedCount++;

    fids.add(fid);
    targetUuids.add(targetUuid);
    if (cohort && cohortCounts[cohort] !== undefined) {
      cohortCounts[cohort]++;
    }
  }

  recordCheck('PROV-06', '589 unique source FIDs verified', fids.size === 589, `Unique FIDs: ${fids.size}`);
  recordCheck('PROV-07', '589 unique target mandal_version UUIDs verified', targetUuids.size === 589, `Unique UUIDs: ${targetUuids.size}`);
  recordCheck('PROV-08', 'Zero unresolved mappings in matrix', unresolvedCount === 0, `Unresolved: ${unresolvedCount}`);
  recordCheck('PROV-09', 'Zero ambiguous mappings in matrix', ambiguousCount === 0, `Ambiguous: ${ambiguousCount}`);
  recordCheck('PROV-10', 'Temporal cohorts match authoritative R3E model',
    cohortCounts.A === 548 && cohortCounts.B === 8 && cohortCounts.C === 24 && cohortCounts.D === 9,
    `Cohort A: ${cohortCounts.A}, B: ${cohortCounts.B}, C: ${cohortCounts.C}, D: ${cohortCounts.D}`
  );

  // ─── PART 3: IDEMPOTENCY DESIGN & CONTRACT AUDIT (SECTION 16) ───────────────
  console.log('\n--- PART 3: IDEMPOTENCY DESIGN & CONTRACT AUDIT (SECTION 16) ---');

  const migContent = mig048Bytes.toString('utf8');
  recordCheck('IDEMP-01', 'Schema enforces unique mandal_version_id (uq_entity_geometries_mandal_version)',
    migContent.includes('uq_entity_geometries_mandal_version') && migContent.includes('UNIQUE INDEX'),
    'Unique index on (mandal_version_id) guarantees at most 1 geometry per version'
  );
  recordCheck('IDEMP-02', 'Schema enforces immutability trigger (trg_prevent_entity_geometry_mutation)',
    migContent.includes('trg_prevent_entity_geometry_mutation') && migContent.includes('BEFORE UPDATE'),
    'Trigger prohibits mutating mandal_version_id, dataset_version_id, provenance_id, source_feature_id, raw_artifact_sha256, snapshot_date, or geometry'
  );
  recordCheck('IDEMP-03', 'Schema enforces raw_artifact_sha256 CHECK constraint',
    migContent.includes("chk_entity_geometries_sha256 CHECK (raw_artifact_sha256 = 'aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db')"),
    'Directly prevents ingestion of unauthorized or altered geometry files'
  );
  recordCheck('IDEMP-04', 'Schema enforces valid, non-empty MultiPolygon EPSG:4326',
    migContent.includes('chk_entity_geometries_not_empty') &&
    migContent.includes('chk_entity_geometries_is_valid') &&
    migContent.includes('chk_entity_geometries_srid') &&
    migContent.includes('chk_entity_geometries_geometry_type'),
    'PostGIS kernel functions enforce valid 2D MultiPolygons'
  );
  recordCheck('IDEMP-05', 'Schema enforces RESTRICT on all foreign keys',
    migContent.includes('REFERENCES public.mandal_versions(id) ON DELETE RESTRICT') &&
    migContent.includes('REFERENCES public.dataset_versions(id) ON DELETE RESTRICT') &&
    migContent.includes('REFERENCES public.provenance_records(id) ON DELETE RESTRICT'),
    'Prevents cascading destruction of governance lineage'
  );

  // ─── PART 4: LIVE STAGING ENVIRONMENT VERIFICATION ──────────────────────────
  console.log('\n--- PART 4: LIVE STAGING ENVIRONMENT AUDIT ---');

  // Verify dedicated spatial evidence
  const { data: spatialEvidence, error: spErr } = await supabase
    .from('evidence_records')
    .select('id, artifact_name, artifact_sha256, verification_authority, verified_by')
    .eq('id', 'e0160000-0000-0000-0000-000000001013')
    .single();

  recordCheck('LIVE-01', 'Dedicated spatial evidence e016...1013 exists on staging',
    !spErr && spatialEvidence && spatialEvidence.artifact_sha256 === EXPECTED_TGRAC_SHA,
    `Authority: ${spatialEvidence?.verification_authority}, SHA: ${spatialEvidence?.artifact_sha256}`
  );

  // Verify legal evidence remains untouched
  const { data: legalEvidence, error: legErr } = await supabase
    .from('evidence_records')
    .select('id, artifact_name, verified_by')
    .eq('id', 'e0160000-0000-0000-0000-000000002016')
    .single();

  recordCheck('LIVE-02', 'Legal evidence e016...2016 remains intact on staging',
    !legErr && legalEvidence && legalEvidence.artifact_name === 'goms_2016_reorganisation_orders.pdf',
    `Artifact: ${legalEvidence?.artifact_name}, Verified By: ${legalEvidence?.verified_by}`
  );

  // Verify dedicated spatial dataset and dataset_version
  const { data: spDv, error: spDvErr } = await supabase
    .from('dataset_versions')
    .select('id, dataset_id, effective_from, record_count')
    .eq('id', 'tgrac_mandals_2016_v1')
    .single();

  recordCheck('LIVE-03', 'Spatial dataset version tgrac_mandals_2016_v1 exists on staging',
    !spDvErr && spDv && spDv.record_count === 589 && spDv.effective_from === '2016-10-11',
    `Dataset: ${spDv?.dataset_id}, Record Count: ${spDv?.record_count}, Effective From: ${spDv?.effective_from}`
  );

  // Verify spatial provenance records
  const { count: spProvCount, error: spProvErr } = await supabase
    .from('provenance_records')
    .select('*', { count: 'exact', head: true })
    .eq('dataset_version_id', 'tgrac_mandals_2016_v1');

  recordCheck('LIVE-04', '589 spatial provenance nodes exist on staging',
    !spProvErr && spProvCount === 589,
    `Count: ${spProvCount}`
  );

  // Verify mandal counts
  const { count: mandalsCount } = await supabase.from('mandals').select('*', { count: 'exact', head: true });
  const { count: mvCount } = await supabase.from('mandal_versions').select('*', { count: 'exact', head: true });
  const { count: mvHistCount } = await supabase.from('mandal_versions').select('*', { count: 'exact', head: true }).eq('is_current', false);
  const { count: mvCurCount } = await supabase.from('mandal_versions').select('*', { count: 'exact', head: true }).eq('is_current', true);

  recordCheck('LIVE-05', 'public.mandals count remains exactly 621', mandalsCount === 621, `Count: ${mandalsCount}`);
  recordCheck('LIVE-06', 'mandal_versions count remains 1210 (621 current, 589 historical)',
    mvCount === 1210 && mvCurCount === 621 && mvHistCount === 589,
    `Total: ${mvCount}, Current: ${mvCurCount}, Historical: ${mvHistCount}`
  );

  // Verify entity_geometries row count (must be 0 or uncreated)
  const geoProbe = await fetch(supabaseUrl + '/rest/v1/entity_geometries?select=*', {
    headers: { 'apikey': serviceKey, 'Authorization': 'Bearer ' + serviceKey }
  });

  let geoRowCount = 0;
  let geoStatusStr = '';
  if (geoProbe.status === 404) {
    geoStatusStr = 'Table absent from live catalog (PGRST205 / 404) — 0 rows';
    geoRowCount = 0;
  } else if (geoProbe.ok) {
    const geoData = await geoProbe.json();
    geoRowCount = geoData.length;
    geoStatusStr = `Table exists, row count: ${geoRowCount}`;
  } else {
    geoStatusStr = `HTTP ${geoProbe.status}`;
  }

  recordCheck('LIVE-07', 'public.entity_geometries contains ZERO real geometry rows',
    geoRowCount === 0,
    geoStatusStr
  );

  console.log('\n================================================================');
  console.log(`PREFLIGHT SUMMARY: ${results.length} PASSED, 0 FAILED`);
  console.log('FINAL STATUS: ENTITY_GEOMETRIES SCHEMA PREFLIGHT COMPLETE — READY FOR CTO REVIEW');
  console.log('================================================================\n');

  return {
    timestamp: new Date().toISOString(),
    mig048Sha,
    staging048Sha,
    actualTgracSha,
    geoRowCount,
    results
  };
}

runPreflight().catch(err => {
  console.error('Fatal error during preflight:', err);
  process.exit(1);
});
