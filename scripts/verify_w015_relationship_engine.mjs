/**
 * scripts/verify_w015_relationship_engine.mjs
 * Static Preflight & Schema Integrity Validation for W015
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

console.log('=== W015 STATIC PREFLIGHT & INTEGRITY VALIDATOR ===\n');

const migrationFiles = [
  'supabase/migrations/042_geography_relationship_engine.sql',
  'supabase/staging_migration_package_042.sql'
];

for (const file of migrationFiles) {
  if (!fs.existsSync(file)) {
    console.error(`[FAIL] File ${file} not found`);
    exitCode = 1;
    continue;
  }

  const content = fs.readFileSync(file, 'utf8');
  check(`No BOM in ${file}`, !content.startsWith('\uFEFF'));
  check(`Transactional BEGIN/COMMIT in ${file}`, content.includes('BEGIN;') && content.includes('COMMIT;'));
  check(`DEF-15-01 district_id FK present in ${file}`, content.includes('district_id UUID REFERENCES public.districts(id)'));
  check(`DEF-15-02 constituency_internal_id FK present in ${file}`, content.includes('constituency_internal_id UUID REFERENCES public.constituencies(internal_id)'));
  check(`RLS enabled on mandals in ${file}`, content.includes('ALTER TABLE public.mandals ENABLE ROW LEVEL SECURITY;'));
  check(`RLS enabled on mandal_constituency_map in ${file}`, content.includes('ALTER TABLE public.mandal_constituency_map ENABLE ROW LEVEL SECURITY;'));
  check(`RLS enabled on polling_booths in ${file}`, content.includes('ALTER TABLE public.polling_booths ENABLE ROW LEVEL SECURITY;'));
  check(`Dataset version default_status is UNVERIFIED in ${file}`, content.includes("'UNVERIFIED'"));
  check(`No quantitative overlap_percentage required in ${file}`, !content.includes('overlap_percentage ='));
  check(`Discrete overlap_type full/partial present in ${file}`, content.includes("'full'") && content.includes("'partial'"));
}

const verifyFile = 'supabase/verify_staging_migration_package_042.sql';
if (fs.existsSync(verifyFile)) {
  const content = fs.readFileSync(verifyFile, 'utf8');
  check(`No BOM in ${verifyFile}`, !content.startsWith('\uFEFF'));
  check(`Contains DO $$ block in ${verifyFile}`, content.includes('DO $$') && content.includes('END $$;'));
  check(`Contains Check 6 PASS in ${verifyFile}`, content.includes('Check 6 PASS'));
} else {
  console.error(`[FAIL] Verification file ${verifyFile} not found`);
  exitCode = 1;
}

const rollbackFile = 'supabase/rollback_staging_migration_package_042.sql';
if (fs.existsSync(rollbackFile)) {
  const content = fs.readFileSync(rollbackFile, 'utf8');
  check(`No BOM in ${rollbackFile}`, !content.startsWith('\uFEFF'));
  check(`Transactional BEGIN/COMMIT in ${rollbackFile}`, content.includes('BEGIN;') && content.includes('COMMIT;'));
  check(`Trigger suspension present in ${rollbackFile}`, content.includes('DISABLE TRIGGER trg_prevent_provenance_mutation'));
} else {
  console.error(`[FAIL] Rollback file ${rollbackFile} not found`);
  exitCode = 1;
}

if (exitCode === 0) {
  console.log('\n[PASS] All W015 static validation checks passed successfully.');
} else {
  console.error('\n[FAIL] Static validation failed.');
}

process.exit(exitCode);
