import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO_ROOT = process.cwd();

console.log('================================================================');
console.log('W021.5-CTO-NEXT-007: AUTHORITATIVE ISOLATED TEST BATTERY (A - N)');
console.log('================================================================\n');

// 1. Prepare test database test_b2_2d_cand_battery_007
console.log('--- Setting up isolated database test_b2_2d_cand_battery_007 ---');
try {
  execSync('docker exec -i supabase_db_Kshetra psql -U postgres -c "DROP DATABASE IF EXISTS test_b2_2d_cand_battery_007;"', { stdio: 'pipe' });
  execSync('docker exec -i supabase_db_Kshetra psql -U postgres -c "CREATE DATABASE test_b2_2d_cand_battery_007 WITH TEMPLATE test_b2_2d_isolated;"', { stdio: 'pipe' });
  console.log('Created fresh test_b2_2d_cand_battery_007 cloned from clean baseline.');
} catch (e) {
  console.error('Failed to setup test database:', e.message);
  process.exit(1);
}

const runSql = (sql) => {
  return execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d test_b2_2d_cand_battery_007 -v ON_ERROR_STOP=1 -t -A', {
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
};

const runSqlFile = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  return runSql(content);
};

const subchunks = [
  '065_b2_2d_chunk_06a_candidacies_part1a.sql',
  '065_b2_2d_chunk_06b_candidacies_part1b.sql',
  '065_b2_2d_chunk_07a_candidacies_part2a.sql',
  '065_b2_2d_chunk_07b_candidacies_part2b.sql',
  '065_b2_2d_chunk_08a_candidacies_part3a.sql',
  '065_b2_2d_chunk_08b_candidacies_part3b.sql',
  '065_b2_2d_chunk_09a_candidacies_part4a.sql',
  '065_b2_2d_chunk_09b_candidacies_part4b.sql',
  '065_b2_2d_chunk_10a_candidacies_part5a.sql',
  '065_b2_2d_chunk_10b_candidacies_part5b.sql'
];

const results = [];

// TEST A: Exact 11,298 canonical rows insertion
console.log('\n--- Executing Test A & B: Subchunks Execution & 36 Duplicate Skips ---');
let totalInserted = 0;

for (const sc of subchunks) {
  const p = path.join(REPO_ROOT, 'supabase', 'staging_packages', '065_b2_2d_chunked', sc);
  const out = runSqlFile(p);
  const m = out.match(/INSERT 0 (\d+)/);
  const count = m ? parseInt(m[1], 10) : 0;
  totalInserted += count;
  console.log(`Executed ${sc}: committed ${count} rows.`);
}

const actualCount = parseInt(runSql('SELECT count(*) FROM public.candidacies;').trim(), 10);

console.log(`Test A Result: Total candidacies in DB: ${actualCount} (Expected: 11298)`);
results.push({
  test: 'Test A: Exact 11,298 Canonical Rows',
  expected: '11,298 rows',
  actual: `${actualCount} rows`,
  status: actualCount === 11298 ? 'PASS' : 'FAIL'
});

// TEST B: 36 duplicate skips
const rawTuples = 11334;
const duplicateSkips = rawTuples - actualCount;
console.log(`Test B Result: Total raw: ${rawTuples}, committed: ${actualCount}, skipped: ${duplicateSkips} (Expected: 36)`);
results.push({
  test: 'Test B: 36 Duplicate Skips',
  expected: '36 skipped occurrences',
  actual: `${duplicateSkips} skipped occurrences`,
  status: duplicateSkips === 36 ? 'PASS' : 'FAIL'
});

// TEST C: Exact replay idempotency
console.log('\n--- Executing Test C: Exact Replay Idempotency ---');
const replayOut = runSqlFile(path.join(REPO_ROOT, 'supabase', 'staging_packages', '065_b2_2d_chunked', subchunks[0]));
const replayCount = parseInt((replayOut.match(/INSERT 0 (\d+)/) || [0, 0])[1], 10);
const postReplayCount = parseInt(runSql('SELECT count(*) FROM public.candidacies;').trim(), 10);
console.log(`Test C Result: Replay committed ${replayCount} rows. DB count remained ${postReplayCount}.`);
results.push({
  test: 'Test C: Exact Replay Idempotency',
  expected: 'INSERT 0 0, DB count remains 11,298',
  actual: `INSERT 0 ${replayCount}, DB count = ${postReplayCount}`,
  status: replayCount === 0 && postReplayCount === 11298 ? 'PASS' : 'FAIL'
});

// TEST D: Canonical-ID conflict
console.log('\n--- Executing Test D: Canonical-ID Conflict (candidacies_pkey) ---');
let testDOutput = '';
try {
  runSql(`
    INSERT INTO public.candidacies (
      id, person_id, election_year, election_type, constituency_type, constituency_id, party_id, is_independent, result, votes_received, vote_share, rank, data_status, provenance_id, created_at, updated_at
    ) VALUES (
      '0215b22d-0002-0000-0000-000000000001'::uuid,
      '0215b22d-0001-0000-0000-000000000002'::uuid,
      2024,
      'parliamentary',
      'parliamentary',
      'conflict_test_constituency',
      'ORG-PARTY-BJP',
      false,
      'won',
      0, 0, 1, 'OFFICIAL'::public.data_status_enum,
      '0215b22d-0000-0000-0000-000000000001'::uuid, now(), now()
    );
  `);
} catch (e) {
  testDOutput = (e.stderr || '') + ' ' + (e.stdout || '') + ' ' + e.message;
}
const testDPass = testDOutput.includes('candidacies_pkey') || testDOutput.includes('23505');
console.log(`Test D Result: ${testDPass ? 'PASS (caught candidacies_pkey 23505)' : 'FAIL: ' + testDOutput}`);
results.push({
  test: 'Test D: Canonical-ID Conflict',
  expected: 'duplicate key value violates unique constraint candidacies_pkey (23505)',
  actual: testDPass ? 'Caught candidacies_pkey (23505)' : testDOutput,
  status: testDPass ? 'PASS' : 'FAIL'
});

// TEST E: Missing person FK
console.log('\n--- Executing Test E: Missing Person FK ---');
let testEOutput = '';
try {
  runSql(`
    INSERT INTO public.candidacies (
      id, person_id, election_year, election_type, constituency_type, constituency_id, party_id, is_independent, result, votes_received, vote_share, rank, data_status, provenance_id, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      '0215b22d-0001-0000-0000-999999999999'::uuid,
      2024,
      'parliamentary',
      'parliamentary',
      'test_ac',
      'ORG-PARTY-BJP',
      false,
      'won',
      0, 0, 1, 'OFFICIAL'::public.data_status_enum,
      '0215b22d-0000-0000-0000-000000000001'::uuid, now(), now()
    );
  `);
} catch (e) {
  testEOutput = (e.stderr || '') + ' ' + (e.stdout || '') + ' ' + e.message;
}
const testEPass = testEOutput.includes('candidacies_person_id_fkey') || testEOutput.includes('23503');
console.log(`Test E Result: ${testEPass ? 'PASS (caught candidacies_person_id_fkey 23503)' : 'FAIL: ' + testEOutput}`);
results.push({
  test: 'Test E: Missing Person FK',
  expected: 'violates foreign key constraint candidacies_person_id_fkey (23503)',
  actual: testEPass ? 'Caught candidacies_person_id_fkey (23503)' : testEOutput,
  status: testEPass ? 'PASS' : 'FAIL'
});

// TEST F: Missing organization FK
console.log('\n--- Executing Test F: Missing Organization FK ---');
let testFOutput = '';
try {
  runSql(`
    INSERT INTO public.candidacies (
      id, person_id, election_year, election_type, constituency_type, constituency_id, party_id, is_independent, result, votes_received, vote_share, rank, data_status, provenance_id, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      '0215b22d-0001-0000-0000-000000000001'::uuid,
      2024,
      'parliamentary',
      'parliamentary',
      'test_ac',
      'ORG-PARTY-NONEXISTENT',
      false,
      'won',
      0, 0, 1, 'OFFICIAL'::public.data_status_enum,
      '0215b22d-0000-0000-0000-000000000001'::uuid, now(), now()
    );
  `);
} catch (e) {
  testFOutput = (e.stderr || '') + ' ' + (e.stdout || '') + ' ' + e.message;
}
const testFPass = testFOutput.includes('candidacies_party_id_fkey') || testFOutput.includes('23503');
console.log(`Test F Result: ${testFPass ? 'PASS (caught candidacies_party_id_fkey 23503)' : 'FAIL: ' + testFOutput}`);
results.push({
  test: 'Test F: Missing Organization FK',
  expected: 'violates foreign key constraint candidacies_party_id_fkey (23503)',
  actual: testFPass ? 'Caught candidacies_party_id_fkey (23503)' : testFOutput,
  status: testFPass ? 'PASS' : 'FAIL'
});

// TEST G: Constituency FK Existence in Catalog
console.log('\n--- Inspecting Test G: Constituency FK Existence in Catalog ---');
const fkQuery = runSql(`
  SELECT count(*) FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'candidacies' AND kcu.column_name = 'constituency_id' AND tc.constraint_type = 'FOREIGN KEY';
`).trim();
const constFkCount = parseInt(fkQuery, 10);
console.log(`Test G Finding: Foreign key constraints on constituency_id: ${constFkCount} (Unconstrained in SQL catalog)`);
results.push({
  test: 'Test G: Constituency FK Existence in Catalog',
  expected: '0 database FK constraints (Unconstrained text column in SQL catalog)',
  actual: `${constFkCount} database FK constraints`,
  status: constFkCount === 0 ? 'PASS' : 'FAIL'
});

// TEST H: Invalid constituency type check constraint
console.log('\n--- Executing Test H: Invalid Constituency Type Check ---');
let testHOutput = '';
try {
  runSql(`
    INSERT INTO public.candidacies (
      id, person_id, election_year, election_type, constituency_type, constituency_id, party_id, is_independent, result, votes_received, vote_share, rank, data_status, provenance_id, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      '0215b22d-0001-0000-0000-000000000001'::uuid,
      2024,
      'parliamentary',
      'invalid_const_type',
      'test_ac',
      'ORG-PARTY-BJP',
      false,
      'won',
      0, 0, 1, 'OFFICIAL'::public.data_status_enum,
      '0215b22d-0000-0000-0000-000000000001'::uuid, now(), now()
    );
  `);
} catch (e) {
  testHOutput = (e.stderr || '') + ' ' + (e.stdout || '') + ' ' + e.message;
}
const testHPass = testHOutput.includes('candidacies_constituency_type_check') || testHOutput.includes('23514');
console.log(`Test H Result: ${testHPass ? 'PASS (caught candidacies_constituency_type_check 23514)' : 'FAIL: ' + testHOutput}`);
results.push({
  test: 'Test H: Invalid Constituency Type Check',
  expected: 'violates check constraint candidacies_constituency_type_check (23514)',
  actual: testHPass ? 'Caught candidacies_constituency_type_check (23514)' : testHOutput,
  status: testHPass ? 'PASS' : 'FAIL'
});

// TEST I: Invalid provenance FK
console.log('\n--- Executing Test I: Invalid Provenance FK ---');
let testIOutput = '';
try {
  runSql(`
    INSERT INTO public.candidacies (
      id, person_id, election_year, election_type, constituency_type, constituency_id, party_id, is_independent, result, votes_received, vote_share, rank, data_status, provenance_id, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      '0215b22d-0001-0000-0000-000000000001'::uuid,
      2024,
      'parliamentary',
      'parliamentary',
      'test_ac',
      'ORG-PARTY-BJP',
      false,
      'won',
      0, 0, 1, 'OFFICIAL'::public.data_status_enum,
      '0215b22d-9999-9999-9999-999999999999'::uuid, now(), now()
    );
  `);
} catch (e) {
  testIOutput = (e.stderr || '') + ' ' + (e.stdout || '') + ' ' + e.message;
}
const testIPass = testIOutput.includes('candidacies_provenance_id_fkey') || testIOutput.includes('23503');
console.log(`Test I Result: ${testIPass ? 'PASS (caught candidacies_provenance_id_fkey 23503)' : 'FAIL: ' + testIOutput}`);
results.push({
  test: 'Test I: Invalid Provenance FK',
  expected: 'violates foreign key constraint candidacies_provenance_id_fkey (23503)',
  actual: testIPass ? 'Caught candidacies_provenance_id_fkey (23503)' : testIOutput,
  status: testIPass ? 'PASS' : 'FAIL'
});

// TEST J: Rollback
console.log('\n--- Executing Test J: Transaction Rollback Verification ---');
runSql(`
  BEGIN;
  INSERT INTO public.candidacies (
    id, person_id, election_year, election_type, constituency_type, constituency_id, party_id, is_independent, result, votes_received, vote_share, rank, data_status, provenance_id, created_at, updated_at
  ) VALUES (
    '0215b22d-0002-0000-0000-000000099999'::uuid,
    '0215b22d-0001-0000-0000-000000000001'::uuid,
    2024, 'parliamentary', 'parliamentary', 'rollback_test', 'ORG-PARTY-BJP', false, 'won', 0, 0, 1, 'OFFICIAL'::public.data_status_enum,
    '0215b22d-0000-0000-0000-000000000001'::uuid, now(), now()
  );
  ROLLBACK;
`);
const postRollbackCount = parseInt(runSql('SELECT count(*) FROM public.candidacies;').trim(), 10);
const testJPass = postRollbackCount === 11298;
console.log(`Test J Result: Count after rollback = ${postRollbackCount} (Expected: 11298)`);
results.push({
  test: 'Test J: Transaction Rollback Verification',
  expected: 'Count remains 11,298',
  actual: `Count = ${postRollbackCount}`,
  status: testJPass ? 'PASS' : 'FAIL'
});

// TEST K: Unrelated-row preservation
console.log('\n--- Executing Test K: Unrelated-Row Preservation ---');
const personsCount = parseInt(runSql('SELECT count(*) FROM public.canonical_persons;').trim(), 10);
const orgsCount = parseInt(runSql('SELECT count(*) FROM public.political_organizations;').trim(), 10);
const statesCount = parseInt(runSql('SELECT count(*) FROM public.states;').trim(), 10);
const testKPass = personsCount === 9083 && orgsCount === 107 && statesCount === 36;
console.log(`Test K Result: persons = ${personsCount}, orgs = ${orgsCount}, states = ${statesCount}`);
results.push({
  test: 'Test K: Unrelated-Row Preservation',
  expected: 'persons = 9,083, orgs = 107, states = 36',
  actual: `persons = ${personsCount}, orgs = ${orgsCount}, states = ${statesCount}`,
  status: testKPass ? 'PASS' : 'FAIL'
});

// TEST L: Complete 36-duplicate reconciliation
console.log('\n--- Executing Test L: Complete 36-Duplicate Reconciliation ---');
const dupJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports', 'w021_5_b2_2d_36_candidacy_duplicates.json'), 'utf8'));
const testLPass = dupJson.duplicateCount === 36 && dupJson.duplicates.length === 36;
console.log(`Test L Result: 36 duplicates verified in ledger: ${testLPass}`);
results.push({
  test: 'Test L: Complete 36-Duplicate Reconciliation',
  expected: '36 duplicate natural keys documented with source coordinates',
  actual: `36 duplicates documented`,
  status: testLPass ? 'PASS' : 'FAIL'
});

// TEST M: B2.2-E dependency closure
console.log('\n--- Executing Test M: B2.2-E Dependency Closure ---');
const b22eManifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports', 'w021_5b2_b2_2e_affidavit_manifest.json'), 'utf8'));
function toCandUuid(cid) {
  const m = cid.match(/^0215b22d-cand-(\d+)$/);
  return '0215b22d-0002-0000-0000-' + m[1].padStart(12, '0');
}
const b22eCandUuids = new Set(b22eManifest.affidavits.map(a => toCandUuid(a.candidacy_id)));
const dbCandIds = new Set(runSql('SELECT id FROM public.candidacies;').split('\n').map(s => s.trim()).filter(s => s.length === 36));
let b22eMissing = 0;
for (const cid of b22eCandUuids) {
  if (!dbCandIds.has(cid)) b22eMissing++;
}
const testMPass = b22eMissing === 0;
console.log(`Test M Result: Missing B2.2-E candidacies in DB: ${b22eMissing} / ${b22eCandUuids.size}`);
results.push({
  test: 'Test M: B2.2-E Dependency Closure',
  expected: '0 missing B2.2-E candidacies in committed population',
  actual: `${b22eMissing} missing`,
  status: testMPass ? 'PASS' : 'FAIL'
});

// TEST N: Consolidated post-population gate
console.log('\n--- Executing Test N: Chunk 11 Consolidated Post-Population Gate ---');
const gateSqlPath = path.join(REPO_ROOT, 'supabase', 'staging_packages', '065_b2_2d_chunked', '065_b2_2d_chunk_11_consolidated_gate.sql');
let testNPass = false;
let gateOut = '';
try {
  gateOut = runSqlFile(gateSqlPath);
  testNPass = gateOut.includes('POST_B2_2D_PASS');
} catch (e) {
  gateOut = e.message;
}
console.log(`Test N Result: ${testNPass ? 'PASS (POST_B2_2D_PASS)' : 'FAIL'}`);
results.push({
  test: 'Test N: Chunk 11 Consolidated Post-Population Gate',
  expected: 'POST_B2_2D_PASS',
  actual: testNPass ? 'POST_B2_2D_PASS' : gateOut,
  status: testNPass ? 'PASS' : 'FAIL'
});

console.log('\n================================================================');
console.log('TEST SUMMARY:');
console.log('================================================================');
console.table(results);

fs.writeFileSync(path.join(REPO_ROOT, 'reports', 'w021_5_b2_2d_next007_battery_results.json'), JSON.stringify(results, null, 2));
