import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const STAGING_DIR = path.join(ROOT_DIR, 'supabase');
const PROD_DIR = path.join(ROOT_DIR, 'supabase', 'production_packages');

function stripOuterTransaction(sql) {
  let cleaned = sql.replace(/^\s*BEGIN\s*;\s*$/gm, '');
  cleaned = cleaned.replace(/^\s*COMMIT\s*;\s*$/gm, '');
  return cleaned.trim();
}

console.log('=== BUILDING PRODUCTION PREREQUISITE PACKAGES (035 - 042) ===');

// 1. Package 00A: Migrations 035 to 039
const p35_37 = fs.readFileSync(path.join(STAGING_DIR, 'staging_migration_package_035_037.sql'), 'utf-8');
const p38 = fs.readFileSync(path.join(STAGING_DIR, 'staging_migration_package_038.sql'), 'utf-8');
const p39 = fs.readFileSync(path.join(STAGING_DIR, 'staging_migration_package_039.sql'), 'utf-8');

const provenancePatch = `
-- Defensive patch: Ensure public.provenance_records has all 039 columns even if pre-created by 050
ALTER TABLE public.provenance_records
  ADD COLUMN IF NOT EXISTS dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS source_record_id TEXT,
  ADD COLUMN IF NOT EXISTS parent_provenance_id UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS status public.data_status_enum NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS transformation_type TEXT NOT NULL DEFAULT 'raw_ingest',
  ADD COLUMN IF NOT EXISTS transform_version TEXT,
  ADD COLUMN IF NOT EXISTS operator TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS verification_evidence_id UUID REFERENCES public.evidence_records(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
`;

const pkg00aContent = `-- ==============================================================================
-- Production Prerequisites Part A: Governance, Commerce & Security Foundation
-- Migrations: 035-037 (Campaign Recharge, Foundation Repair, Page Pro Orders)
--             038 (Security Baseline & RLS Hardening)
--             039 (Data Governance Foundation: Datasets, Provenance, Evidence)
-- Target: Production Supabase (ehfafcnimmjusyvplbah)
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- SUB-COMPONENT: Migrations 035-037 Commerce & Core Foundation
-- ------------------------------------------------------------------------------
${stripOuterTransaction(p35_37)}

-- ------------------------------------------------------------------------------
-- SUB-COMPONENT: Migration 038 Security Baseline & RLS Hardening
-- ------------------------------------------------------------------------------
${stripOuterTransaction(p38)}

-- ------------------------------------------------------------------------------
-- SUB-COMPONENT: Migration 039 Data Governance & Provenance Architecture
-- ------------------------------------------------------------------------------
${stripOuterTransaction(p39)}

${provenancePatch}

COMMIT;
`;

const pkg00aPath = path.join(PROD_DIR, '00a_prod_prereq_governance_and_security_035_039.sql');
fs.writeFileSync(pkg00aPath, pkg00aContent, 'utf-8');
console.log(`[CREATED] 00a_prod_prereq_governance_and_security_035_039.sql (${fs.statSync(pkg00aPath).size} bytes)`);

// 2. Package 00B: Migration 040 (Canonical Geography Model Foundation)
const p40 = fs.readFileSync(path.join(STAGING_DIR, 'staging_migration_package_040.sql'), 'utf-8');
const pkg00bPath = path.join(PROD_DIR, '00b_prod_prereq_canonical_geography_040.sql');
fs.writeFileSync(pkg00bPath, p40, 'utf-8');
console.log(`[CREATED] 00b_prod_prereq_canonical_geography_040.sql (${fs.statSync(pkg00bPath).size} bytes)`);

// 3. Package 00C: Migrations 041 & 042 (Geography Versioning & Relationship Engine)
const p41 = fs.readFileSync(path.join(STAGING_DIR, 'staging_migration_package_041.sql'), 'utf-8');
const p42 = fs.readFileSync(path.join(STAGING_DIR, 'staging_migration_package_042.sql'), 'utf-8');

const pkg00cContent = `-- ==============================================================================
-- Production Prerequisites Part C: Geography Versioning & Relationship Engine
-- Migrations: 041 (Geography Versioning, Delimitation Regimes, State Versions)
--             042 (Geography Relationship Engine: Districts, ACs, Mandals)
-- Target: Production Supabase (ehfafcnimmjusyvplbah)
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- SUB-COMPONENT: Migration 041 Geography Versioning & Temporal Validity
-- ------------------------------------------------------------------------------
${stripOuterTransaction(p41)}

-- ------------------------------------------------------------------------------
-- SUB-COMPONENT: Migration 042 Geography Relationship Engine
-- ------------------------------------------------------------------------------
${stripOuterTransaction(p42)}

COMMIT;
`;

const pkg00cPath = path.join(PROD_DIR, '00c_prod_prereq_geography_versioning_041_042.sql');
fs.writeFileSync(pkg00cPath, pkg00cContent, 'utf-8');
console.log(`[CREATED] 00c_prod_prereq_geography_versioning_041_042.sql (${fs.statSync(pkg00cPath).size} bytes)`);

console.log('=== PREREQUISITE PACKAGES BUILT SUCCESSFULLY ===');
