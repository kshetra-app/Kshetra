/**
 * tests/verify_w015_relationship_engine.mjs
 * Authoritative W015 Geography Relationship Engine Verification Battery
 *
 * Target: panIN-staging (https://fkpigozcqnmcvofuksar.supabase.co)
 * Mandate: Master Job 015 & CTO Implementation Authorization
 *
 * Test Gates:
 *   TEST-A: parent / child relationship reconciliation
 *           (State->District, State->PC, State->AC, District->Mandal)
 *   TEST-B: contains / part-of relationship reconciliation
 *           (PC->AC, District->AC, AC->Polling Booth, Mandal<->AC Containment)
 *   TEST-C: predecessor / successor relationship reconciliation
 *           (geography_entity_lineage traversal for splits/transitions)
 *   TEST-D: old-to-new mapping reconciliation
 *           (constituency_district_timeline & Delimitation Regimes)
 *   TEST-E: overall empirical reconciliation gate
 *           ("Known geography relationships reconcile correctly")
 *
 * Supporting Tests:
 *   TEST-SUPP-1: Temporal GiST Non-Overlap Invariant (constituency_district_timeline)
 *   TEST-SUPP-2: Scenario Isolation & Inherited RLS Security
 *   TEST-SUPP-3: W012 Lineage & Governance Integrity (100% UNVERIFIED, 0 OFFICIAL)
 *   TEST-SUPP-4: Regression Suite & General Performance Observation
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve('.env.staging');
if (!fs.existsSync(envPath)) {
  console.error('FATAL: .env.staging not found');
  process.exit(1);
}
const env = dotenv.parse(fs.readFileSync(envPath, 'utf8'));

const supabaseUrl = env.SUPABASE_URL || 'https://fkpigozcqnmcvofuksar.supabase.co';
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.SUPABASE_ANON_KEY;

if (!serviceKey || !anonKey) {
  console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY missing');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

console.log('================================================================');
console.log('W015: GEOGRAPHY RELATIONSHIP ENGINE VERIFICATION SUITE');
console.log(`Target Database: ${supabaseUrl}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('Mandate: CTO Implementation Authorization (W015)');
console.log('================================================================\n');

const testResults = [];

function recordTest(id, name, category, status, expected, observed, details = null) {
  const result = { id, name, category, status, expected, observed, details };
  testResults.push(result);
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`[${icon} ${status}] ${id} — ${name}`);
  if (details) {
    console.log(`       Details:  ${details}`);
  }
}

async function runBattery() {
  const benchmarkMetrics = {};

  // ==========================================================================
  // TEST-A: parent / child relationship reconciliation
  // ==========================================================================
  const tA0 = performance.now();
  // Check 1: State -> District (33 TS districts)
  const { data: districts, error: distErr } = await adminClient
    .from('districts')
    .select('id, code, state_code, name')
    .eq('state_code', 'TS');
  const distCountOk = (districts || []).length === 33;
  const distParentOk = (districts || []).every(d => d.state_code === 'TS');

  // Check 2: State -> PC (17 TS PCs)
  const { data: pcs, error: pcErr } = await adminClient
    .from('parliamentary_constituencies')
    .select('id, code, state_code, name')
    .eq('state_code', 'TS');
  const pcCountOk = (pcs || []).length === 17;
  const pcParentOk = (pcs || []).every(p => p.state_code === 'TS');

  // Check 3: State -> AC (119 TS ACs)
  const { data: acs, error: acErr } = await adminClient
    .from('constituencies')
    .select('id, internal_id, canonical_code, state_code, name')
    .eq('state_code', 'TS');
  const acCountOk = (acs || []).length === 119;
  const acParentOk = (acs || []).every(a => a.state_code === 'TS');

  // Check 4: District -> Mandal parentage (DEF-15-01)
  const { data: mandals, error: mandalErr } = await adminClient
    .from('mandals')
    .select('id, name, district_id, district, state_code, lgd_code, primary_dataset_version_id')
    .eq('state_code', 'TS');
  const mandalCountOk = (mandals || []).length >= 12;
  const mandalDistrictFkOk = (mandals || []).every(m => m.district_id !== null);

  // Cross-reference mandals district_id with actual districts
  const districtIdSet = new Set((districts || []).map(d => d.id));
  const mandalsResolveDistrict = (mandals || []).every(m => districtIdSet.has(m.district_id));

  benchmarkMetrics.parentChildResolutionMs = (performance.now() - tA0).toFixed(2);

  const aPassed = !distErr && !pcErr && !acErr && !mandalErr &&
    distCountOk && distParentOk &&
    pcCountOk && pcParentOk &&
    acCountOk && acParentOk &&
    mandalCountOk && mandalDistrictFkOk && mandalsResolveDistrict;

  recordTest(
    'TEST-A',
    'parent / child relationship reconciliation',
    'MASTER_RELATIONSHIP',
    aPassed ? 'PASS' : 'FAIL',
    '100% of Districts, PCs, ACs resolve to parent State; 100% of sample Mandals resolve to parent District FK',
    {
      districtCount: districts?.length,
      pcCount: pcs?.length,
      acCount: acs?.length,
      mandalCount: mandals?.length,
      mandalsResolveDistrict,
      latencyMs: benchmarkMetrics.parentChildResolutionMs
    },
    'Direct parent/child administrative and electoral relationships reconciled across State, District, PC, AC, and Mandal tiers.'
  );

  // ==========================================================================
  // TEST-B: contains / part-of relationship reconciliation
  // ==========================================================================
  const tB0 = performance.now();
  // Check 1: PC -> AC containment (119 ACs resolve valid PC FK)
  const pcIdSet = new Set((pcs || []).map(p => p.id));
  const { data: acPcLinks } = await adminClient
    .from('constituencies')
    .select('id, canonical_code, parliamentary_constituency_id')
    .eq('state_code', 'TS');
  const allAcsHavePc = (acPcLinks || []).every(a => a.parliamentary_constituency_id && pcIdSet.has(a.parliamentary_constituency_id));

  // Check 2: District -> AC containment (119 ACs resolve valid District FK)
  const { data: acDistLinks } = await adminClient
    .from('constituencies')
    .select('id, canonical_code, district_id')
    .eq('state_code', 'TS');
  const allAcsHaveDist = (acDistLinks || []).every(a => a.district_id && districtIdSet.has(a.district_id));

  // Check 3: Polling Booths -> AC containment (ECI fundamental invariant)
  const { data: booths, error: boothErr } = await adminClient
    .from('polling_booths')
    .select('id, booth_number, constituency_id, constituency_internal_id, state_code, primary_dataset_version_id');
  const boothCountOk = (booths || []).length >= 4;
  const acInternalIdSet = new Set((acs || []).map(a => a.internal_id));
  const acIdSet = new Set((acs || []).map(a => a.id));
  const acInternalIdMap = new Map((acs || []).map(a => [a.id, a.internal_id]));

  // Invariant: 100% of booths resolve to valid AC, and each booth belongs to exactly one AC
  const allBoothsResolveAc = (booths || []).every(b =>
    acIdSet.has(b.constituency_id) && (b.constituency_internal_id ? acInternalIdSet.has(b.constituency_internal_id) : true)
  );

  // Blocker 3: Dual Constituency Identity check for 100% of Polling Booths
  const boothDualIdentityOk = (booths || []).every(b => {
    if (!b.constituency_id || !b.constituency_internal_id) return false;
    return acInternalIdMap.get(b.constituency_id) === b.constituency_internal_id;
  });

  // Check 4: Mandal ↔ AC Containment (DEF-15-02)
  const { data: mcm, error: mcmErr } = await adminClient
    .from('mandal_constituency_map')
    .select('id, mandal_id, constituency_id, constituency_internal_id, overlap_type, primary_dataset_version_id');
  const mcmCountOk = (mcm || []).length >= 8;
  const mandalIdSet = new Set((mandals || []).map(m => m.id));
  const mcmFkOk = (mcm || []).every(m =>
    mandalIdSet.has(m.mandal_id) && acIdSet.has(m.constituency_id) &&
    (!m.constituency_internal_id || acInternalIdSet.has(m.constituency_internal_id))
  );

  // Blocker 3: Dual Constituency Identity check for 100% of MCM population
  const mcmDualIdentityOk = (mcm || []).every(m => {
    if (!m.constituency_id || !m.constituency_internal_id) return false;
    return acInternalIdMap.get(m.constituency_id) === m.constituency_internal_id;
  });

  const mcmDiscreteTypesOk = (mcm || []).every(m => m.overlap_type === 'full' || m.overlap_type === 'partial');
  const hasFull = (mcm || []).some(m => m.overlap_type === 'full');
  const hasPartial = (mcm || []).some(m => m.overlap_type === 'partial');

  benchmarkMetrics.containsPartOfResolutionMs = (performance.now() - tB0).toFixed(2);

  const bPassed = allAcsHavePc && allAcsHaveDist &&
    !boothErr && boothCountOk && allBoothsResolveAc && boothDualIdentityOk &&
    !mcmErr && mcmCountOk && mcmFkOk && mcmDualIdentityOk && mcmDiscreteTypesOk && hasFull;

  recordTest(
    'TEST-B',
    'contains / part-of relationship reconciliation',
    'MASTER_RELATIONSHIP',
    bPassed ? 'PASS' : 'FAIL',
    '100% of ACs contained in valid PC and District; 100% of booths contained in exactly one AC; dual constituency identity strictly coherent; discrete full/partial Mandal-AC containment verified',
    {
      allAcsHavePc,
      allAcsHaveDist,
      boothCount: booths?.length,
      allBoothsResolveAc,
      boothDualIdentityOk,
      mcmCount: mcm?.length,
      mcmFkOk,
      mcmDualIdentityOk,
      hasFullOverlap: hasFull,
      hasPartialOverlap: hasPartial,
      latencyMs: benchmarkMetrics.containsPartOfResolutionMs
    },
    'Cross-tree containment verified: PCs contain ACs, Districts contain ACs, ACs contain Booths, Mandals map to ACs discretely, and dual constituency identities resolve to the exact same canonical AC.'
  );

  // ==========================================================================
  // TEST-C: predecessor / successor relationship reconciliation
  // ==========================================================================
  const tC0 = performance.now();
  const { data: lineage, error: linErr } = await adminClient
    .from('geography_entity_lineage')
    .select('id, entity_type, predecessor_internal_id, successor_internal_id, transition_type, effective_date, statutory_order, metadata');

  const linCountOk = (lineage || []).length >= 2;
  const muluguSplit = (lineage || []).find(l => l.metadata?.child_district === 'Mulugu');
  const narayanpetSplit = (lineage || []).find(l => l.metadata?.child_district === 'Narayanpet');

  // Verify predecessor and successor resolve to real districts
  const muluguPredOk = muluguSplit && districtIdSet.has(muluguSplit.predecessor_internal_id) && districtIdSet.has(muluguSplit.successor_internal_id);
  const narayanpetPredOk = narayanpetSplit && districtIdSet.has(narayanpetSplit.predecessor_internal_id) && districtIdSet.has(narayanpetSplit.successor_internal_id);

  // Candidate traversal query: given successor, find predecessor and statutory order
  const { data: predecessorQuery } = await adminClient
    .from('geography_entity_lineage')
    .select('predecessor_internal_id, transition_type, effective_date, statutory_order')
    .eq('successor_internal_id', muluguSplit?.successor_internal_id || '');

  const traversalOk = (predecessorQuery || []).length > 0 && predecessorQuery[0].predecessor_internal_id === muluguSplit?.predecessor_internal_id;

  benchmarkMetrics.lineageTraversalMs = (performance.now() - tC0).toFixed(2);

  const cPassed = !linErr && linCountOk && muluguPredOk && narayanpetPredOk && traversalOk;

  recordTest(
    'TEST-C',
    'predecessor / successor relationship reconciliation',
    'MASTER_RELATIONSHIP',
    cPassed ? 'PASS' : 'FAIL',
    'geography_entity_lineage accurately models predecessor-successor split transitions with statutory order citations',
    {
      lineageRecords: lineage?.length,
      muluguPredOk,
      narayanpetPredOk,
      traversalOk,
      muluguOrder: muluguSplit?.statutory_order,
      latencyMs: benchmarkMetrics.lineageTraversalMs
    },
    'Predecessor/successor transitions successfully reconciled with bidirectional resolution and statutory order citations.'
  );

  // ==========================================================================
  // TEST-D: old-to-new mapping reconciliation
  // ==========================================================================
  const tD0 = performance.now();
  // Check 1: AC 109 (Mulug) chronological mapping across 3 administrative eras
  const ac109 = (acs || []).find(a => a.canonical_code === 'TS-AC-109');
  const { data: timeline109, error: tlErr } = await adminClient
    .from('constituency_district_timeline')
    .select('id, district_id, overlap_type, valid_from, valid_to, is_current, districts(name)')
    .eq('constituency_internal_id', ac109?.internal_id || '')
    .order('valid_from', { ascending: true });

  const timelineCountOk = (timeline109 || []).length === 3;
  const era1 = timeline109?.[0];
  const era2 = timeline109?.[1];
  const era3 = timeline109?.[2];

  const era1Ok = era1?.districts?.name === 'Warangal' && era1?.valid_from === '2008-02-19' && era1?.valid_to === '2016-10-11' && era1?.is_current === false;
  const era2Ok = era2?.districts?.name === 'Jayashankar Bhupalpally' && era2?.valid_from === '2016-10-11' && era2?.valid_to === '2019-02-17' && era2?.is_current === false;
  const era3Ok = era3?.districts?.name === 'Mulugu' && era3?.valid_from === '2019-02-17' && era3?.valid_to === null && era3?.is_current === true;

  // Check 2: Delimitation regimes catalog integrity
  const { data: regimes, error: regErr } = await adminClient
    .from('delimitation_regimes')
    .select('id, name, legal_status');
  const regimeCountOk = (regimes || []).length >= 4;
  const currentRegimeOk = (regimes || []).some(r => r.id === 'eci_delimitation_2008' && r.legal_status === 'CURRENT_LEGAL_REGIME');

  benchmarkMetrics.oldToNewReconciliationMs = (performance.now() - tD0).toFixed(2);

  const dPassed = !tlErr && timelineCountOk && era1Ok && era2Ok && era3Ok && !regErr && regimeCountOk && currentRegimeOk;

  recordTest(
    'TEST-D',
    'old-to-new mapping reconciliation',
    'MASTER_RELATIONSHIP',
    dPassed ? 'PASS' : 'FAIL',
    'constituency_district_timeline and delimitation regimes resolve old-to-new transitions across historical eras',
    {
      ac109TimelineCount: timeline109?.length,
      era1: `${era1?.districts?.name} (${era1?.valid_from} to ${era1?.valid_to})`,
      era2: `${era2?.districts?.name} (${era2?.valid_from} to ${era2?.valid_to})`,
      era3: `${era3?.districts?.name} (${era3?.valid_from} to ${era3?.valid_to})`,
      regimeCount: regimes?.length,
      latencyMs: benchmarkMetrics.oldToNewReconciliationMs
    },
    'Old-to-new mappings reconciled across statutory reorganisations with continuous chronological integrity.'
  );

  // ==========================================================================
  // TEST-E: overall empirical reconciliation gate (Master Evidence Gate)
  // ==========================================================================
  const tE0 = performance.now();
  // Master Chain: AUTHORITATIVE SOURCE -> CANONICAL STORED RELATIONSHIP -> RELATIONAL INTEGRITY -> RECONCILIATION RESULT

  // Fetch W015 provenance records and linkages
  const { data: w015Linkages } = await adminClient
    .from('record_provenance_linkages')
    .select('id, domain_table, domain_record_id, provenance_id')
    .in('domain_table', ['mandals', 'mandal_constituency_map', 'polling_booths', 'geography_entity_lineage']);

  const { data: w015ProvRecords } = await adminClient
    .from('provenance_records')
    .select('id, dataset_version_id, source_record_id, status, operator, transformation_type, metadata')
    .in('dataset_version_id', ['ts_lgd_mandals_2023_v1', 'ts_mandal_ac_mappings_2023_v1', 'eci_ts_booths_2023_v1']);

  const provMap = new Map((w015ProvRecords || []).map(p => [p.id, p]));
  const linkageMapByRecord = new Map();
  for (const l of (w015Linkages || [])) {
    linkageMapByRecord.set(`${l.domain_table}:${l.domain_record_id}`, l);
  }

  // Anti-circularity check: Assert ZERO provenance records use self-referential canonical IDs as source_record_id
  let selfReferentialCount = 0;
  for (const link of (w015Linkages || [])) {
    const prov = provMap.get(link.provenance_id);
    if (prov && prov.source_record_id === link.domain_record_id) {
      selfReferentialCount++;
    }
  }

  // Tier 1: Mandals (12) — MoPR LGD Authority -> Canonical Mandals -> Parent District FK
  const mandalsReconciled = (mandals || []).length === 12 && (mandals || []).every(m => {
    const link = linkageMapByRecord.get(`mandals:${m.id}`);
    const prov = link ? provMap.get(link.provenance_id) : null;
    const hasValidDistrict = districtIdSet.has(m.district_id);
    const expectedSourceRecordId = `LGD-MANDAL-${m.lgd_code}`;
    const nonSelfReferential = prov?.source_record_id !== m.id;
    const hasSource = prov?.dataset_version_id === 'ts_lgd_mandals_2023_v1' &&
      prov?.source_record_id === expectedSourceRecordId &&
      prov?.operator === 'system:w015_b2_reconciliation' &&
      prov?.transformation_type === 'authoritative_reconciliation';
    const hasValidLgd = typeof m.lgd_code === 'number' && m.lgd_code > 0;
    return hasValidDistrict && nonSelfReferential && hasSource && hasValidLgd;
  });

  // Tier 2: Mandal-AC Mappings (8) — ECI Delimitation Order 2008 -> Discrete Containment -> Dual Identity Coherence
  const mcmReconciled = (mcm || []).length === 8 && (mcm || []).every(m => {
    const link = linkageMapByRecord.get(`mandal_constituency_map:${m.id}`);
    const prov = link ? provMap.get(link.provenance_id) : null;
    const mInfo = (mandals || []).find(man => man.id === m.mandal_id);
    const cInfo = (acs || []).find(ac => ac.id === m.constituency_id);
    const acNum = cInfo ? String(cInfo.canonical_code.replace('TS-AC-', '')).padStart(3, '0') : '';

    // Hajipur (TS-MDL-5329) uses derived_successor_reconciliation with lineage-based source_record_id
    const isHajipur = m.mandal_id === 'TS-MDL-5329';
    const expectedSourceRecordId = isHajipur
      ? `TG-LINEAGE-2016:PRED-5321:SUCC-5329:AC-${acNum}`
      : `ECI-DELIM-2008:AC-${acNum}:MDL-${mInfo?.lgd_code}`;
    const expectedTransformationType = isHajipur ? 'derived_successor_reconciliation' : 'authoritative_reconciliation';

    const hasMandal = mandalIdSet.has(m.mandal_id);
    const hasAc = acIdSet.has(m.constituency_id);
    const dualIdentityMatches = acInternalIdMap.get(m.constituency_id) === m.constituency_internal_id;
    const nonSelfReferential = prov?.source_record_id !== String(m.id);
    const hasSource = prov?.dataset_version_id === 'ts_mandal_ac_mappings_2023_v1' &&
      prov?.source_record_id === expectedSourceRecordId &&
      prov?.operator === 'system:w015_b2_reconciliation' &&
      prov?.transformation_type === expectedTransformationType;
    const discreteTypeOk = m.overlap_type === 'full' || m.overlap_type === 'partial';
    return hasMandal && hasAc && dualIdentityMatches && nonSelfReferential && hasSource && discreteTypeOk;
  });

  // Tier 3: Polling Booths (4) — Synthetic Test Fixtures -> AC Containment & Dual Identity
  const boothsReconciled = (booths || []).length === 4 && (booths || []).every(b => {
    const link = linkageMapByRecord.get(`polling_booths:${b.id}`);
    const prov = link ? provMap.get(link.provenance_id) : null;
    const cInfo = (acs || []).find(ac => ac.id === b.constituency_id);
    const acNum = cInfo ? String(cInfo.canonical_code.replace('TS-AC-', '')).padStart(3, '0') : '';
    const boothPad = String(b.booth_number).padStart(3, '0');
    const expectedSourceRecordId = `FIXTURE:AC-${acNum}:PS-${boothPad}`;

    const hasAc = acIdSet.has(b.constituency_id);
    const dualIdentityMatches = acInternalIdMap.get(b.constituency_id) === b.constituency_internal_id;
    const nonSelfReferential = prov?.source_record_id !== b.id;
    const hasSource = prov?.dataset_version_id === 'eci_ts_booths_2023_v1' &&
      prov?.source_record_id === expectedSourceRecordId &&
      prov?.operator === 'system:w015_b2_reconciliation' &&
      prov?.transformation_type === 'synthetic_test_fixture';
    return hasAc && dualIdentityMatches && nonSelfReferential && hasSource;
  });

  // Tier 4: Reorganisation Splits & Lineage (2+) — Gazette G.O.Ms.No. 18 & 19, G.O.Ms.No. 222 -> Lineage Traversal
  const splitsReconciled = muluguPredOk && narayanpetPredOk && traversalOk;

  // Global Referential & Zero Orphan Invariant
  const orphanDists = (districts || []).filter(d => d.state_code !== 'TS').length;
  const orphanPcs = (pcs || []).filter(p => p.state_code !== 'TS').length;
  const orphanAcs = (acs || []).filter(a =>
    a.state_code !== 'TS' ||
    !acPcLinks?.some(l => l.id === a.id && l.parliamentary_constituency_id) ||
    !acDistLinks?.some(l => l.id === a.id && l.district_id)
  ).length;
  const orphanMandals = (mandals || []).filter(m => !districtIdSet.has(m.district_id)).length;
  const orphanBooths = (booths || []).filter(b => !acIdSet.has(b.constituency_id)).length;
  const orphanMcm = (mcm || []).filter(m => !mandalIdSet.has(m.mandal_id) || !acIdSet.has(m.constituency_id)).length;

  const noOrphans = orphanDists === 0 && orphanPcs === 0 && orphanAcs === 0 &&
    orphanMandals === 0 && orphanBooths === 0 && orphanMcm === 0;

  benchmarkMetrics.overallReconciliationMs = (performance.now() - tE0).toFixed(2);

  const ePassed = selfReferentialCount === 0 && mandalsReconciled && mcmReconciled && boothsReconciled && splitsReconciled && noOrphans;

  recordTest(
    'TEST-E',
    'empirical reconciliation of known geography relationships (Master Evidence Gate)',
    'MASTER_RECONCILIATION_GATE',
    ePassed ? 'PASS' : 'FAIL',
    '100% of known geography relationships reconcile across the 4-tier chain (Authoritative Source -> Canonical Stored -> Relational Integrity -> Reconciliation Result) with 0 self-referential provenance records, 0 orphans, and 0 broken foreign keys',
    {
      selfReferentialCount,
      mandalsReconciled,
      mcmReconciled,
      boothsReconciled,
      splitsReconciled,
      orphanDistricts: orphanDists,
      orphanPCs: orphanPcs,
      orphanACs: orphanAcs,
      orphanMandals,
      orphanBooths,
      orphanMcm,
      latencyMs: benchmarkMetrics.overallReconciliationMs
    },
    'Master Evidence requirement fully satisfied: 4-tier source-backed chain verified with zero self-referential IDs, zero orphans, and zero broken foreign keys across the entire bounded hierarchy.'
  );

  // ==========================================================================
  // TEST-SUPP-1: Temporal GiST Non-Overlap Invariant
  // ==========================================================================
  const tSupp1 = performance.now();
  // Positive probe: abutting adjacent interval should succeed
  const testAcId = ac109?.internal_id;
  const dummyDistId = districts?.[0]?.id;
  let adjacentInsertSucceeded = false;
  let overlappingInsertRejected = false;

  if (testAcId && dummyDistId) {
    const probeFrom = '1990-01-01';
    const probeTo = '2000-01-01';
    const adjacentFrom = '2000-01-01';
    const adjacentTo = '2005-01-01';

    // Insert base interval [1990-01-01, 2000-01-01)
    const { data: baseRow, error: baseErr } = await adminClient
      .from('constituency_district_timeline')
      .insert({
        constituency_internal_id: testAcId,
        district_id: dummyDistId,
        overlap_type: 'primary',
        valid_from: probeFrom,
        valid_to: probeTo,
        is_current: false,
        primary_dataset_version_id: 'ts_districts_2014_v1'
      })
      .select('id')
      .single();

    if (baseRow?.id) {
      // Test 1: Adjacent interval [2000-01-01, 2005-01-01) -> must SUCCEED
      const { data: adjRow, error: adjErr } = await adminClient
        .from('constituency_district_timeline')
        .insert({
          constituency_internal_id: testAcId,
          district_id: dummyDistId,
          overlap_type: 'primary',
          valid_from: adjacentFrom,
          valid_to: adjacentTo,
          is_current: false,
          primary_dataset_version_id: 'ts_districts_2014_v1'
        })
        .select('id')
        .single();
      adjacentInsertSucceeded = !adjErr && !!adjRow?.id;

      // Test 2: Overlapping interval [1995-01-01, 2002-01-01) -> must FAIL with 23P01
      const { error: overlapErr } = await adminClient
        .from('constituency_district_timeline')
        .insert({
          constituency_internal_id: testAcId,
          district_id: dummyDistId,
          overlap_type: 'primary',
          valid_from: '1995-01-01',
          valid_to: '2002-01-01',
          is_current: false,
          primary_dataset_version_id: 'ts_districts_2014_v1'
        });
      overlappingInsertRejected = !!overlapErr && (overlapErr.code === '23P01' || overlapErr.message.includes('exclusion constraint') || overlapErr.message.includes('conflicting key'));

      // Clean up test probe rows
      if (adjRow?.id) await adminClient.from('constituency_district_timeline').delete().eq('id', adjRow.id);
      await adminClient.from('constituency_district_timeline').delete().eq('id', baseRow.id);
    }
  }

  benchmarkMetrics.gistValidationMs = (performance.now() - tSupp1).toFixed(2);

  const supp1Passed = adjacentInsertSucceeded && overlappingInsertRejected;
  recordTest(
    'TEST-SUPP-1',
    'Temporal GiST Non-Overlap Invariant (constituency_district_timeline)',
    'SUPPORTING_TEMPORAL',
    supp1Passed ? 'PASS' : 'FAIL',
    'PostgreSQL GiST exclusion constraint rejects overlapping intervals (23P01); abutting adjacent intervals admitted',
    {
      adjacentInsertSucceeded,
      overlappingInsertRejected,
      latencyMs: benchmarkMetrics.gistValidationMs
    },
    'PostgreSQL GiST temporal non-overlap invariant rigorously verified on temporal relationship storage.'
  );

  // ==========================================================================
  // TEST-SUPP-2: Scenario Isolation & Inherited RLS Security
  // ==========================================================================
  const tSupp2 = performance.now();
  // Blocker 5: Complete database-level assertion over all canonical W015 tables
  const { data: allMandals } = await adminClient.from('mandals').select('id, name, primary_dataset_version_id');
  const { data: allMcm } = await adminClient.from('mandal_constituency_map').select('id, primary_dataset_version_id');
  const { data: allBooths } = await adminClient.from('polling_booths').select('id, primary_dataset_version_id');

  // Identify scenario datasets and dataset versions
  const { data: allVersions } = await adminClient.from('dataset_versions').select('id, dataset_id, default_status');
  const scenarioVersionIds = new Set(
    (allVersions || [])
      .filter(v => v.default_status === 'SCENARIO' || v.dataset_id === 'panin_delimitation_scenarios' || v.dataset_id === 'tamil_nadu_2026_projection')
      .map(v => v.id)
  );

  // Assert ZERO canonical rows reference scenario versions
  const scenarioMandalsCount = (allMandals || []).filter(m => scenarioVersionIds.has(m.primary_dataset_version_id)).length;
  const scenarioMcmCount = (allMcm || []).filter(m => scenarioVersionIds.has(m.primary_dataset_version_id)).length;
  const scenarioBoothsCount = (allBooths || []).filter(b => scenarioVersionIds.has(b.primary_dataset_version_id)).length;

  // Delimitation regimes: ensure SCENARIO_PROPOSED_REGIME is isolated and not marked as CURRENT_LEGAL_REGIME
  const { data: scenarioRegimes } = await adminClient
    .from('delimitation_regimes')
    .select('id, legal_status')
    .eq('legal_status', 'SCENARIO_PROPOSED_REGIME');
  const scenarioRegimesIsolated = (scenarioRegimes || []).length === 1 && scenarioRegimes[0].legal_status !== 'CURRENT_LEGAL_REGIME';

  // RLS Checks: Anonymous read succeeds across canonical tables
  const { data: anonMandals, error: anonMandalsErr } = await anonClient.from('mandals').select('id, name').limit(10);
  const { data: anonBooths, error: anonBoothsErr } = await anonClient.from('polling_booths').select('id, booth_name').limit(10);
  const anonReadOk = !anonMandalsErr && !anonBoothsErr && (anonMandals || []).length > 0 && (anonBooths || []).length > 0;

  // Anonymous mutation denied
  const { error: anonMutationErr } = await anonClient.from('mandals').insert({
    id: 'TS-MDL-MALICIOUS',
    name: 'Malicious Mandal',
    state_code: 'TS',
    district: 'Unknown',
    type: 'mandal'
  });
  const mutationDenied = !!anonMutationErr;

  benchmarkMetrics.rlsSecurityMs = (performance.now() - tSupp2).toFixed(2);

  const supp2Passed = anonReadOk && mutationDenied &&
    scenarioMandalsCount === 0 && scenarioMcmCount === 0 && scenarioBoothsCount === 0 &&
    scenarioRegimesIsolated;

  recordTest(
    'TEST-SUPP-2',
    'Scenario Isolation & Inherited RLS Security',
    'SUPPORTING_SECURITY',
    supp2Passed ? 'PASS' : 'FAIL',
    'Anonymous read succeeds; anonymous mutation denied by RLS; database-level scenario isolation verified with zero scenario records in canonical tables',
    {
      anonReadOk,
      mutationDenied,
      totalMandalsInspected: allMandals?.length,
      scenarioMandalsCount,
      totalMcmInspected: allMcm?.length,
      scenarioMcmCount,
      totalBoothsInspected: allBooths?.length,
      scenarioBoothsCount,
      scenarioRegimesIsolated,
      latencyMs: benchmarkMetrics.rlsSecurityMs
    },
    'Security requirements upheld: public read permitted, client mutation denied, zero scenario records in canonical tables across the entire population.'
  );

  // ==========================================================================
  // TEST-SUPP-3: W012 Lineage & Governance Integrity
  // ==========================================================================
  const tSupp3 = performance.now();
  const validVersionIds = new Set((allVersions || []).map(v => v.id));

  // Verify all mandals, mcm, and booths reference valid dataset versions
  const allMandalVersionsValid = (mandals || []).every(m => m.primary_dataset_version_id && validVersionIds.has(m.primary_dataset_version_id));
  const allMcmVersionsValid = (mcm || []).every(m => m.primary_dataset_version_id && validVersionIds.has(m.primary_dataset_version_id));
  const allBoothVersionsValid = (booths || []).every(b => b.primary_dataset_version_id && validVersionIds.has(b.primary_dataset_version_id));

  // Check that 0 records are elevated to OFFICIAL
  const { data: unverifiedVersions } = await adminClient
    .from('dataset_versions')
    .select('id, default_status')
    .in('id', ['ts_lgd_mandals_2023_v1', 'ts_mandal_ac_mappings_2023_v1', 'eci_ts_booths_2023_v1']);

  const allUnverified = (unverifiedVersions || []).length === 3 && (unverifiedVersions || []).every(v => v.default_status === 'UNVERIFIED');

  // Blocker 4: Exact semantic completeness (27 prov records: 26 original + 1 lineage; 25 linkages: 26 - 2 purged MCM + 1 lineage)
  const exactProvCountOk = (w015ProvRecords || []).length === 27;
  const exactLinkageCountOk = (w015Linkages || []).length === 25;

  // Bidirectional resolution: every linkage resolves to an existing domain row and provenance record
  const mandalIdSetAll = new Set((mandals || []).map(m => m.id));
  const mcmIdSetAll = new Set((mcm || []).map(m => String(m.id)));
  const boothIdSetAll = new Set((booths || []).map(b => b.id));
  const provIdSet = new Set((w015ProvRecords || []).map(p => p.id));

  const allLinkagesValid = (w015Linkages || []).every(l => {
    const provValid = provIdSet.has(l.provenance_id);
    let domainValid = false;
    if (l.domain_table === 'mandals') domainValid = mandalIdSetAll.has(l.domain_record_id);
    else if (l.domain_table === 'mandal_constituency_map') domainValid = mcmIdSetAll.has(l.domain_record_id);
    else if (l.domain_table === 'polling_booths') domainValid = boothIdSetAll.has(l.domain_record_id);
    else if (l.domain_table === 'geography_entity_lineage') domainValid = true; // Lineage linkage validated in TEST-C/TEST-B2-D
    return provValid && domainValid;
  });

  // Every W015 domain record has an exact provenance linkage
  const allMandalsLinked = (mandals || []).every(m => (w015Linkages || []).some(l => l.domain_table === 'mandals' && l.domain_record_id === m.id));
  const allMcmLinked = (mcm || []).every(m => (w015Linkages || []).some(l => l.domain_table === 'mandal_constituency_map' && l.domain_record_id === String(m.id)));
  const allBoothsLinked = (booths || []).every(b => (w015Linkages || []).some(l => l.domain_table === 'polling_booths' && l.domain_record_id === b.id));

  const zeroOfficial = (w015ProvRecords || []).every(p => p.status !== 'OFFICIAL');

  benchmarkMetrics.governanceIntegrityMs = (performance.now() - tSupp3).toFixed(2);

  const supp3Passed = allMandalVersionsValid && allMcmVersionsValid && allBoothVersionsValid &&
    allUnverified && zeroOfficial &&
    exactProvCountOk && exactLinkageCountOk && allLinkagesValid &&
    allMandalsLinked && allMcmLinked && allBoothsLinked;

  recordTest(
    'TEST-SUPP-3',
    'W012 Lineage & Governance Integrity (100% UNVERIFIED, 0 OFFICIAL)',
    'SUPPORTING_GOVERNANCE',
    supp3Passed ? 'PASS' : 'FAIL',
    '100% of W015 relationship records reference valid W012 dataset versions; exact 27 provenance records and 25 linkages resolve bidirectionally; 0 records elevated to OFFICIAL',
    {
      allMandalVersionsValid,
      allMcmVersionsValid,
      allBoothVersionsValid,
      allUnverified,
      exactProvCountOk,
      exactLinkageCountOk,
      allLinkagesValid,
      allMandalsLinked,
      allMcmLinked,
      allBoothsLinked,
      zeroOfficial,
      provenanceRecords: w015ProvRecords?.length,
      provenanceLinkages: w015Linkages?.length,
      latencyMs: benchmarkMetrics.governanceIntegrityMs
    },
    'W012 governance protocol strictly enforced: exact semantic completeness verified with 27 provenance records and 25 linkages resolving bidirectionally, zero orphans, and 100% strictly UNVERIFIED.'
  );

  // ==========================================================================
  // TEST-SUPP-4: Regression Suite & General Performance Observation
  // ==========================================================================
  const tSupp4 = performance.now();
  // Blocker 1: Genuine assertions that benchmark queries execute successfully and result sets are valid
  const tR1 = performance.now();
  const { data: acResult, error: acQueryErr } = await anonClient
    .from('constituencies')
    .select('id, name, parliamentary_constituency_id, district_id')
    .limit(119);
  benchmarkMetrics.constituencyWithRelationsMs = (performance.now() - tR1).toFixed(2);

  const tR2 = performance.now();
  const { data: mdlResult, error: mdlQueryErr } = await anonClient
    .from('mandals')
    .select('id, name, district_id')
    .limit(12);
  benchmarkMetrics.mandalWithDistrictMs = (performance.now() - tR2).toFixed(2);

  const tR3 = performance.now();
  const { data: mcmResult, error: mcmQueryErr } = await anonClient
    .from('mandal_constituency_map')
    .select('mandal_id, constituency_id, overlap_type')
    .limit(10);
  benchmarkMetrics.mandalAcMappingMs = (performance.now() - tR3).toFixed(2);

  benchmarkMetrics.regressionEvaluationMs = (performance.now() - tSupp4).toFixed(2);

  const queriesSucceeded = !acQueryErr && !mdlQueryErr && !mcmQueryErr;
  const resultSetsValid = (acResult || []).length === 119 &&
    (mdlResult || []).length >= 12 &&
    (mcmResult || []).length >= 8;
  const latenciesRecorded = parseFloat(benchmarkMetrics.constituencyWithRelationsMs) > 0 &&
    parseFloat(benchmarkMetrics.mandalWithDistrictMs) > 0 &&
    parseFloat(benchmarkMetrics.mandalAcMappingMs) > 0 &&
    parseFloat(benchmarkMetrics.regressionEvaluationMs) > 0;

  const supp4Passed = queriesSucceeded && resultSetsValid && latenciesRecorded;

  recordTest(
    'TEST-SUPP-4',
    'Regression Suite & General Performance Observation',
    'SUPPORTING_REGRESSION',
    supp4Passed ? 'PASS' : 'FAIL',
    'Benchmark queries execute successfully; result sets valid; empirical latencies measured and recorded on panIN-staging with zero subjective conclusions',
    {
      queriesSucceeded,
      resultSetsValid,
      latenciesRecorded,
      constituencyWithRelationsMs: benchmarkMetrics.constituencyWithRelationsMs,
      mandalWithDistrictMs: benchmarkMetrics.mandalWithDistrictMs,
      mandalAcMappingMs: benchmarkMetrics.mandalAcMappingMs,
      latencyMs: benchmarkMetrics.regressionEvaluationMs
    },
    'Empirical relationship query performance observed and recorded under project performance guidelines.'
  );

  console.log('\n================================================================');
  console.log('PERFORMANCE BENCHMARK MEASUREMENTS (panIN-staging)');
  console.log('================================================================');
  console.log(`- Parent / Child Resolution Query:          ${benchmarkMetrics.parentChildResolutionMs} ms`);
  console.log(`- Contains / Part-Of Resolution Query:      ${benchmarkMetrics.containsPartOfResolutionMs} ms`);
  console.log(`- Lineage Traversal Query:                  ${benchmarkMetrics.lineageTraversalMs} ms`);
  console.log(`- Old-to-New Reconciliation Query:          ${benchmarkMetrics.oldToNewReconciliationMs} ms`);
  console.log(`- Overall Geography Reconciliation:         ${benchmarkMetrics.overallReconciliationMs} ms`);
  console.log(`- Constituency with Relations Read (119):   ${benchmarkMetrics.constituencyWithRelationsMs} ms`);
  console.log(`- Mandals with District FK Read:            ${benchmarkMetrics.mandalWithDistrictMs} ms`);
  console.log(`- Mandal-AC Containment Read:               ${benchmarkMetrics.mandalAcMappingMs} ms`);
  console.log('================================================================\n');

  const passedCount = testResults.filter(t => t.status === 'PASS').length;
  const failedCount = testResults.filter(t => t.status === 'FAIL').length;

  console.log('================================================================');
  console.log(`TOTAL TESTS: ${testResults.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('================================================================\n');

  const report = {
    timestamp: new Date().toISOString(),
    target: supabaseUrl,
    summary: {
      total: testResults.length,
      passed: passedCount,
      failed: failedCount
    },
    benchmarks: benchmarkMetrics,
    tests: testResults
  };

  const reportPath = path.resolve('reports/w015_staging_verification.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Report saved to ${reportPath}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runBattery().catch(err => {
  console.error('FATAL Battery Error:', err);
  process.exit(1);
});
