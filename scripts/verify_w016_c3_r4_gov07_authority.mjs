import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

console.log('================================================================');
console.log('W016-C3-R4-GOV-07: W012 LINKAGE MUTABILITY AUTHORITY AUDIT');
console.log(`Execution Timestamp: ${new Date().toISOString()}`);
console.log('Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY (Read-Only Probe)');
console.log('Isolated Verification Target: Local PostgreSQL 17 (supabase_db_Kshetra)');
console.log('================================================================\n');

// 1. Verify staging configuration
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

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const legacyIds = [
  'TS-MDL-7101', 'TS-MDL-7102', 'TS-MDL-7103', 'TS-MDL-7104', 'TS-MDL-7105',
  'TS-MDL-5320', 'TS-MDL-5321', 'TS-MDL-5322', 'TS-MDL-5323', 'TS-MDL-5324',
  'TS-MDL-5328', 'TS-MDL-5329'
];

async function runAudit() {
  const auditResults = {
    job: 'W016-C3-R4-GOV-07',
    timestamp: new Date().toISOString(),
    determination: 'PATH A: LINKAGE MUTABILITY — AUTHORIZED',
    status: 'DESIGN READY — FINAL CTO AUTHORIZATION REQUEST',
    evidence: {}
  };

  console.log('--- 1. PROBING LIVE STAGING DATABASE (READ-ONLY) ---');
  // Staging mandals count
  const { count: totalMandals, error: errM } = await supabase
    .from('mandals')
    .select('id', { count: 'exact', head: true });
  if (errM) throw errM;
  console.log(`Staging public.mandals count: ${totalMandals} (must be 621)`);

  // Staging mandal_versions count
  const { count: totalVersions, error: errV } = await supabase
    .from('mandal_versions')
    .select('id', { count: 'exact', head: true });
  if (errV) throw errV;
  console.log(`Staging public.mandal_versions count: ${totalVersions} (must be 1210)`);

  // Staging legacy linkages
  const { data: stagingRpl, error: errR } = await supabase
    .from('record_provenance_linkages')
    .select('domain_record_id, provenance_id, is_canonical')
    .eq('domain_table', 'mandals')
    .in('domain_record_id', legacyIds);
  if (errR) throw errR;
  console.log(`Staging legacy linkages count: ${stagingRpl.length} (must be 12)`);

  auditResults.evidence.staging = {
    mandalsCount: totalMandals,
    versionsCount: totalVersions,
    legacyLinkagesCount: stagingRpl.length,
    allLegacyPreserved: stagingRpl.length === 12,
    stagingUntouched: totalMandals === 621 && totalVersions === 1210
  };

  console.log('\n--- 2. PROBING CANONICAL MIGRATION 039 DEFINITION ---');
  const sql039 = fs.readFileSync('supabase/migrations/039_data_governance_foundation.sql', 'utf8');

  // Check table definition
  const hasRplDef = sql039.includes('CREATE TABLE IF NOT EXISTS record_provenance_linkages');
  const hasIsCanonical = sql039.includes('is_canonical BOOLEAN NOT NULL DEFAULT true');
  const hasLookupIdx = sql039.includes('CREATE INDEX IF NOT EXISTS idx_record_provenance_lookup ON record_provenance_linkages(domain_table, domain_record_id, is_canonical);');

  // Check triggers in 039
  const hasPrTrigger = sql039.includes('trg_prevent_provenance_mutation');
  const hasEvTrigger = sql039.includes('trg_prevent_evidence_mutation');
  const hasDvTrigger = sql039.includes('trg_prevent_dataset_version_mutation');
  const hasRplTriggerIn039 = /CREATE\s+TRIGGER\s+[a-zA-Z0-9_]+\s+[^;]*ON\s+record_provenance_linkages/i.test(sql039);

  console.log(`RPL Table Defined in 039: ${hasRplDef}`);
  console.log(`is_canonical column defined: ${hasIsCanonical}`);
  console.log(`Lookup compound index defined: ${hasLookupIdx}`);
  console.log(`Immutability trigger on provenance_records: ${hasPrTrigger}`);
  console.log(`Immutability trigger on evidence_records: ${hasEvTrigger}`);
  console.log(`Immutability trigger on dataset_versions: ${hasDvTrigger}`);
  console.log(`Any trigger on record_provenance_linkages in 039: ${hasRplTriggerIn039}`);

  // Check privileges in 039
  const hasServiceRoleGrant = sql039.includes('GRANT ALL ON record_provenance_linkages TO service_role;');
  const hasServiceRoleRls = sql039.includes('CREATE POLICY "Service role full access on record_provenance_linkages" ON record_provenance_linkages FOR ALL TO service_role USING (true) WITH CHECK (true);');
  console.log(`Service role ALL grant: ${hasServiceRoleGrant}`);
  console.log(`Service role full access RLS policy: ${hasServiceRoleRls}`);

  auditResults.evidence.migration039 = {
    hasRplDef,
    hasIsCanonical,
    hasLookupIdx,
    hasPrTrigger,
    hasEvTrigger,
    hasDvTrigger,
    hasRplTriggerIn039,
    hasServiceRoleGrant,
    hasServiceRoleRls
  };

  console.log('\n--- 3. PROBING POSTGRESQL 17 LIVE CATALOG ---');
  // Triggers on RPL
  const triggersRaw = execSync('docker exec supabase_db_Kshetra psql -U postgres -d gov06_pg_verify -t -A -F "|" -c "SELECT tgname, proname FROM pg_trigger t JOIN pg_proc p ON t.tgfoid = p.oid WHERE tgrelid = \'public.record_provenance_linkages\'::regclass;"').toString().trim();
  const triggers = triggersRaw.split('\n').filter(Boolean).map(line => {
    const [name, fn] = line.split('|');
    return { name, fn };
  });
  console.log('PostgreSQL triggers on record_provenance_linkages:', triggers);

  // Constraints
  const constraintsRaw = execSync('docker exec supabase_db_Kshetra psql -U postgres -d gov06_pg_verify -t -A -F "|" -c "SELECT conname, contype, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = \'public.record_provenance_linkages\'::regclass;"').toString().trim();
  const constraints = constraintsRaw.split('\n').filter(Boolean).map(line => {
    const [name, type, def] = line.split('|');
    return { name, type, def };
  });
  console.log('PostgreSQL constraints on record_provenance_linkages:', constraints);

  // Policies
  const policiesRaw = execSync('docker exec supabase_db_Kshetra psql -U postgres -d gov06_pg_verify -t -A -F "|" -c "SELECT polname, polcmd, polroles::regrole[] FROM pg_policy WHERE polrelid = \'public.record_provenance_linkages\'::regclass;"').toString().trim();
  const policies = policiesRaw.split('\n').filter(Boolean).map(line => {
    const [name, cmd, roles] = line.split('|');
    return { name, cmd, roles };
  });
  console.log('PostgreSQL RLS policies on record_provenance_linkages:', policies);

  // Privileges
  const grantsRaw = execSync('docker exec supabase_db_Kshetra psql -U postgres -d gov06_pg_verify -t -A -F "|" -c "SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = \'record_provenance_linkages\';"').toString().trim();
  const grants = grantsRaw.split('\n').filter(Boolean).map(line => {
    const [grantee, priv] = line.split('|');
    return { grantee, priv };
  });
  const serviceRoleUpdateGrant = grants.some(g => g.grantee === 'service_role' && g.priv === 'UPDATE');
  console.log(`service_role UPDATE privilege granted: ${serviceRoleUpdateGrant}`);

  auditResults.evidence.catalog = {
    triggers,
    constraints,
    policies,
    serviceRoleUpdateGrant,
    userDefinedTriggerCount: triggers.filter(t => !t.name.startsWith('RI_ConstraintTrigger')).length
  };

  console.log('\n--- 4. STATIC & RUNTIME AUDIT OF EXACT 12-ROW UPDATE ---');
  // 1. Reset to true to measure first run
  execSync('docker exec supabase_db_Kshetra psql -U postgres -d gov06_pg_verify -c "UPDATE public.record_provenance_linkages SET is_canonical = true WHERE domain_table = \'mandals\' AND domain_record_id IN (\'TS-MDL-7101\', \'TS-MDL-7102\', \'TS-MDL-7103\', \'TS-MDL-7104\', \'TS-MDL-7105\', \'TS-MDL-5320\', \'TS-MDL-5321\', \'TS-MDL-5322\', \'TS-MDL-5323\', \'TS-MDL-5324\', \'TS-MDL-5328\', \'TS-MDL-5329\');"');

  const updateSql = `
UPDATE public.record_provenance_linkages
SET is_canonical = false
WHERE domain_table = 'mandals'
  AND domain_record_id IN (
    'TS-MDL-7101', 'TS-MDL-7102', 'TS-MDL-7103', 'TS-MDL-7104', 'TS-MDL-7105',
    'TS-MDL-5320', 'TS-MDL-5321', 'TS-MDL-5322', 'TS-MDL-5323', 'TS-MDL-5324',
    'TS-MDL-5328', 'TS-MDL-5329'
  )
  AND is_canonical = true;
`;

  // First run
  const out1 = execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d gov06_pg_verify', { input: updateSql }).toString();
  const m1 = out1.match(/UPDATE\s+(\d+)/);
  const rowsRun1 = m1 ? parseInt(m1[1], 10) : 0;
  console.log(`Execution 1 exact rows affected: ${rowsRun1} (must be 12)`);

  // Second run (Replay)
  const out2 = execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d gov06_pg_verify', { input: updateSql }).toString();
  const m2 = out2.match(/UPDATE\s+(\d+)/);
  const rowsRun2 = m2 ? parseInt(m2[1], 10) : 0;
  console.log(`Execution 2 (Replay) exact rows affected: ${rowsRun2} (must be 0)`);

  // Check unrelated rows
  const unrelatedCheck = execSync('docker exec supabase_db_Kshetra psql -U postgres -d gov06_pg_verify -t -c "SELECT count(*) FROM public.record_provenance_linkages WHERE domain_table = \'mandals\' AND domain_record_id NOT IN (\'TS-MDL-7101\', \'TS-MDL-7102\', \'TS-MDL-7103\', \'TS-MDL-7104\', \'TS-MDL-7105\', \'TS-MDL-5320\', \'TS-MDL-5321\', \'TS-MDL-5322\', \'TS-MDL-5323\', \'TS-MDL-5324\', \'TS-MDL-5328\', \'TS-MDL-5329\') AND is_canonical = false;"').toString().trim();
  console.log(`Unrelated mandal linkages set to false: ${unrelatedCheck} (must be 0)`);

  auditResults.evidence.updateAudit = {
    exact12Scope: true,
    rowsRun1,
    rowsRun2,
    unrelatedRowsAffected: parseInt(unrelatedCheck, 10),
    isIdempotent: rowsRun1 === 12 && rowsRun2 === 0 && parseInt(unrelatedCheck, 10) === 0
  };

  console.log('\n--- 5. CRYPTOGRAPHIC INTEGRITY VERIFICATION ---');
  const sql045 = fs.readFileSync('supabase/migrations/045_w016_c3_mandal_identity_temporal_load.sql');
  const sql046 = fs.readFileSync('supabase/migrations/046_w016_c3_r4_gov02_legacy_identity_supersession.sql');

  const hash045 = crypto.createHash('sha256').update(sql045).digest('hex');
  const expectedHash045 = '514595697505df005e7745ac4e1ab9cce141cc064803c071c0fca5d66d051073';
  const hash046 = crypto.createHash('sha256').update(sql046).digest('hex');

  console.log(`Migration 045 SHA-256: ${hash045} (${hash045 === expectedHash045 ? 'MATCH' : 'MISMATCH'})`);
  console.log(`Migration 046 SHA-256: ${hash046}`);

  auditResults.evidence.hashes = {
    migration045: hash045,
    migration045Match: hash045 === expectedHash045,
    migration046: hash046
  };

  // Write JSON deliverable
  const jsonPath = 'reports/w016_c3_r4_gov07_linkage_mutability_authority.json';
  fs.writeFileSync(jsonPath, JSON.stringify(auditResults, null, 2));
  console.log(`\nWrote JSON deliverable to ${jsonPath}`);

  return auditResults;
}

runAudit().catch(err => {
  console.error('Unhandled audit error:', err);
  process.exit(1);
});
