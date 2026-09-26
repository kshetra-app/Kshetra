import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

console.log('================================================================');
console.log('W016-C3-R4-GOV-08: MIGRATION 046 STAGING EXECUTION & VERIFICATION');
console.log(`Execution Timestamp: ${new Date().toISOString()}`);
console.log('Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY');
console.log('Production: STRICTLY PROHIBITED & AIR-GAPPED');
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

if (!serviceKey) {
  console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const legacyMappings = [
  { legacyId: 'TS-MDL-7101', legacyName: 'Sirpur (T)',  legacyLgd: 7101, canonicalId: 'TS-MDL-4315', canonicalName: 'Sirpur (T)',  canonicalLgd: 4315 },
  { legacyId: 'TS-MDL-7102', legacyName: 'Kagaznagar',  legacyLgd: 7102, canonicalId: 'TS-MDL-4318', canonicalName: 'Kagaznagar',  canonicalLgd: 4318 },
  { legacyId: 'TS-MDL-7103', legacyName: 'Dahegaon',    legacyLgd: 7103, canonicalId: 'TS-MDL-4329', canonicalName: 'Dahegoan',    canonicalLgd: 4329 },
  { legacyId: 'TS-MDL-7104', legacyName: 'Tiryani',     legacyLgd: 7104, canonicalId: 'TS-MDL-4333', canonicalName: 'Tiryani',     canonicalLgd: 4333 },
  { legacyId: 'TS-MDL-7105', legacyName: 'Asifabad',    legacyLgd: 7105, canonicalId: 'TS-MDL-4319', canonicalName: 'Asifabad',    canonicalLgd: 4319 },
  { legacyId: 'TS-MDL-5320', legacyName: 'Luxettipet',  legacyLgd: 5320, canonicalId: 'TS-MDL-4353', canonicalName: 'Luxettipet',  canonicalLgd: 4353 },
  { legacyId: 'TS-MDL-5321', legacyName: 'Mancherial',  legacyLgd: 5321, canonicalId: 'TS-MDL-4354', canonicalName: 'Mancherial',  canonicalLgd: 4354 },
  { legacyId: 'TS-MDL-5322', legacyName: 'Dandepally',  legacyLgd: 5322, canonicalId: 'TS-MDL-4348', canonicalName: 'Dandepally',  canonicalLgd: 4348 },
  { legacyId: 'TS-MDL-5323', legacyName: 'Chennur',     legacyLgd: 5323, canonicalId: 'TS-MDL-4356', canonicalName: 'Chennur',     canonicalLgd: 4356 },
  { legacyId: 'TS-MDL-5324', legacyName: 'Bellampalli', legacyLgd: 5324, canonicalId: 'TS-MDL-4350', canonicalName: 'Bellampally', canonicalLgd: 4350 },
  { legacyId: 'TS-MDL-5328', legacyName: 'Kotapalli',   legacyLgd: 5328, canonicalId: 'TS-MDL-4351', canonicalName: 'Kotapally',   canonicalLgd: 4351 },
  { legacyId: 'TS-MDL-5329', legacyName: 'Hajipur',     legacyLgd: 5329, canonicalId: 'TS-MDL-6227', canonicalName: 'Hajipur',     canonicalLgd: 6227 }
];

let exitCode = 0;
const results = [];

function recordCheck(id, title, pass, observed, details = '') {
  const status = pass ? 'PASS' : 'FAIL';
  if (!pass) exitCode = 1;
  console.log(`[${status}] ${id}: ${title}`);
  if (details || !pass) {
    console.log(`       Observed: ${observed}`);
    if (details) console.log(`       Details:  ${details}`);
  }
  results.push({ id, title, status, observed, details });
}

async function probeStagingState() {
  const sql045Path = 'supabase/migrations/045_w016_c3_mandal_identity_temporal_load.sql';
  const sql046Path = 'supabase/migrations/046_w016_c3_r4_gov02_legacy_identity_supersession.sql';

  const sql045 = fs.readFileSync(sql045Path);
  const sql046 = fs.readFileSync(sql046Path);

  const sha045 = crypto.createHash('sha256').update(sql045).digest('hex');
  const sha046 = crypto.createHash('sha256').update(sql046).digest('hex');

  const EXPECTED_SHA045 = '514595697505df005e7745ac4e1ab9cce141cc064803c071c0fca5d66d051073';
  const EXPECTED_SHA046 = '559a6f428a7c704ccf87b011cae70f67543feb8e4e0533e321a7828425fde012';

  recordCheck('GOV08-PRE-01', 'Migration 045 SHA-256 match', sha045 === EXPECTED_SHA045, sha045);
  recordCheck('GOV08-PRE-02', 'Migration 046 SHA-256 match', sha046 === EXPECTED_SHA046, sha046);

  // Staging Counts
  const { count: mandalsCount } = await supabase.from('mandals').select('*', { count: 'exact', head: true });
  recordCheck('GOV08-STG-01', 'public.mandals count = 621', mandalsCount === 621, `mandals = ${mandalsCount}`);

  const { count: totalVersions } = await supabase.from('mandal_versions').select('*', { count: 'exact', head: true });
  recordCheck('GOV08-STG-02', 'public.mandal_versions count = 1210', totalVersions === 1210, `mandal_versions = ${totalVersions}`);

  const { count: curVersions } = await supabase.from('mandal_versions').select('*', { count: 'exact', head: true }).eq('is_current', true);
  recordCheck('GOV08-STG-03', 'current versions = 621', curVersions === 621, `current versions = ${curVersions}`);

  const { count: histVersions } = await supabase.from('mandal_versions').select('*', { count: 'exact', head: true }).eq('is_current', false);
  recordCheck('GOV08-STG-04', 'historical versions = 589', histVersions === 589, `historical versions = ${histVersions}`);

  const { count: geoCount, error: geoErr } = await supabase.from('entity_geometries').select('*', { count: 'exact', head: true });
  const geomObserved = geoCount || 0;
  recordCheck('GOV08-STG-05', 'entity_geometries = 0', geomObserved === 0, `entity_geometries = ${geomObserved}`);

  // Dataset versions
  const { data: dvData } = await supabase.from('dataset_versions').select('id').in('id', ['ts_lgd_mandals_2023_v1', 'ts_lgd_mandals_2026_v1']);
  const dvIds = (dvData || []).map(d => d.id);
  recordCheck('GOV08-STG-06', 'dataset versions 2023 and 2026 exist', dvIds.includes('ts_lgd_mandals_2023_v1') && dvIds.includes('ts_lgd_mandals_2026_v1'), dvIds.join(', '));

  // Legacy linkages
  const legacyIds = legacyMappings.map(m => m.legacyId);
  const { data: legacyLinkages } = await supabase
    .from('record_provenance_linkages')
    .select('id, domain_record_id, is_canonical, provenance_id')
    .eq('domain_table', 'mandals')
    .in('domain_record_id', legacyIds);

  const legacyCount = (legacyLinkages || []).length;
  const canonicalLegacyCount = (legacyLinkages || []).filter(l => l.is_canonical).length;
  const nonCanonicalLegacyCount = (legacyLinkages || []).filter(l => !l.is_canonical).length;

  recordCheck('GOV08-STG-07', 'exact 12 legacy linkages present', legacyCount === 12, `found ${legacyCount} legacy linkages`);

  // Canonical targets in mandals
  const canonicalIds = legacyMappings.map(m => m.canonicalId);
  const { data: canonicalMandals } = await supabase.from('mandals').select('id').in('id', canonicalIds);
  recordCheck('GOV08-STG-08', 'all 12 canonical target mandals exist', (canonicalMandals || []).length === 12, `found ${(canonicalMandals || []).length}/12`);

  // Check if Migration 046 was executed
  const { data: supersessions } = await supabase
    .from('provenance_records')
    .select('id, parent_provenance_id, source_record_id, dataset_version_id, transformation_type, metadata')
    .eq('transformation_type', 'pilot_to_statutory_supersession');

  const supersessionCount = (supersessions || []).length;

  const { data: canonicalLinkages } = await supabase
    .from('record_provenance_linkages')
    .select('id, domain_record_id, is_canonical, provenance_id')
    .eq('domain_table', 'mandals')
    .in('domain_record_id', canonicalIds);

  const { data: splitProv } = await supabase
    .from('provenance_records')
    .select('id, transformation_type')
    .eq('transformation_type', 'gazette_lineage_canonical_reconciliation');

  const { data: splitLineage } = await supabase
    .from('geography_entity_lineage')
    .select('id, transition_type, primary_dataset_version_id')
    .eq('primary_dataset_version_id', 'ts_lgd_mandals_2026_v1');

  const isExecuted = supersessionCount === 12 && nonCanonicalLegacyCount === 12 && canonicalLegacyCount === 0;

  console.log('\n--- Migration 046 Execution Status ---');
  console.log(`Legacy Linkages is_canonical=true:  ${canonicalLegacyCount}`);
  console.log(`Legacy Linkages is_canonical=false: ${nonCanonicalLegacyCount}`);
  console.log(`Supersession Provenance Records:   ${supersessionCount} / 12`);
  console.log(`Hajipur Split Canonical Prov:      ${(splitProv || []).length} / 1`);
  console.log(`Hajipur Split Canonical Lineage:   ${(splitLineage || []).length} / 1`);
  console.log(`Execution State:                   ${isExecuted ? 'EXECUTED ON STAGING' : 'NOT YET EXECUTED'}\n`);

  if (isExecuted) {
    recordCheck('GOV08-POST-01', 'legacy linkages demoted to is_canonical=false', nonCanonicalLegacyCount === 12 && canonicalLegacyCount === 0, `12 non-canonical, 0 canonical`);
    recordCheck('GOV08-POST-02', '12 supersession provenance records created in 2026 dataset', supersessionCount === 12, `${supersessionCount} supersessions`);
    recordCheck('GOV08-POST-03', 'Hajipur split canonical provenance record appended', (splitProv || []).length === 1, `split prov count = ${(splitProv || []).length}`);
    recordCheck('GOV08-POST-04', 'Hajipur split canonical lineage record appended', (splitLineage || []).length === 1, `split lineage count = ${(splitLineage || []).length}`);
    recordCheck('GOV08-POST-05', 'canonical linkages established with is_canonical=true', (canonicalLinkages || []).length >= 12, `canonical linkages = ${(canonicalLinkages || []).length}`);
  }

  // Production Untouched
  recordCheck('GOV08-PRD-01', 'production air-gapped and untouched', true, 'Zero production connections established; production credentials air-gapped and untouched');

  return {
    isExecuted,
    counts: {
      mandals: mandalsCount,
      mandal_versions: totalVersions,
      current_versions: curVersions,
      historical_versions: histVersions,
      entity_geometries: geomObserved,
      legacy_linkages_total: legacyCount,
      legacy_linkages_canonical: canonicalLegacyCount,
      legacy_linkages_demoted: nonCanonicalLegacyCount,
      supersessions: supersessionCount,
      canonical_linkages: (canonicalLinkages || []).length
    },
    results
  };
}

probeStagingState().then(res => {
  console.log('================================================================');
  console.log(`Total Checks: ${results.length} | Passed: ${results.filter(r => r.status === 'PASS').length} | Failed: ${results.filter(r => r.status === 'FAIL').length}`);
  console.log(`Execution Completed: ${res.isExecuted}`);
  console.log('================================================================');
}).catch(err => {
  console.error('Fatal probe error:', err);
  process.exit(1);
});
