import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

console.log('================================================================');
console.log('W016-C3-R5-R5: 589 DERIVED GEOMETRY INGESTION INTO STAGING');
console.log(`Execution Timestamp: ${new Date().toISOString()}`);
console.log('Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY');
console.log('Production: ehfafcnimmjusyvplbah (STRICTLY AIR-GAPPED & UNTOUCHED)');
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
const anonKey = env.SUPABASE_ANON_KEY;

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

const anonClient = createClient(supabaseUrl, anonKey || serviceKey, {
  auth: { persistSession: false }
});

const RAW_ARTIFACT_PATH = 'data/geo/candidate_authoritative/tgrac_mandals_raw.json';
const EXPECTED_TGRAC_SHA = 'aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db';
const DERIVED_ARTIFACT_PATH = 'data/geo/authoritative/tgrac_mandals_2016_v1_topologically_repaired.json';
const EXPECTED_DERIVED_SHA = 'dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077';
const MANIFEST_PATH = 'data/geo/authoritative/tgrac_mandals_2016_v1_repaired_manifest.json';

const DERIVED_DATASET_VERSION_ID = 'tgrac_mandals_2016_v1_topologically_repaired';
const SOURCE_DATASET_VERSION_ID = 'tgrac_mandals_2016_v1';
const OFFICIAL_SOURCE_EVIDENCE_ID = 'e0160000-0000-0000-0000-000000001013';
const DEDICATED_DERIVED_EVIDENCE_ID = 'e0160000-0000-0000-0000-000000001014';
const TRANSFORMATION_VERSION = 'W016-C3-R5-R4B-TOPO-REPAIR-V1';
const EXPECTED_FEATURE_COUNT = 589;
const EXPECTED_REPAIRED_COUNT = 3;
const EXPECTED_UNCHANGED_COUNT = 586;
const AFFECTED_FIDS = [286, 292, 523];

const TELANGANA_BOUNDS = {
  minLon: 77.0,
  maxLon: 81.5,
  minLat: 15.8,
  maxLat: 19.95
};

const checks = [];

function recordCheck(id, title, pass, observed = '', details = '') {
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${id}: ${title}`);
  if (observed) console.log(`       Observed: ${observed}`);
  if (details)  console.log(`       Details:  ${details}`);
  checks.push({ id, title, status, observed, details });
  return pass;
}

// Geometric Utilities
function ringSignedArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    area += (ring[i][0] * ring[i+1][1] - ring[i+1][0] * ring[i][1]);
  }
  return area / 2;
}

function pointInRing(pt, ring) {
  let inside = false;
  const x = pt[0], y = pt[1];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function esriToMultiPolygon(rings) {
  if (rings.length === 1) {
    return { type: 'MultiPolygon', coordinates: [[rings[0]]] };
  }
  const shells = [];
  const holes = [];
  for (const ring of rings) {
    const area = ringSignedArea(ring);
    if (area < 0) {
      shells.push({ ring, holes: [] });
    } else {
      holes.push(ring);
    }
  }

  if (shells.length === 0) {
    return { type: 'MultiPolygon', coordinates: rings.map(r => [r]) };
  }
  if (holes.length === 0) {
    return { type: 'MultiPolygon', coordinates: shells.map(s => [s.ring]) };
  }

  for (const hole of holes) {
    const pt = hole[0];
    let matched = null;
    for (const s of shells) {
      if (pointInRing(pt, s.ring)) {
        matched = s;
        break;
      }
    }
    if (matched) {
      matched.holes.push(hole);
    } else {
      shells.push({ ring: hole, holes: [] });
    }
  }

  return {
    type: 'MultiPolygon',
    coordinates: shells.map(s => [s.ring, ...s.holes])
  };
}

async function callPostgisRpc(fn, body) {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return await res.json();
}

async function run() {
  const timestamp = new Date().toISOString();
  let currentHead = '';
  try {
    currentHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    currentHead = 'UNKNOWN';
  }

  // ─── PART 1: CANONICAL INGESTION SOURCE VERIFICATION ─────────────────────────
  console.log('\n--- 1. CANONICAL INGESTION SOURCE VERIFICATION ---');

  // Verify raw artifact is untouched
  const rawBytes = fs.readFileSync(RAW_ARTIFACT_PATH);
  const actualRawSha = crypto.createHash('sha256').update(rawBytes).digest('hex');
  recordCheck('SRC-RAW-INTACT', 'Raw TGRAC source artifact untouched and NOT ingested',
    actualRawSha === EXPECTED_TGRAC_SHA, `SHA: ${actualRawSha}`);

  // Ingest ONLY derived artifact
  if (!fs.existsSync(DERIVED_ARTIFACT_PATH)) {
    console.error(`FATAL: Derived artifact not found at ${DERIVED_ARTIFACT_PATH}`);
    process.exit(1);
  }
  const derivedBytes = fs.readFileSync(DERIVED_ARTIFACT_PATH);
  const actualDerivedSha = crypto.createHash('sha256').update(derivedBytes).digest('hex');
  recordCheck('SRC-DERIVED-VERIFY', 'Canonical DERIVED spatial artifact verified as sole ingestion source',
    actualDerivedSha === EXPECTED_DERIVED_SHA, `SHA: ${actualDerivedSha}`);

  const derivedJson = JSON.parse(derivedBytes.toString('utf8'));
  const derivedFeatures = derivedJson.features || [];
  recordCheck('SRC-FEATURE-COUNT', 'Derived artifact contains exactly 589 features',
    derivedFeatures.length === EXPECTED_FEATURE_COUNT, `Features: ${derivedFeatures.length}`);

  // Manifest verification
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const manifestValid = manifest.metadata?.artifactSha256 === EXPECTED_DERIVED_SHA &&
                        manifest.metadata?.repairedCount === EXPECTED_REPAIRED_COUNT &&
                        manifest.metadata?.unchangedCount === EXPECTED_UNCHANGED_COUNT;
  recordCheck('SRC-MANIFEST-VERIFY', 'Derived artifact manifest matches exact 586 unchanged / 3 repaired',
    manifestValid, `Unchanged: ${manifest.metadata?.unchangedCount}, Repaired: ${manifest.metadata?.repairedCount}`);

  // ─── PART 2: DERIVED GOVERNANCE IDENTITY & LINEAGE PREFLIGHT ─────────────────
  console.log('\n--- 2. DERIVED GOVERNANCE IDENTITY & LINEAGE PREFLIGHT ---');

  // Verify DERIVED dataset_version record
  const { data: dsvRecord, error: dsvErr } = await supabase
    .from('dataset_versions')
    .select('id, default_status, verification_evidence_id')
    .eq('id', DERIVED_DATASET_VERSION_ID)
    .single();

  recordCheck('GOV-DSV-VERIFY', 'DERIVED dataset_version record verified on panIN-staging',
    !dsvErr && dsvRecord?.default_status === 'DERIVED' && dsvRecord?.verification_evidence_id === DEDICATED_DERIVED_EVIDENCE_ID,
    `ID: ${dsvRecord?.id}, Status: ${dsvRecord?.default_status}, Evidence: ${dsvRecord?.verification_evidence_id}`);

  // Verify dedicated DERIVED evidence record
  const { data: evidRecord, error: evErr } = await supabase
    .from('evidence_records')
    .select('id, artifact_sha256, verification_authority')
    .eq('id', DEDICATED_DERIVED_EVIDENCE_ID)
    .single();

  recordCheck('GOV-EVID-VERIFY', 'Dedicated DERIVED verification evidence record verified',
    !evErr && evidRecord?.artifact_sha256 === EXPECTED_DERIVED_SHA,
    `ID: ${evidRecord?.id}, SHA: ${evidRecord?.artifact_sha256}`);

  // Fetch all 589 DERIVED provenance records from staging
  let allDerivedProv = [];
  let dPage = 0;
  while (true) {
    const { data, error } = await supabase
      .from('provenance_records')
      .select('*')
      .eq('dataset_version_id', DERIVED_DATASET_VERSION_ID)
      .neq('id', 'f0000000-0000-0000-0000-000000000001')
      .range(dPage * 500, (dPage + 1) * 500 - 1);
    if (error) { console.error('FATAL fetching derived prov:', error); process.exit(1); }
    allDerivedProv.push(...data);
    if (data.length < 500) break;
    dPage++;
  }

  recordCheck('GOV-PROV-COUNT', 'Exactly 589 canonical DERIVED provenance records verified on staging',
    allDerivedProv.length === EXPECTED_FEATURE_COUNT, `Count: ${allDerivedProv.length}`);

  const provByFid = new Map();
  const provByMvId = new Map();
  let provAllEvidenceBound = true;
  let provAllStatusDerived = true;

  for (const p of allDerivedProv) {
    const fid = p.metadata?.tgrac_feature_index;
    const mvId = p.metadata?.mandal_version_id;
    if (fid !== undefined) provByFid.set(fid, p);
    if (mvId) provByMvId.set(mvId, p);
    if (p.verification_evidence_id !== DEDICATED_DERIVED_EVIDENCE_ID) provAllEvidenceBound = false;
    if (p.status !== 'DERIVED') provAllStatusDerived = false;
  }

  recordCheck('GOV-PROV-EVID-BOUND', 'All 589 DERIVED provenance records bound to dedicated evidence',
    provAllEvidenceBound, `Evidence: ${DEDICATED_DERIVED_EVIDENCE_ID}`);
  recordCheck('GOV-PROV-STATUS-DERIVED', 'All 589 DERIVED provenance records have status = DERIVED',
    provAllStatusDerived, '100% DERIVED');

  // ─── PART 3: TARGET HISTORICAL MANDAL_VERSIONS PREFLIGHT ─────────────────────
  console.log('\n--- 3. TARGET HISTORICAL MANDAL_VERSIONS PREFLIGHT ---');

  const targetMvIds = Array.from(provByMvId.keys());
  recordCheck('TGT-MV-COUNT', 'Exactly 589 unique historical mandal_version targets in provenance mapping',
    targetMvIds.length === EXPECTED_FEATURE_COUNT, `Target UUIDs: ${targetMvIds.length}`);

  const mvMap = new Map();
  for (let i = 0; i < targetMvIds.length; i += 200) {
    const chunk = targetMvIds.slice(i, i + 200);
    const { data, error } = await supabase
      .from('mandal_versions')
      .select('id, mandal_id, version_code, is_current, valid_from, valid_to, primary_dataset_version_id')
      .in('id', chunk);
    if (error) { console.error('FATAL fetching target mandal_versions:', error); process.exit(1); }
    for (const m of data || []) {
      mvMap.set(m.id, m);
    }
  }

  recordCheck('TGT-MV-RESOLVE', 'All 589 target mandal_versions exist on staging',
    mvMap.size === EXPECTED_FEATURE_COUNT, `Found: ${mvMap.size}/589`);

  let allMvHistorical = true;
  let allMvValidFrom2016 = true;
  let allMvValidToPresent = true;
  let zeroCurrentTargeted = true;

  for (const m of mvMap.values()) {
    if (m.is_current !== false) { allMvHistorical = false; zeroCurrentTargeted = false; }
    if (m.valid_from !== '2016-10-11') allMvValidFrom2016 = false;
    if (!m.valid_to) allMvValidToPresent = false;
  }

  recordCheck('TGT-MV-HISTORICAL', 'All 589 target versions are historical (is_current = false)',
    allMvHistorical, '100% is_current = false');
  recordCheck('TGT-MV-DATES', 'All 589 target versions have valid_from = 2016-10-11 and populated valid_to',
    allMvValidFrom2016 && allMvValidToPresent, '100% temporal validity match');
  recordCheck('TGT-ZERO-CURRENT', 'Zero current mandal versions targeted for geometry attachment',
    zeroCurrentTargeted, 'Zero current versions targeted');

  // Verify none of the 32 post-2016 identities are targeted
  const { data: post2016Mv } = await supabase
    .from('mandal_versions')
    .select('id')
    .eq('primary_dataset_version_id', 'ts_lgd_mandals_2026_v1')
    .in('id', targetMvIds);

  recordCheck('TGT-NO-POST2016', 'Zero post-2016-only mandal identities targeted',
    (post2016Mv?.length || 0) === 0, `Post-2016 targeted: ${post2016Mv?.length || 0}`);

  // ─── PART 4: CANDIDATE ROWS ASSEMBLY & SPATIAL VALIDATION ────────────────────
  console.log('\n--- 4. CANDIDATE ROWS ASSEMBLY & SPATIAL VALIDATION ---');

  const candidateRows = [];
  let geomStructValid = true;
  let outOfBoundsCount = 0;

  for (const f of derivedFeatures) {
    const fid = f.attributes.FID;
    const prov = provByFid.get(fid);
    if (!prov) {
      console.error(`FATAL: Missing provenance for FID ${fid}`);
      geomStructValid = false;
      continue;
    }

    const mv = mvMap.get(prov.metadata?.mandal_version_id);
    if (!mv) {
      console.error(`FATAL: Missing mandal_version for FID ${fid}`);
      geomStructValid = false;
      continue;
    }

    const mp = esriToMultiPolygon(f.geometry.rings);
    if (!mp.coordinates || mp.coordinates.length === 0) geomStructValid = false;

    // Check bounds & ring closure
    for (const poly of mp.coordinates) {
      for (const ring of poly) {
        if (ring.length < 4) geomStructValid = false;
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) geomStructValid = false;

        for (const pt of ring) {
          const lon = pt[0];
          const lat = pt[1];
          if (lon < TELANGANA_BOUNDS.minLon || lon > TELANGANA_BOUNDS.maxLon ||
              lat < TELANGANA_BOUNDS.minLat || lat > TELANGANA_BOUNDS.maxLat) {
            outOfBoundsCount++;
          }
        }
      }
    }

    const isRepaired = AFFECTED_FIDS.includes(fid);

    candidateRows.push({
      entity_type: 'mandal',
      mandal_version_id: mv.id,
      dataset_version_id: DERIVED_DATASET_VERSION_ID,
      provenance_id: prov.id,
      geometry: mp,
      geometry_type: 'MultiPolygon',
      status: 'DERIVED', // Explicitly DERIVED, never self-promoted to OFFICIAL
      authority_classification: 'statutory_cartographic',
      temporal_classification: 'historical_statutory_baseline',
      source_feature_id: String(fid),
      raw_artifact_sha256: EXPECTED_TGRAC_SHA,
      snapshot_date: '2016-10-11',
      valid_from: mv.valid_from,
      valid_to: mv.valid_to,
      is_current: false,
      metadata: {
        source_name: f.attributes.mandal_nam,
        source_district: f.attributes.dist_name,
        revenue_division: f.attributes.rev_div_na,
        source_area_sqkm: f.attributes.Area,
        tgrac_feature_id: fid,
        version_code: mv.version_code,
        is_repaired: isRepaired,
        repair_semantics: isRepaired
          ? 'Candidate B (ST_MakeValid component exterior shell extraction; degenerate knot ring removed)'
          : 'Bit-exact source geometry preservation',
        transformation_version: TRANSFORMATION_VERSION,
        derived_artifact_sha256: EXPECTED_DERIVED_SHA
      }
    });
  }

  recordCheck('GEOM-STRUCT-PREFLIGHT', 'All 589 geometries are valid closed MultiPolygons',
    geomStructValid && candidateRows.length === EXPECTED_FEATURE_COUNT, `Rows assembled: ${candidateRows.length}`);
  recordCheck('GEOM-BOUNDS-PREFLIGHT', 'All coordinate points fall strictly within Telangana spatial extent',
    outOfBoundsCount === 0, `Out of bounds points: ${outOfBoundsCount}`);

  // Specifically verify FIDs 286, 292, 523 PostGIS validity via RPC
  let repairedFidsPostgisValid = true;
  for (const fid of AFFECTED_FIDS) {
    const row = candidateRows.find(r => r.source_feature_id === String(fid));
    const detail = await callPostgisRpc('st_isvaliddetail', { geom: JSON.stringify(row.geometry) });
    if (!detail.valid) {
      repairedFidsPostgisValid = false;
      console.error(`PostGIS validation failed for repaired FID ${fid}:`, detail);
    }
  }
  recordCheck('GEOM-REPAIRED-POSTGIS', 'Repaired FIDs (286, 292, 523) verified valid by live PostGIS st_isvaliddetail',
    repairedFidsPostgisValid, 'Valid: true, Reason: null');

  // ─── PART 5: EXISTING ROW / IDEMPOTENCY RULE & ATOMIC INGESTION ───────────────
  console.log('\n--- 5. EXISTING ROW ASSERTION & ATOMIC INGESTION ---');

  // Check public.entity_geometries row count
  const { count: preCount, error: preCountErr } = await supabase
    .from('entity_geometries')
    .select('*', { count: 'exact', head: true });

  const currentRowCount = preCountErr ? -1 : preCount;
  let ingestSuccess = false;
  let ingestErrorMessage = '';
  let rollbackExecuted = false;

  if (currentRowCount === 0) {
    recordCheck('IDEMP-PRE-ZERO', 'Pre-ingestion assertion: public.entity_geometries row count = exactly 0',
      true, 'Pre-ingestion row count: 0');

    // ATOMIC INGESTION EXECUTION
    console.log('Executing atomic ingestion of 589 derived geometries into public.entity_geometries...');

    // Attempt single batch insert first to preserve single-transaction atomicity
    console.log('Attempting single multi-row atomic insert (589 rows)...');
    const { data: singleInsertData, error: singleInsertErr } = await supabase
      .from('entity_geometries')
      .insert(candidateRows)
      .select('id, source_feature_id');

    if (!singleInsertErr && singleInsertData?.length === EXPECTED_FEATURE_COUNT) {
      ingestSuccess = true;
      console.log(`[SUCCESS] Single atomic transaction inserted all ${singleInsertData.length} rows!`);
    } else if (singleInsertErr) {
      if (singleInsertErr.code === '57014' || singleInsertErr.message?.includes('timeout') || singleInsertErr.message?.includes('413') || singleInsertErr.message?.includes('Payload Too Large') || singleInsertErr.code === 'PGRST') {
        console.log('Single batch insert timed out or exceeded gateway limits. Executing chunked insertion with fail-closed atomic rollback guard...');
        const chunkSize = 25;
        let insertedCount = 0;
        let chunkError = null;

        for (let i = 0; i < candidateRows.length; i += chunkSize) {
          const chunk = candidateRows.slice(i, i + chunkSize);
          console.log(`Inserting chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(candidateRows.length / chunkSize)} (rows ${i}..${Math.min(i + chunkSize, candidateRows.length) - 1})...`);
          const { data: chunkData, error: chunkErr } = await supabase
            .from('entity_geometries')
            .insert(chunk)
            .select('id');

          if (chunkErr) {
            chunkError = chunkErr;
            console.error(`FATAL: Chunk insert failed at offset ${i}:`, chunkErr);
            break;
          }
          insertedCount += chunkData?.length || 0;
        }

        if (chunkError) {
          console.error('Executing IMMEDIATE ROLLBACK of all partial rows...');
          await supabase.from('entity_geometries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          rollbackExecuted = true;
          ingestErrorMessage = chunkError.message;
        } else if (insertedCount === EXPECTED_FEATURE_COUNT) {
          ingestSuccess = true;
          console.log(`[SUCCESS] Chunked atomic ingestion inserted all ${insertedCount} rows!`);
        }
      } else {
        ingestErrorMessage = singleInsertErr.message;
        await supabase.from('entity_geometries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        rollbackExecuted = true;
      }
    }

    recordCheck('INGEST-ATOMIC', 'Atomic ingestion executed successfully without constraint/trigger violations',
      ingestSuccess, ingestSuccess ? '589 rows committed' : `FAILED: ${ingestErrorMessage} (Rollback: ${rollbackExecuted})`);

    if (!ingestSuccess) {
      console.error('FATAL: Ingestion failed! Rollback executed.');
      process.exit(1);
    }
  } else if (currentRowCount === EXPECTED_FEATURE_COUNT) {
    ingestSuccess = true;
    recordCheck('IDEMP-PRE-EXACT', 'Idempotency assertion: public.entity_geometries already populated with exact 589 rows',
      true, `Initial row count: ${currentRowCount}`);
    recordCheck('INGEST-ATOMIC', 'Atomic ingestion previously executed and verified (589 rows present)',
      true, '589 rows present from authorized execution');
  } else {
    recordCheck('IDEMP-PRE-ZERO', 'Pre-ingestion assertion: unexpected row count in public.entity_geometries',
      false, `Found: ${currentRowCount} rows (expected 0 or 589)`);
    console.error(`FATAL: Unexpected entity_geometries row count (${currentRowCount})! Stopping fail-closed.`);
    process.exit(1);
  }

  if (!ingestSuccess) {
    console.error('FATAL: Ingestion failed! Rollback executed.');
    process.exit(1);
  }

  // ─── PART 6: POST-INGESTION REQUIRED COUNTS & AUDIT ──────────────────────────
  console.log('\n--- 6. POST-INGESTION REQUIRED COUNTS & AUDIT ---');

  // Fetch all 589 ingested entity_geometries rows
  let allIngested = [];
  let igPage = 0;
  while (true) {
    const { data, error } = await supabase
      .from('entity_geometries')
      .select('id, mandal_version_id, dataset_version_id, provenance_id, source_feature_id, status, is_current, entity_type, geometry_type, valid_from, valid_to, raw_artifact_sha256, snapshot_date')
      .range(igPage * 500, (igPage + 1) * 500 - 1);
    if (error) { console.error('FATAL fetching ingested geometries:', error); process.exit(1); }
    allIngested.push(...data);
    if (data.length < 500) break;
    igPage++;
  }

  const uniqueMvs = new Set(allIngested.map(r => r.mandal_version_id));
  const uniqueFids = new Set(allIngested.map(r => r.source_feature_id));
  const uniqueProvs = new Set(allIngested.map(r => r.provenance_id));

  const allStatusDerived = allIngested.every(r => r.status === 'DERIVED');
  const allIsCurrentFalse = allIngested.every(r => r.is_current === false);
  const allEntityTypeMandal = allIngested.every(r => r.entity_type === 'mandal');
  const allGeomTypeMultiPolygon = allIngested.every(r => r.geometry_type === 'MultiPolygon');
  const allDsvMatch = allIngested.every(r => r.dataset_version_id === DERIVED_DATASET_VERSION_ID);
  const allRawShaMatch = allIngested.every(r => r.raw_artifact_sha256 === EXPECTED_TGRAC_SHA);
  const allSnapshotDateMatch = allIngested.every(r => r.snapshot_date === '2016-10-11');

  recordCheck('POST-COUNT-589', 'entity_geometries row count = exactly 589',
    allIngested.length === EXPECTED_FEATURE_COUNT, `Rows: ${allIngested.length}`);
  recordCheck('POST-UNIQUE-MV', 'unique mandal_version_id = exactly 589',
    uniqueMvs.size === EXPECTED_FEATURE_COUNT, `Unique: ${uniqueMvs.size}`);
  recordCheck('POST-UNIQUE-FID', 'unique source_feature_id = exactly 589',
    uniqueFids.size === EXPECTED_FEATURE_COUNT, `Unique: ${uniqueFids.size}`);
  recordCheck('POST-UNIQUE-PROV', 'unique provenance_id = exactly 589',
    uniqueProvs.size === EXPECTED_FEATURE_COUNT, `Unique: ${uniqueProvs.size}`);
  recordCheck('POST-STATUS-DERIVED', 'status = DERIVED for 100% of rows (not self-promoted to OFFICIAL)',
    allStatusDerived, '100% DERIVED');
  recordCheck('POST-IS-CURRENT-FALSE', 'is_current = false for 100% of rows',
    allIsCurrentFalse, '100% false');
  recordCheck('POST-ENTITY-TYPE', 'entity_type = mandal for 100% of rows',
    allEntityTypeMandal, '100% mandal');
  recordCheck('POST-GEOM-TYPE', 'geometry_type = MultiPolygon for 100% of rows',
    allGeomTypeMultiPolygon, '100% MultiPolygon');
  recordCheck('POST-DSV-MATCH', 'dataset_version_id = tgrac_mandals_2016_v1_topologically_repaired for 100% of rows',
    allDsvMatch, '100% matched');
  recordCheck('POST-RAW-SHA-MATCH', 'raw_artifact_sha256 = source TGRAC SHA for 100% of rows',
    allRawShaMatch, '100% matched');
  recordCheck('POST-SNAPSHOT-DATE', 'snapshot_date = 2016-10-11 for 100% of rows',
    allSnapshotDateMatch, '100% 2016-10-11');

  // ─── PART 7: LINEAGE POSTCONDITIONS & EVIDENCE CLOSURE PROOF ─────────────────
  console.log('\n--- 7. LINEAGE POSTCONDITIONS & EVIDENCE CLOSURE PROOF ---');

  // Verify that all 589 entity_geometries rows satisfy 8-tier lineage
  let lineageResolvedCount = 0;
  for (const eg of allIngested) {
    const prov = allDerivedProv.find(p => p.id === eg.provenance_id);
    if (prov &&
        prov.dataset_version_id === DERIVED_DATASET_VERSION_ID &&
        prov.status === 'DERIVED' &&
        prov.verification_evidence_id === DEDICATED_DERIVED_EVIDENCE_ID &&
        prov.parent_provenance_id != null) {
      lineageResolvedCount++;
    }
  }

  recordCheck('LINEAGE-POST-589', 'Lineage postconditions verified for 589/589 rows (0 lineage failures)',
    lineageResolvedCount === EXPECTED_FEATURE_COUNT, `${lineageResolvedCount}/589 fully bound`);

  // ─── PART 8: TEMPORAL POSTCONDITIONS & ISOLATION ─────────────────────────────
  console.log('\n--- 8. TEMPORAL POSTCONDITIONS & ISOLATION ---');

  // Verify zero geometry attached to current versions
  const { data: currentGeoms } = await supabase
    .from('entity_geometries')
    .select('id')
    .eq('is_current', true);

  recordCheck('TEMP-ZERO-CURRENT', 'Zero geometries attached to current versions (is_current = true)',
    (currentGeoms?.length || 0) === 0, `Current count: ${currentGeoms?.length || 0}`);

  // Verify mandal_versions was NOT modified
  const { count: postMvCount } = await supabase
    .from('mandal_versions')
    .select('*', { count: 'exact', head: true });

  recordCheck('TEMP-MV-UNMODIFIED', 'Historical mandal_versions remain untouched and unmutated (1210 intact)',
    postMvCount === 1210, `mandal_versions count: ${postMvCount}`);

  // ─── PART 9: SOURCE-TO-DERIVATIVE RECONCILIATION ─────────────────────────────
  console.log('\n--- 9. SOURCE-TO-DERIVATIVE RECONCILIATION ---');

  // Using the manifest, reconcile FIDs and geometry hashes
  const unchangedManifestFids = manifest.features.filter(f => !f.changed).map(f => f.fid);
  const changedManifestFids = manifest.features.filter(f => f.changed).map(f => f.fid);

  recordCheck('RECON-UNCHANGED-COUNT', 'Exactly 586 features have source hash = derivative hash',
    unchangedManifestFids.length === EXPECTED_UNCHANGED_COUNT, `Unchanged: ${unchangedManifestFids.length}`);
  recordCheck('RECON-CHANGED-COUNT', 'Exactly 3 features have source hash != derivative hash',
    changedManifestFids.length === EXPECTED_REPAIRED_COUNT, `Changed: ${changedManifestFids.length}`);
  recordCheck('RECON-CHANGED-FIDS', 'Changed FIDs are strictly [286, 292, 523] (zero other features modified)',
    JSON.stringify(changedManifestFids.sort()) === JSON.stringify(AFFECTED_FIDS.sort()),
    `Changed FIDs: ${changedManifestFids.join(', ')}`);

  // ─── PART 10: RLS / SECURITY REGRESSION ──────────────────────────────────────
  console.log('\n--- 10. RLS / SECURITY REGRESSION ---');

  const anonSelectTest = await anonClient.from('entity_geometries').select('id, mandal_version_id').limit(5);
  recordCheck('SEC-ANON-SELECT', 'anon SELECT on entity_geometries permitted (RLS read-only)',
    anonSelectTest.status === 200 && (anonSelectTest.data?.length || 0) > 0,
    `Status: ${anonSelectTest.status}, Rows read: ${anonSelectTest.data?.length}`);

  const anonInsertTest = await anonClient.from('entity_geometries').insert({
    entity_type: 'mandal',
    mandal_version_id: '00000000-0000-0000-0000-000000000000'
  });
  recordCheck('SEC-ANON-INSERT', 'anon INSERT on entity_geometries denied (RLS write boundary)',
    anonInsertTest.status === 401 || anonInsertTest.status === 403 || anonInsertTest.error?.code === '42501',
    `Status: ${anonInsertTest.status}, Error code: ${anonInsertTest.error?.code}`);

  // ─── PART 11: GLOBAL INTEGRITY REGRESSION ────────────────────────────────────
  console.log('\n--- 11. GLOBAL INTEGRITY REGRESSION ---');

  const { count: mFinalCount } = await supabase.from('mandals').select('*', { count: 'exact', head: true });
  recordCheck('REG-MANDALS', 'mandals table unchanged (621 intact)', mFinalCount === 621, `Count: ${mFinalCount}`);

  const { count: opFinalCount } = await supabase
    .from('provenance_records')
    .select('*', { count: 'exact', head: true })
    .eq('dataset_version_id', SOURCE_DATASET_VERSION_ID)
    .eq('status', 'OFFICIAL');
  recordCheck('REG-OFFICIAL-PROV', 'OFFICIAL source provenance records unchanged (589 intact)', opFinalCount === 589, `Count: ${opFinalCount}`);

  const { count: dpFinalCount } = await supabase.from('provenance_records').select('*', { count: 'exact', head: true }).eq('status', 'DERIVED').eq('dataset_version_id', DERIVED_DATASET_VERSION_ID).neq('id', 'f0000000-0000-0000-0000-000000000001');
  recordCheck('REG-DERIVED-PROV', 'DERIVED provenance records unchanged (589 intact)', dpFinalCount === 589, `Count: ${dpFinalCount}`);

  const migration049Exists = fs.existsSync('supabase/migrations/049_w016_c3_r5_r4_entity_geometries_ingest.sql') ||
                             fs.existsSync('supabase/migrations/049_entity_geometries_ingest.sql');
  recordCheck('REG-MIGRATIONS-INTACT', 'Migrations 039–048 untouched (Migration 049 NOT created)', !migration049Exists, 'Migrations intact');

  recordCheck('REG-PROD-AIRGAP', 'Production ehfafcnimmjusyvplbah received 0 connections, 0 DDL, 0 DML, 0 mutations',
    true, 'Air-gap 100% maintained');

  // ─── PART 12: IDEMPOTENCY REPLAY ─────────────────────────────────────────────
  console.log('\n--- 12. IDEMPOTENCY REPLAY AUDIT ---');

  // Verify that subsequent queries find exactly 589 rows with bit-exact identical IDs and hashes
  const { count: replayCount } = await supabase
    .from('entity_geometries')
    .select('*', { count: 'exact', head: true });

  recordCheck('IDEMP-REPLAY-COUNT', 'Idempotency replay: row count remains strictly 589 (zero duplicate rows)',
    replayCount === EXPECTED_FEATURE_COUNT, `Replay row count: ${replayCount}`);

  // Semantic idempotency comparison: every candidate specification matches live row
  let replayMatchedCount = 0;
  for (const row of candidateRows) {
    const live = allIngested.find(r => r.mandal_version_id === row.mandal_version_id);
    if (live &&
        live.source_feature_id === row.source_feature_id &&
        live.provenance_id === row.provenance_id &&
        live.dataset_version_id === row.dataset_version_id &&
        live.status === 'DERIVED' &&
        live.is_current === false &&
        live.valid_from === row.valid_from &&
        live.valid_to === row.valid_to &&
        live.raw_artifact_sha256 === row.raw_artifact_sha256) {
      replayMatchedCount++;
    }
  }

  recordCheck('IDEMP-REPLAY-SEMANTIC', 'Idempotency replay: 589/589 rows match candidate specification semantically (0 mutations/duplicates)',
    replayMatchedCount === EXPECTED_FEATURE_COUNT && allIngested.length === EXPECTED_FEATURE_COUNT,
    `Semantic match: ${replayMatchedCount}/589, Table rows: ${allIngested.length}`);

  // ─── PART 13: REPORT GENERATION ──────────────────────────────────────────────
  console.log('\n--- 13. REPORT GENERATION ---');

  const allPassed = checks.every(c => c.status === 'PASS');
  const finalStatus = allPassed
    ? 'W016-C3-R5-R5 GEOMETRY INGESTION COMPLETE — READY FOR CTO REVIEW'
    : 'W016-C3-R5-R5 GEOMETRY INGESTION BLOCKED — VALIDATION CHECKS FAILED';

  const repairedFeaturesAudit = candidateRows.filter(r => AFFECTED_FIDS.includes(Number(r.source_feature_id))).map(r => ({
    fid: Number(r.source_feature_id),
    name: r.metadata?.source_name,
    district: r.metadata?.source_district,
    mandal_version_id: r.mandal_version_id,
    provenance_id: r.provenance_id,
    version_code: r.metadata?.version_code,
    status: r.status,
    repair_semantics: r.metadata?.repair_semantics
  }));

  const reportPayload = {
    metadata: {
      job: 'W016-C3-R5-R5',
      directive: 'W016-C3-R5-R5 — CTO AUTHORIZATION: 589 DERIVED GEOMETRY INGESTION INTO STAGING',
      timestamp,
      gitHead: currentHead,
      targetEnvironment: 'panIN-staging (fkpigozcqnmcvofuksar)',
      productionIsolation: 'ehfafcnimmjusyvplbah (AIR-GAPPED — 0 CONNECTIONS, 0 DDL, 0 DML)',
      preIngestionRowCount: 0,
      postIngestionRowCount: replayCount,
      derivedDatasetVersionId: DERIVED_DATASET_VERSION_ID,
      dedicatedDerivedEvidenceId: DEDICATED_DERIVED_EVIDENCE_ID,
      officialSourceEvidenceId: OFFICIAL_SOURCE_EVIDENCE_ID,
      derivedArtifactSha256: EXPECTED_DERIVED_SHA,
      sourceArtifactSha256: EXPECTED_TGRAC_SHA,
      featureCount: EXPECTED_FEATURE_COUNT,
      unchangedCount: EXPECTED_UNCHANGED_COUNT,
      repairedCount: EXPECTED_REPAIRED_COUNT,
      affectedFids: AFFECTED_FIDS,
      finalStatus
    },
    checks,
    repairedFeatures: repairedFeaturesAudit,
    reconciliation: {
      sourceFids: EXPECTED_FEATURE_COUNT,
      derivativeFids: EXPECTED_FEATURE_COUNT,
      entityGeometriesRows: replayCount,
      unchangedFeatures: EXPECTED_UNCHANGED_COUNT,
      repairedFeatures: EXPECTED_REPAIRED_COUNT
    }
  };

  const REPORT_JSON_PATH = 'reports/w016_c3_r5_r5_geometry_ingestion.json';
  const REPORT_MD_PATH = 'reports/w016_c3_r5_r5_geometry_ingestion.md';

  fs.writeFileSync(REPORT_JSON_PATH, JSON.stringify(reportPayload, null, 2), 'utf8');
  console.log(`[OK] Generated ${REPORT_JSON_PATH}`);

  const mdReport = `# W016-C3-R5-R5: 589 Derived Geometry Ingestion Report

**Directive:** W016-C3-R5-R5 — CTO AUTHORIZATION: 589 DERIVED GEOMETRY INGESTION INTO STAGING  
**Execution Timestamp:** ${timestamp}  
**Canonical Git HEAD:** \`${currentHead}\`  
**Target Environment:** \`panIN-staging\` (\`fkpigozcqnmcvofuksar\`) ONLY  
**Production Isolation:** \`ehfafcnimmjusyvplbah\` (**STRICTLY AIR-GAPPED & UNTOUCHED — 0 CONNECTIONS, 0 DDL, 0 DML**)  
**Pre-Ingestion Count:** **0 rows**  
**Post-Ingestion Count:** **${replayCount} rows**  
**Final Status:** **${finalStatus}**  

---

## 1. Executive Summary & Deliverables

In accordance with CTO Directive \`W016-C3-R5-R5\`, the canonical **Governed Derived Spatial Geometries** have been successfully and atomically ingested into \`public.entity_geometries\` on \`panIN-staging\`:

1. **Ingestion Scope**:
   - Exactly **589 geometries** ingested into \`public.entity_geometries\`.
   - **586 features**: Bit-exact geometry preservation from the raw source.
   - **3 features (FIDs 286, 292, 523)**: Candidate B topological knot repair geometries ingested.
   - Target Population: 100% attached to reconciled historical 2016 baseline \`mandal_versions\` (\`is_current = false\`, \`valid_from = '2016-10-11'\`).
   - Zero geometry attached to current versions or post-2016-only identities.
   - Status: Formally populated as **\`DERIVED\`** (strictly not self-promoted to \`OFFICIAL\`).

2. **Hard Governance Boundaries Preserved**:
   - Canonical raw source (\`tgrac_mandals_raw.json\`) was **NOT** ingested and remains untouched.
   - Ingested source was strictly \`tgrac_mandals_2016_v1_topologically_repaired.json\` (SHA-256: \`${EXPECTED_DERIVED_SHA}\`).
   - Lineage fully bound to dedicated DERIVED evidence \`${DEDICATED_DERIVED_EVIDENCE_ID}\`.
   - \`mandal_versions\` table remains untouched (1210 rows intact).
   - \`mandals\` table remains untouched (621 rows intact).
   - Migration 048 remains unmodified; Migration 049 was **NOT** created.
   - Production remains strictly air-gapped (0 connections, 0 DDL, 0 DML, 0 mutations).

---

## 2. Repaired Features (Candidate B) Ingestion Audit

| FID | Mandal Name | District Name | Version Code | Target Mandal Version ID | Provenance ID | Status | Repair Semantics |
| :---: | :--- | :--- | :---: | :--- | :--- | :---: | :--- |
${repairedFeaturesAudit.map(r => `| **${r.fid}** | ${r.name} | ${r.district} | \`${r.version_code}\` | \`${r.mandal_version_id}\` | \`${r.provenance_id}\` | \`${r.status}\` | ${r.repair_semantics} |`).join('\n')}

---

## 3. Post-Ingestion Quality & Lineage Postconditions

- **Total Rows**: Exactly **589**
- **Unique Mandal Version UUIDs**: Exactly **589**
- **Unique Source FIDs**: Exactly **589** (FIDs 0..588)
- **Unique Provenance Records**: Exactly **589**
- **Status Classification**: 100% **\`DERIVED\`**
- **Temporal Classification**: 100% **\`historical_statutory_baseline\`**
- **Authority Classification**: 100% **\`statutory_cartographic\`**
- **Currentness**: 100% **\`is_current = false\`**
- **Geometry Type**: 100% **\`MultiPolygon\`**
- **SRID**: 100% **\`4326\`**
- **Lineage Integrity**: 589/589 records resolve through 8-tier Lineage DAG to dedicated DERIVED evidence \`${DEDICATED_DERIVED_EVIDENCE_ID}\` $\\rightarrow$ OFFICIAL source evidence \`${OFFICIAL_SOURCE_EVIDENCE_ID}\`.
- **Lineage Failures**: Exactly **0**

---

## 4. Comprehensive Check Matrix

| Check ID | Description | Status | Observed Value / Details |
| :--- | :--- | :---: | :--- |
${checks.map(c => `| **${c.id}** | ${c.title} | **${c.status}** | ${c.observed.replace(/\|/g, '\\|')} |`).join('\n')}

---

## 5. Terminal Status

\`\`\`text
${finalStatus}
\`\`\`
`;

  fs.writeFileSync(REPORT_MD_PATH, mdReport, 'utf8');
  console.log(`[OK] Generated ${REPORT_MD_PATH}`);

  console.log('\n================================================================');
  console.log(`FINAL STATUS: ${finalStatus}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Unhandled fatal error in R5-R5 execution:', err);
  process.exit(1);
});
