import fs from 'fs';

const sql045 = fs.readFileSync('supabase/migrations/045_w016_c3_mandal_identity_temporal_load.sql', 'utf8');
const sql042 = fs.readFileSync('supabase/migrations/042_geography_relationship_engine.sql', 'utf8');
const sql043 = fs.readFileSync('supabase/migrations/043_w015_b2_source_reconciliation.sql', 'utf8');

const legacy = [
  { legacyId: 'TS-MDL-7101', expectedName: 'Sirpur (T)', canonicalId: 'TS-MDL-4315', canonicalLgd: 4315 },
  { legacyId: 'TS-MDL-7102', expectedName: 'Kagaznagar', canonicalId: 'TS-MDL-4318', canonicalLgd: 4318 },
  { legacyId: 'TS-MDL-7103', expectedName: 'Dahegaon', canonicalId: 'TS-MDL-4329', canonicalLgd: 4329 },
  { legacyId: 'TS-MDL-7104', expectedName: 'Tiryani', canonicalId: 'TS-MDL-4333', canonicalLgd: 4333 },
  { legacyId: 'TS-MDL-7105', expectedName: 'Asifabad', canonicalId: 'TS-MDL-4319', canonicalLgd: 4319 },
  { legacyId: 'TS-MDL-5320', expectedName: 'Luxettipet', canonicalId: 'TS-MDL-4353', canonicalLgd: 4353 },
  { legacyId: 'TS-MDL-5321', expectedName: 'Mancherial', canonicalId: 'TS-MDL-4354', canonicalLgd: 4354 },
  { legacyId: 'TS-MDL-5322', expectedName: 'Dandepally', canonicalId: 'TS-MDL-4348', canonicalLgd: 4348 },
  { legacyId: 'TS-MDL-5323', expectedName: 'Chennur', canonicalId: 'TS-MDL-4356', canonicalLgd: 4356 },
  { legacyId: 'TS-MDL-5324', expectedName: 'Bellampalli', canonicalId: 'TS-MDL-4350', canonicalLgd: 4350 },
  { legacyId: 'TS-MDL-5328', expectedName: 'Kotapalli', canonicalId: 'TS-MDL-4351', canonicalLgd: 4351 },
  { legacyId: 'TS-MDL-5329', expectedName: 'Hajipur', canonicalId: 'TS-MDL-6227', canonicalLgd: 6227 }
];

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const env = dotenv.parse(fs.readFileSync('.env.staging', 'utf8'));
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

console.log('=== FORENSIC VERIFICATION OF ALL 12 MANDALS ===');
for (const item of legacy) {
  // Check 042 definition
  const match042 = sql042.match(new RegExp(`\\('${item.legacyId}',\\s*'([^']+)',\\s*'TS',\\s*'([^']+)',\\s*[^,]+,\\s*(\\d+)`));
  // Check 043 reconciliation
  const match043 = sql043.match(new RegExp(`UPDATE public\\.mandals SET lgd_code = (\\d+) WHERE id = '${item.legacyId}'`));
  // Check 045 canonical row
  const match045 = sql045.match(new RegExp(`\\('${item.canonicalId}',\\s*'([^']+)',\\s*'[^']+',\\s*'TS',\\s*'([^']+)',\\s*'mandal',\\s*'([^']+)',\\s*(\\d+)`));

  console.log({
    legacyId: item.legacyId,
    m042: match042 ? { name: match042[1], district: match042[2], code: Number(match042[3]) } : 'NOT FOUND',
    m043_code: match043 ? Number(match043[1]) : 'NOT FOUND',
    canonical: match045 ? { id: item.canonicalId, name: match045[1], district: match045[2], lgd: Number(match045[4]) } : 'NOT FOUND'
  });
}

async function verifyLiveStaging() {
  console.log('\n=== LIVE STAGING AUDIT OF THE 16 REMAINING REFERENCES ===');
  const legacyIds = legacy.map(l => l.legacyId);

  // 1. Check record_provenance_linkages
  const { data: rpl, error: errRpl } = await supabase
    .from('record_provenance_linkages')
    .select('id, domain_table, domain_record_id, provenance_id, is_canonical')
    .eq('domain_table', 'mandals')
    .in('domain_record_id', legacyIds);
  
  if (errRpl) console.error('Error RPL:', errRpl);
  console.log(`1. record_provenance_linkages (domain_table=mandals, domain_record_id in legacy): count = ${rpl?.length}`);
  console.log(rpl);

  // 2. Check geography_entity_lineage
  const { data: gel, error: errGel } = await supabase
    .from('geography_entity_lineage')
    .select('id, entity_type, predecessor_internal_id, successor_internal_id, transition_type, effective_date, statutory_order, metadata');
  
  if (errGel) console.error('Error GEL:', errGel);
  const matchingGel = (gel || []).filter(g => 
    JSON.stringify(g.metadata).includes('TS-MDL-5321') || JSON.stringify(g.metadata).includes('TS-MDL-5329')
  );
  console.log(`\n2. geography_entity_lineage matching TS-MDL-5321 / 5329: count = ${matchingGel.length}`);
  console.log(matchingGel);

  // 3. Check provenance_records metadata
  const { data: pr, error: errPr } = await supabase
    .from('provenance_records')
    .select('id, dataset_version_id, source_record_id, status, transformation_type, operator, metadata');
  
  if (errPr) console.error('Error PR:', errPr);
  const matchingPr = (pr || []).filter(p => 
    JSON.stringify(p.metadata).includes('TS-MDL-5321') || JSON.stringify(p.metadata).includes('TS-MDL-5329')
  );
  console.log(`\n3. provenance_records matching TS-MDL-5321 / 5329: count = ${matchingPr.length}`);
  console.log(matchingPr);

  // 4. Check whether any legacy IDs exist in public.mandals
  const { data: mandalsLegacy } = await supabase
    .from('mandals')
    .select('id, name')
    .in('id', legacyIds);
  console.log(`\n4. public.mandals legacy count = ${mandalsLegacy?.length}`);

  // 5. Check total mandals count
  const { count: totalMandals } = await supabase
    .from('mandals')
    .select('id', { count: 'exact', head: true });
  console.log(`5. Total public.mandals count = ${totalMandals}`);

  // 6. Check total mandal_versions count
  const { count: totalVersions } = await supabase
    .from('mandal_versions')
    .select('id', { count: 'exact', head: true });
  console.log(`6. Total public.mandal_versions count = ${totalVersions}`);

  // 7. Check entity_geometries count
  const { count: totalGeom } = await supabase
    .from('entity_geometries')
    .select('id', { count: 'exact', head: true });
  console.log(`7. Total public.entity_geometries count = ${totalGeom}`);
}

verifyLiveStaging();

