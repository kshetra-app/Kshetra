import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const STAGING_DIR = path.join(ROOT_DIR, 'supabase', 'staging_packages');
const PROD_DIR = path.join(ROOT_DIR, 'supabase', 'production_packages');

if (!fs.existsSync(PROD_DIR)) {
  fs.mkdirSync(PROD_DIR, { recursive: true });
}

console.log('=== ASSEMBLING PRODUCTION PHASE 1 PACKAGES (< 700 KB CHUNKS) ===');

// 1. Package 01: Migration 050
const pkg01Src = fs.readFileSync(path.join(STAGING_DIR, '050_political_entity_model.sql'), 'utf-8');
const pkg01Path = path.join(PROD_DIR, '01_prod_phase1_core_entity_model_050.sql');
fs.writeFileSync(pkg01Path, pkg01Src, 'utf-8');
console.log(`[CREATED] 01_prod_phase1_core_entity_model_050.sql (${fs.statSync(pkg01Path).size} bytes)`);

// 2. Package 02a & 02b: Splitting 059-R1
const p059Src = fs.readFileSync(path.join(STAGING_DIR, '059-R1_temporal_reconciliation.sql'), 'utf-8');
const splitMarker = '-- ─── 7. CANONICAL ASSEMBLY CONSTITUENCIES (4,123 ACS) ───';
const splitIdx = p059Src.indexOf(splitMarker);

if (splitIdx === -1) {
  throw new Error(`Split marker not found in 059-R1: ${splitMarker}`);
}

// 02a: Header up to splitIdx + COMMIT
let pkg02aContent = p059Src.substring(0, splitIdx).trim();
// Ensure fail-closed precondition 3 checks parliamentary_constituencies or allows re-run without constituency block
pkg02aContent += '\n\nCOMMIT;\n';

const pkg02aPath = path.join(PROD_DIR, '02a_prod_phase1_jurisdictions_and_pcs_059.sql');
fs.writeFileSync(pkg02aPath, pkg02aContent, 'utf-8');
console.log(`[CREATED] 02a_prod_phase1_jurisdictions_and_pcs_059.sql (${fs.statSync(pkg02aPath).size} bytes)`);

// 02b: BEGIN + splitIdx to end
let pkg02bContent = `-- ==============================================================================
-- Production Phase 1 - Step 2b: Canonical Assembly Constituencies (4,123 ACs)
-- Target: Production Supabase (ehfafcnimmjusyvplbah)
-- Derived from: 059-R1_temporal_reconciliation.sql (Sections 7-10)
-- ==============================================================================

BEGIN;

` + p059Src.substring(splitIdx);

const pkg02bPath = path.join(PROD_DIR, '02b_prod_phase1_assembly_constituencies_059.sql');
fs.writeFileSync(pkg02bPath, pkg02bContent, 'utf-8');
console.log(`[CREATED] 02b_prod_phase1_assembly_constituencies_059.sql (${fs.statSync(pkg02bPath).size} bytes)`);

// 3. Package 03: Migration 060
const pkg03Src = fs.readFileSync(path.join(STAGING_DIR, '060_canonical_electoral_geography_remediation.sql'), 'utf-8');
const pkg03Path = path.join(PROD_DIR, '03_prod_phase1_electoral_geography_remediation_060.sql');
fs.writeFileSync(pkg03Path, pkg03Src, 'utf-8');
console.log(`[CREATED] 03_prod_phase1_electoral_geography_remediation_060.sql (${fs.statSync(pkg03Path).size} bytes)`);

// 4. Package 04: Migration 061
const pkg04Src = fs.readFileSync(path.join(STAGING_DIR, '061_canonical_national_ac_pc_mappings.sql'), 'utf-8');
const pkg04Path = path.join(PROD_DIR, '04_prod_phase1_canonical_ac_pc_mappings_061.sql');
fs.writeFileSync(pkg04Path, pkg04Src, 'utf-8');
console.log(`[CREATED] 04_prod_phase1_canonical_ac_pc_mappings_061.sql (${fs.statSync(pkg04Path).size} bytes)`);

// 5. Package 05: Migrations 062-R1, 063-R4, 064-R8, plus deduplication patch
const p062 = fs.readFileSync(path.join(STAGING_DIR, '062-R1_canonical_assam_2023_delimitation.sql'), 'utf-8');
const p063 = fs.readFileSync(path.join(STAGING_DIR, '063-R4_canonical_political_identity_foundation.sql'), 'utf-8');
const p064 = fs.readFileSync(path.join(STAGING_DIR, '064-R8_political_organization_governance_remediation.sql'), 'utf-8');
const p064Dedup = fs.readFileSync(path.join(STAGING_DIR, '064_065_organization_relationships_dedup_and_constraint.sql'), 'utf-8');

function stripOuterTransaction(sql) {
  let cleaned = sql.replace(/^\s*BEGIN\s*;\s*$/gm, '');
  cleaned = cleaned.replace(/^\s*COMMIT\s*;\s*$/gm, '');
  return cleaned.trim();
}

const pkg05Content = `-- ==============================================================================
-- Production Phase 1 - Step 5: Delimitation, Political Identity & Org Governance
-- Migrations: 062-R1 (Assam Delimitation), 063-R4 (Identity Foundation), 
--             064-R8 (Organization Governance Remediation & Hardening),
--             and DEC-162 Relationship Deduplication & Unique Constraint
-- Target: Production Supabase (ehfafcnimmjusyvplbah)
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- SUB-COMPONENT: 062-R1 Canonical Assam 2023 Delimitation
-- ------------------------------------------------------------------------------
${stripOuterTransaction(p062)}

-- ------------------------------------------------------------------------------
-- SUB-COMPONENT: 063-R4 Canonical Political Identity Foundation
-- ------------------------------------------------------------------------------
${stripOuterTransaction(p063)}

-- ------------------------------------------------------------------------------
-- SUB-COMPONENT: 064-R8 Political Organization Governance Remediation
-- ------------------------------------------------------------------------------
${stripOuterTransaction(p064)}

-- ------------------------------------------------------------------------------
-- SUB-COMPONENT: DEC-162 Organization Relationships Deduplication & Natural Key Guard
-- ------------------------------------------------------------------------------
${stripOuterTransaction(p064Dedup)}

COMMIT;
`;

const pkg05Path = path.join(PROD_DIR, '05_prod_phase1_delimitation_identity_governance_062_064.sql');
fs.writeFileSync(pkg05Path, pkg05Content, 'utf-8');
console.log(`[CREATED] 05_prod_phase1_delimitation_identity_governance_062_064.sql (${fs.statSync(pkg05Path).size} bytes)`);

// 6. Package 06: Migration 065 (107 parties + aliases) + Migration 066 (Civic Extensions Schema)
const p065 = fs.readFileSync(path.join(STAGING_DIR, '065_canonical_political_organization_registry.sql'), 'utf-8');
const p066 = fs.readFileSync(path.join(STAGING_DIR, '066_downstream_civic_extensions.sql'), 'utf-8');

const pkg06Content = `-- ==============================================================================
-- Production Phase 1 - Step 6: Canonical Political Organizations & Civic Extensions Schema
-- Migrations: 065 (107 Parties, 1,043 Aliases, Anchor 0215b22c-0000-0000-0000-000000000001)
--             066 (Downstream Civic Extensions Schema: Demographics, Lineage, Affidavits FKs)
-- Target: Production Supabase (ehfafcnimmjusyvplbah)
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- SUB-COMPONENT: 065 Canonical Political Organization Registry
-- ------------------------------------------------------------------------------
${stripOuterTransaction(p065)}

-- ------------------------------------------------------------------------------
-- SUB-COMPONENT: 066 Downstream Civic Extensions Schema
-- ------------------------------------------------------------------------------
${stripOuterTransaction(p066)}

COMMIT;
`;

const pkg06Path = path.join(PROD_DIR, '06_prod_phase1_political_organizations_and_civic_schema_065_066.sql');
fs.writeFileSync(pkg06Path, pkg06Content, 'utf-8');
console.log(`[CREATED] 06_prod_phase1_political_organizations_and_civic_schema_065_066.sql (${fs.statSync(pkg06Path).size} bytes)`);

// 7. Package 07: Post-Phase 1 Production Verification Gate Query
const pkg07Content = `-- ==============================================================================
-- Production Phase 1 Verification Gate
-- Target: Production Supabase (ehfafcnimmjusyvplbah)
-- Mode: Strictly READ-ONLY (0 mutations, 0 DDL)
-- Authority: Master Execution Framework Amendment v1.6 / DEC-164
-- ==============================================================================

WITH
-- 1. States & UTs (Expected: 36 states, 36 versions)
check_states AS (
  SELECT
    (SELECT count(*) FROM public.states) AS total_states,
    (SELECT count(*) FROM public.state_versions WHERE is_current = true) AS current_state_versions
),
-- 2. Parliamentary Constituencies (Expected: 543 PCs, 543 versions)
check_pcs AS (
  SELECT
    (SELECT count(*) FROM public.parliamentary_constituencies) AS total_pcs,
    (SELECT count(*) FROM public.parliamentary_constituency_versions WHERE is_current = true) AS current_pc_versions
),
-- 3. Assembly Constituencies (Expected: 4,123 ACs, 4,123 versions)
check_acs AS (
  SELECT
    (SELECT count(*) FROM public.constituencies) AS total_acs,
    (SELECT count(*) FROM public.constituency_versions WHERE is_current = true) AS current_ac_versions
),
-- 4. AC <-> PC Mappings (Expected: 4,123 mappings)
check_mappings AS (
  SELECT
    (SELECT count(*) FROM public.constituency_parliamentary_mappings WHERE is_current = true) AS current_mappings,
    (SELECT count(DISTINCT constituency_id) FROM public.constituency_parliamentary_mappings WHERE is_current = true) AS distinct_acs_mapped
),
-- 5. Political Organizations (Expected: 107 canonical orgs, 1,043 aliases, 27 multilingual, 19 symbols, 10 rels)
check_orgs AS (
  SELECT
    (SELECT count(*) FROM public.political_organizations) AS total_orgs,
    (SELECT count(*) FROM public.organization_aliases) AS total_aliases,
    (SELECT count(*) FROM public.organization_multilingual_names) AS total_multilingual,
    (SELECT count(*) FROM public.organization_symbols) AS total_symbols,
    (SELECT count(*) FROM public.organization_relationships) AS total_relationships
),
-- 6. Batch Provenance Anchor (Expected: 1 anchor for B2.2-C)
check_provenance AS (
  SELECT
    (SELECT count(*) FROM public.provenance_records WHERE id = '0215b22c-0000-0000-0000-000000000001'::uuid) AS b2_2c_anchor_present
),
-- 7. Civic Schema & Extension Tables (Expected: tables exist with valid columns)
check_schema AS (
  SELECT
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (
      'canonical_persons', 'candidacies', 'elected_tenures', 'person_party_affiliations',
      'tenure_party_switches', 'tenure_vacancies', 'person_multilingual_identities',
      'candidate_affidavits', 'constituency_demographics', 'constituency_lineage'
    )) AS extension_tables_count,
    (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidate_affidavits' AND column_name IN ('person_id', 'candidacy_id', 'provenance_id', 'data_status')) AS affidavit_enhancement_columns
),
-- 8. Synthetic Independent Organizations Check (Expected: 0 synthetic independent orgs)
check_synthetic AS (
  SELECT
    (SELECT count(*) FROM public.political_organizations WHERE id ILIKE '%indep%' OR name ILIKE '%indep%' OR (ec_party_code IS NOT NULL AND ec_party_code ILIKE '%indep%')) AS synth_orgs
)

SELECT
  'check_01' AS check_id,
  'National Jurisdictions (States & UTs)' AS check_name,
  'states: ' || s.total_states || ', versions: ' || s.current_state_versions AS actual_value,
  'states: 36, versions: 36' AS expected_value,
  CASE WHEN s.total_states = 36 AND s.current_state_versions = 36 THEN 'PASS' ELSE 'FAIL' END AS status,
  'All 36 States & Union Territories established with current versions' AS details
FROM check_states s

UNION ALL

SELECT
  'check_02',
  'Parliamentary Constituencies (543 PCs)',
  'pcs: ' || p.total_pcs || ', versions: ' || p.current_pc_versions,
  'pcs: 543, versions: 543',
  CASE WHEN p.total_pcs = 543 AND p.current_pc_versions = 543 THEN 'PASS' ELSE 'FAIL' END,
  '543 Lok Sabha Parliamentary Constituencies canonicalized'
FROM check_pcs p

UNION ALL

SELECT
  'check_03',
  'Assembly Constituencies (4,123 ACs)',
  'acs: ' || a.total_acs || ', versions: ' || a.current_ac_versions,
  'acs: 4123, versions: 4123',
  CASE WHEN a.total_acs = 4123 AND a.current_ac_versions = 4123 THEN 'PASS' ELSE 'FAIL' END,
  '4,123 Vidhan Sabha Assembly Constituencies canonicalized'
FROM check_acs a

UNION ALL

SELECT
  'check_04',
  'National AC <-> PC Statutory Mappings',
  'mappings: ' || m.current_mappings || ', distinct_acs: ' || m.distinct_acs_mapped,
  'mappings: 4123, distinct_acs: 4123',
  CASE WHEN m.current_mappings = 4123 AND m.distinct_acs_mapped = 4123 THEN 'PASS' ELSE 'FAIL' END,
  '100% of 4,123 Assembly Constituencies mapped to statutory parent Parliamentary Constituencies'
FROM check_mappings m

UNION ALL

SELECT
  'check_05',
  'Canonical Political Organizations Registry',
  'orgs: ' || o.total_orgs || ', aliases: ' || o.total_aliases || ', multilingual: ' || o.total_multilingual || ', symbols: ' || o.total_symbols || ', rels: ' || o.total_relationships,
  'orgs: 107, aliases: 1043, multilingual: 27, symbols: 19, rels: 10',
  CASE WHEN o.total_orgs = 107 AND o.total_aliases = 1043 AND o.total_multilingual = 27 AND o.total_symbols = 19 AND o.total_relationships = 10 THEN 'PASS' ELSE 'FAIL' END,
  '107 recognized political organizations and associated child registries verified'
FROM check_orgs o

UNION ALL

SELECT
  'check_06',
  'B2.2-C Provenance Anchor 0215b22c',
  'anchor_present: ' || pr.b2_2c_anchor_present,
  'anchor_present: 1',
  CASE WHEN pr.b2_2c_anchor_present = 1 THEN 'PASS' ELSE 'FAIL' END,
  'Batch provenance anchor 0215b22c-0000-0000-0000-000000000001 verified'
FROM check_provenance pr

UNION ALL

SELECT
  'check_07',
  'Downstream Civic Schema & Extension Tables',
  'tables: ' || sc.extension_tables_count || '/10, affidavit_cols: ' || sc.affidavit_enhancement_columns || '/4',
  'tables: 10/10, affidavit_cols: 4/4',
  CASE WHEN sc.extension_tables_count = 10 AND sc.affidavit_enhancement_columns = 4 THEN 'PASS' ELSE 'FAIL' END,
  'Core political model and civic extension tables deployed with foreign key columns'
FROM check_schema sc

UNION ALL

SELECT
  'check_08',
  'Zero Synthetic Independent Organizations',
  'synth_orgs: ' || sy.synth_orgs,
  'synth_orgs: 0',
  CASE WHEN sy.synth_orgs = 0 THEN 'PASS' ELSE 'FAIL' END,
  'Strict prohibition of synthetic independent political organization entities verified'
FROM check_synthetic sy

UNION ALL

SELECT
  'check_09',
  'Phase 1 Consolidated Schema Gate Aggregate Verdict',
  'verdict: ' || CASE WHEN
    s.total_states = 36 AND s.current_state_versions = 36 AND
    p.total_pcs = 543 AND p.current_pc_versions = 543 AND
    a.total_acs = 4123 AND a.current_ac_versions = 4123 AND
    m.current_mappings = 4123 AND m.distinct_acs_mapped = 4123 AND
    o.total_orgs = 107 AND o.total_aliases = 1043 AND o.total_multilingual = 27 AND o.total_symbols = 19 AND o.total_relationships = 10 AND
    pr.b2_2c_anchor_present = 1 AND
    sc.extension_tables_count = 10 AND sc.affidavit_enhancement_columns = 4 AND
    sy.synth_orgs = 0
  THEN 'PROD_PHASE1_PASS' ELSE 'PROD_PHASE1_FAIL' END,
  'verdict: PROD_PHASE1_PASS',
  CASE WHEN
    s.total_states = 36 AND s.current_state_versions = 36 AND
    p.total_pcs = 543 AND p.current_pc_versions = 543 AND
    a.total_acs = 4123 AND a.current_ac_versions = 4123 AND
    m.current_mappings = 4123 AND m.distinct_acs_mapped = 4123 AND
    o.total_orgs = 107 AND o.total_aliases = 1043 AND o.total_multilingual = 27 AND o.total_symbols = 19 AND o.total_relationships = 10 AND
    pr.b2_2c_anchor_present = 1 AND
    sc.extension_tables_count = 10 AND sc.affidavit_enhancement_columns = 4 AND
    sy.synth_orgs = 0
  THEN 'PASS' ELSE 'FAIL' END,
  'All 8 sub-checks must pass for Phase 1 certification'
FROM check_states s, check_pcs p, check_acs a, check_mappings m, check_orgs o, check_provenance pr, check_schema sc, check_synthetic sy
ORDER BY check_id;
`;

const pkg07Path = path.join(PROD_DIR, '07_prod_phase1_verification_gate.sql');
fs.writeFileSync(pkg07Path, pkg07Content, 'utf-8');
console.log(`[CREATED] 07_prod_phase1_verification_gate.sql (${fs.statSync(pkg07Path).size} bytes)`);

console.log('=== PHASE 1 ASSEMBLY COMPLETE ===');
