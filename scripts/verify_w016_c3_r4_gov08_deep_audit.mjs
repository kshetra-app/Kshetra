import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve('.env.staging');
const env = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
const supabaseUrl = env.SUPABASE_URL || 'https://fkpigozcqnmcvofuksar.supabase.co';
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

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

async function runAudit() {
  console.log('Fetching live audit records from panIN-staging...');

  // 1. Mandals population
  const { count: mandalsCount } = await supabase.from('mandals').select('*', { count: 'exact', head: true });
  const { count: mvTotal } = await supabase.from('mandal_versions').select('*', { count: 'exact', head: true });
  const { count: mvCurrent } = await supabase.from('mandal_versions').select('*', { count: 'exact', head: true }).eq('is_current', true);
  const { count: mvHistorical } = await supabase.from('mandal_versions').select('*', { count: 'exact', head: true }).eq('is_current', false);
  const { count: geoCount } = await supabase.from('entity_geometries').select('*', { count: 'exact', head: true });

  // 2. Legacy Linkages
  const legacyIds = legacyMappings.map(m => m.legacyId);
  const { data: legacyLinkages } = await supabase
    .from('record_provenance_linkages')
    .select('*')
    .eq('domain_table', 'mandals')
    .in('domain_record_id', legacyIds)
    .order('domain_record_id');

  // 3. Supersession Provenance Records
  const { data: supersessions } = await supabase
    .from('provenance_records')
    .select('*')
    .eq('transformation_type', 'pilot_to_statutory_supersession')
    .order('source_record_id');

  // 4. Canonical Linkages
  const canonicalIds = legacyMappings.map(m => m.canonicalId);
  const supersessionIds = (supersessions || []).map(s => s.id);
  const { data: canonicalLinkages } = await supabase
    .from('record_provenance_linkages')
    .select('*')
    .eq('domain_table', 'mandals')
    .in('provenance_id', supersessionIds)
    .order('domain_record_id');

  // 5. Hajipur Split Reconciliation
  const { data: splitProv } = await supabase
    .from('provenance_records')
    .select('*')
    .eq('id', '6b110bc7-a45b-7b70-7ae6-6bc89d7fa9b2'); // md5('pr_lineage_canonical_mancherial_hajipur_split')::uuid

  const { data: allSplitProv } = await supabase
    .from('provenance_records')
    .select('*')
    .eq('transformation_type', 'gazette_lineage_canonical_reconciliation');

  const { data: splitLineage } = await supabase
    .from('geography_entity_lineage')
    .select('*')
    .eq('primary_dataset_version_id', 'ts_lgd_mandals_2026_v1');

  const { data: histProv8c } = await supabase
    .from('provenance_records')
    .select('*')
    .eq('id', '8c350901-a5d8-fe3d-c5b2-6ffe37601908');

  const { data: histLineage68 } = await supabase
    .from('geography_entity_lineage')
    .select('*')
    .eq('id', '68e465c2-a00b-478d-8082-e0cf1f3bbe67');

  // 6. Historical Provenance in ts_lgd_mandals_2023_v1
  const { data: hist2023Prov } = await supabase
    .from('provenance_records')
    .select('*')
    .eq('dataset_version_id', 'ts_lgd_mandals_2023_v1')
    .order('id');

  // 7. Dataset Versions
  const { data: datasetVersions } = await supabase
    .from('dataset_versions')
    .select('*')
    .in('id', ['ts_lgd_mandals_2023_v1', 'ts_lgd_mandals_2026_v1'])
    .order('id');

  // 8. W014 Controls: Check null current_version_ids
  const { count: nullCurrentPointers } = await supabase
    .from('mandals')
    .select('*', { count: 'exact', head: true })
    .is('current_version_id', null);

  // Check version pointer consistency
  const { data: sampleMandalPointers } = await supabase
    .from('mandals')
    .select('id, current_version_id')
    .in('id', canonicalIds);

  const auditOutput = {
    counts: {
      mandals: mandalsCount,
      mandal_versions: mvTotal,
      current_versions: mvCurrent,
      historical_versions: mvHistorical,
      entity_geometries: geoCount || 0,
      null_current_version_ids: nullCurrentPointers || 0
    },
    legacy_linkages: legacyLinkages,
    supersession_records: supersessions,
    canonical_linkages: canonicalLinkages,
    split_reconciliation: {
      canonical_prov: allSplitProv,
      canonical_lineage: splitLineage,
      historical_prov_8c: histProv8c,
      historical_lineage_68: histLineage68
    },
    historical_2023_provenance_count: (hist2023Prov || []).length,
    historical_2023_provenance: hist2023Prov,
    dataset_versions: datasetVersions,
    sample_canonical_pointers: sampleMandalPointers
  };

  fs.writeFileSync('audit_staging_dump.json', JSON.stringify(auditOutput, null, 2), 'utf8');
  console.log('Saved audit_staging_dump.json');
}

runAudit().catch(console.error);
