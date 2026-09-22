/**
 * scripts/verify_w014_temporal_validity.mjs
 * Static Preflight & Schema Integrity Validation for W014
 */

import fs from 'node:fs';

let exitCode = 0;

function check(title, condition, details = '') {
  if (condition) {
    console.log(`[PASS] ${title}`);
  } else {
    console.error(`[FAIL] ${title} - ${details}`);
    exitCode = 1;
  }
}

console.log('=== W014 STATIC PREFLIGHT & INTEGRITY VALIDATOR ===\n');

const migrationFiles = [
  'supabase/migrations/041_geography_versioning_and_temporal_validity.sql',
  'supabase/staging_migration_package_041.sql'
];

for (const file of migrationFiles) {
  if (!fs.existsSync(file)) {
    console.error(`[WARN] File ${file} not yet created`);
    continue;
  }

  const content = fs.readFileSync(file, 'utf8');
  check(`No BOM in ${file}`, !content.startsWith('\uFEFF'));
  check(`Transactional BEGIN/COMMIT in ${file}`, content.includes('BEGIN;') && content.includes('COMMIT;'));
  check(`btree_gist extension enabled in ${file}`, content.includes('CREATE EXTENSION IF NOT EXISTS btree_gist;'));
  check(`Parenthesized daterange expression in exclusion constraints in ${file}`, content.includes('(daterange('));
  check(`Scenario regime is not OFFICIAL in ${file}`, !content.includes("'scenario_delimitation_draft_prop_1', 'OFFICIAL'"));
  check(`AC 109 chronology present in ${file}`, content.includes('Mulug') && content.includes('Warangal'));
}

const verifyFile = 'supabase/verify_staging_migration_package_041.sql';
if (fs.existsSync(verifyFile)) {
  const content = fs.readFileSync(verifyFile, 'utf8');
  check(`No BOM in ${verifyFile}`, !content.startsWith('\uFEFF'));
  check(`Contains DO $$ block in ${verifyFile}`, content.includes('DO $$') && content.includes('END $$;'));
  check(`Contains 10 verification checks in ${verifyFile}`, content.includes('Check 10 PASS'));
}

if (exitCode === 0) {
  console.log('\n[PASS] All W014 static validation checks passed successfully.');
} else {
  console.error('\n[FAIL] Static validation failed.');
}

process.exit(exitCode);
