import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

console.log('================================================================');
console.log('W016-C3-R4: PRE-EXECUTION STATIC VALIDATION FOR MIGRATION 045');
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('================================================================\n');

let exitCode = 0;
const results = [];

function check(title, condition, details = '') {
  if (condition) {
    console.log(`[PASS] ${title}`);
    results.push({ check: title, status: 'PASS', details });
  } else {
    console.error(`[FAIL] ${title} - ${details}`);
    results.push({ check: title, status: 'FAIL', details });
    exitCode = 1;
  }
}

const migrationPath = path.resolve('supabase/migrations/045_w016_c3_mandal_identity_temporal_load.sql');
const stagingPackagePath = path.resolve('supabase/staging_migration_package_045.sql');
const matrixPath = path.resolve('docs/w016_c3_stable_identity_lineage_matrix.csv');

check('Migration 045 file exists', fs.existsSync(migrationPath), migrationPath);
check('Staging package 045 file exists', fs.existsSync(stagingPackagePath), stagingPackagePath);

const sqlContent = fs.readFileSync(migrationPath, 'utf8');
const stagingContent = fs.readFileSync(stagingPackagePath, 'utf8');

// Check no BOM
check('No BOM in migration 045', !sqlContent.startsWith('\uFEFF'));
check('No BOM in staging package 045', !stagingContent.startsWith('\uFEFF'));

// Check exact match between canonical and staging package
check('Canonical and staging packages are bitwise identical', sqlContent === stagingContent);

// Check transactional boundary
check('Transactional BEGIN and COMMIT present', sqlContent.includes('BEGIN;') && sqlContent.includes('COMMIT;'));

// Check zero geometry statements
check('Zero ST_ or PostGIS geometry insertion', !sqlContent.includes('INSERT INTO public.entity_geometries') && !sqlContent.includes('INSERT INTO entity_geometries') && !sqlContent.includes('ST_Geom'));

// Check no production target in SQL comments
check('No production target declared in migration', !sqlContent.includes('target: production') && !sqlContent.includes('ehfafcnimmjusyvplbah'));

// Parse lineage matrix
const matrixLines = fs.readFileSync(matrixPath, 'utf8').trim().split('\n').slice(1);
const matrixRows = matrixLines.map(l => {
  const p = l.split(',');
  return {
    mandalId: p[0].trim(),
    versionCode: p[1].trim(),
    validFrom: p[2].trim(),
    validTo: p[3] ? p[3].trim() : null,
    isCurrent: p[4].trim() === 'true',
    dataset: p[7].trim()
  };
});

check('Lineage matrix has 1210 rows', matrixRows.length === 1210, `Found ${matrixRows.length}`);

const stableIds = new Set(matrixRows.map(r => r.mandalId));
check('Exactly 621 unique stable identities in matrix', stableIds.size === 621, `Found ${stableIds.size}`);

const versionCodes = new Set(matrixRows.map(r => r.versionCode));
check('Zero duplicate version codes (1210 unique)', versionCodes.size === 1210, `Found ${versionCodes.size}`);

const historicalRows = matrixRows.filter(r => !r.isCurrent);
const currentRows = matrixRows.filter(r => r.isCurrent);

check('Exactly 589 historical versions', historicalRows.length === 589, `Found ${historicalRows.length}`);
check('Exactly 621 current versions', currentRows.length === 621, `Found ${currentRows.length}`);

// Check all historical rows: is_current=false, valid_to IS NOT NULL, dataset = ts_lgd_mandals_2016_v1
const badHistorical = historicalRows.filter(r => r.isCurrent || !r.validTo || r.dataset !== 'ts_lgd_mandals_2016_v1');
check('All historical rows conform to invariant (is_current=false, valid_to NOT NULL, ts_lgd_mandals_2016_v1)', badHistorical.length === 0, `Bad count: ${badHistorical.length}`);

// Check all current rows: is_current=true, valid_to IS NULL, dataset = ts_lgd_mandals_2026_v1
const badCurrent = currentRows.filter(r => !r.isCurrent || r.validTo !== null || r.dataset !== 'ts_lgd_mandals_2026_v1');
check('All current rows conform to invariant (is_current=true, valid_to NULL, ts_lgd_mandals_2026_v1)', badCurrent.length === 0, `Bad count: ${badCurrent.length}`);

// Check SQL content for row insertion counts
const mandalInsertMatches = [...sqlContent.matchAll(/\('TS-MDL-[0-9]+'/g)];
check('SQL contains 621 mandal anchor records', mandalInsertMatches.length === 621, `Found ${mandalInsertMatches.length}`);

const histInsertMatches = [...sqlContent.matchAll(/'ts_lgd_mandals_2016_v1'/g)];
// Notice dataset_versions has 1 reference, each historical version has 1, each provenance has 1
check('SQL contains historical dataset references', histInsertMatches.length >= 589, `Found ${histInsertMatches.length}`);

const currInsertMatches = [...sqlContent.matchAll(/'ts_lgd_mandals_2026_v1'/g)];
check('SQL contains current dataset references', currInsertMatches.length >= 621, `Found ${currInsertMatches.length}`);

// Check 9 post-2022 split parents and creations
const post2022Creations = [
  { code: 'TS-MDL-7534', date: '2022-11-22' },
  { code: 'TS-MDL-7527', date: '2023-03-15' },
  { code: 'TS-MDL-7519', date: '2023-04-18' },
  { code: 'TS-MDL-7520', date: '2023-04-18' },
  { code: 'TS-MDL-7533', date: '2023-05-12' },
  { code: 'TS-MDL-7517', date: '2023-06-15' },
  { code: 'TS-MDL-7529', date: '2023-08-15' },
  { code: 'TS-MDL-7515', date: '2023-08-15' },
  { code: 'TS-MDL-7536', date: '2023-09-10' }
];

let allCreationsValid = true;
for (const c of post2022Creations) {
  const row = currentRows.find(r => r.mandalId === c.code);
  if (!row || row.validFrom !== c.date) {
    allCreationsValid = false;
    console.error(`Post-2022 creation mismatch for ${c.code}: expected ${c.date}, got ${row?.validFrom}`);
  }
}
check('All 9 post-2022 creation valid_from dates match R3E-R2', allCreationsValid);

// Check 9 post-2022 split parents historical valid_to
const post2022Parents = [
  { code: 'TS-MDL-4371', name: 'Kotagiri', date: '2022-11-22' },
  { code: 'TS-MDL-4664', name: 'Miryalaguda', date: '2023-03-15' },
  { code: 'TS-MDL-4380', name: 'Machareddy', date: '2023-04-18' },
  { code: 'TS-MDL-4385', name: 'Nizamsagar', date: '2023-04-18' },
  { code: 'TS-MDL-4387', name: 'Nagi_Reddypet', date: '2023-04-18' },
  { code: 'TS-MDL-4596', name: 'Gopalpet', date: '2023-05-12' },
  { code: 'TS-MDL-4607', name: 'Itikyal', date: '2023-06-15' },
  { code: 'TS-MDL-4307', name: 'Jainad', date: '2023-08-15' },
  { code: 'TS-MDL-4689', name: 'Mulug', date: '2023-09-10' }
];

let allParentsValid = true;
for (const p of post2022Parents) {
  const row = historicalRows.find(r => r.mandalId === p.code);
  if (!row || row.validTo !== p.date) {
    allParentsValid = false;
    console.error(`Post-2022 parent mismatch for ${p.code} (${p.name}): expected ${p.date}, got ${row?.validTo}`);
  }
}
check('All 9 post-2022 split parents historical valid_to dates match R3E-R2', allParentsValid);

// Check 548 undivided historical rows
const undividedHistorical = historicalRows.filter(r => r.validTo === '2022-09-26');
// Undivided (548) + 2022 split parents (24) = 572 total rows terminating on 2022-09-26
check('Historical termination on 2022-09-26 count equals 572 (548 undivided + 24 split parents)', undividedHistorical.length === 572, `Found ${undividedHistorical.length}`);

// Check 2020 split parents (8) terminating on 2020-09-24
const split2020Historical = historicalRows.filter(r => r.validTo === '2020-09-24');
check('Historical termination on 2020-09-24 count equals 8 (2020 split parents)', split2020Historical.length === 8, `Found ${split2020Historical.length}`);

const hash = crypto.createHash('sha256').update(sqlContent, 'utf8').digest('hex');
console.log(`\nMigration 045 SHA-256 Checksum: ${hash}`);
console.log(`\n================================================================`);
console.log(`STATIC VALIDATION RESULT: ${exitCode === 0 ? 'ALL CHECKS PASSED' : 'FAILURES DETECTED'}`);
console.log(`================================================================\n`);

process.exit(exitCode);
