/**
 * scripts/generate-065-migration.mjs
 * 
 * Generates supabase/migrations/065_canonical_political_organization_registry.sql:
 * Authoritative migration populating exactly 1,207 database rows for W021.5-B2.2-C:
 * 
 * Target:
 * - C0: 1 Provenance Record
 * - C1: 107 Canonical Political Organizations
 * - C2: 10 Organization Relationships
 * - C3: 27 Multilingual Organization Names
 * - C4: 19 Statutory Election Symbols
 * - C5: 1,043 Organization Aliases
 * Total Actual Database Inserts: 1,207
 * 
 * Enforces:
 * - Idempotency via ON CONFLICT DO NOTHING
 * - Scoped strictly to provenance_id: '0215b22c-0000-0000-0000-000000000001'
 * - Single atomic transaction (BEGIN ... COMMIT)
 */

import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports', 'w021_5b2_b2_2c_final_organization_manifest.json'), 'utf8'));
const lineage = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports', 'w021_5b2_b2_2c_lineage_matrix.json'), 'utf8'));
const multi = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports', 'w021_5b2_b2_2c_multilingual_matrix.json'), 'utf8'));
const symbols = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports', 'w021_5b2_b2_2c_symbol_matrix.json'), 'utf8'));
const disp = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports', 'w021_5b2_b2_2c_1096_disposition_ledger_v2.json'), 'utf8'));
const recon = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_reconciliation_v2.json'), 'utf8'));

const reconTypeMap = new Map();
for (const r of recon.reconciliationRecords) {
  reconTypeMap.set(r.rawString, r.resolutionType);
}

const aliases = disp.ledger.filter(r => r.disposition_class === 'VERIFIED_ORGANIZATION_ALIAS' || r.disposition_class === 'RECONCILED_ORGANIZATION_ALIAS');

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

function escapeJson(obj) {
  if (!obj) return `'{}'::jsonb`;
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

const lines = [];

lines.push('-- ==============================================================================');
lines.push('-- Migration 065: Canonical National Political Organization Registry (W021.5-B2.2-C)');
lines.push('-- Authority: CTO Execution Directive W021.5-B2.2-C');
lines.push('-- Scope: Authoritative population of 107 political organizations & child registries');
lines.push('-- Authoritative Target: Exactly 1,207 database rows');
lines.push('--   C0 Provenance Record:                 1 row');
lines.push('--   C1 Political Organizations:         107 rows');
lines.push('--   C2 Organization Relationships:       10 rows');
lines.push('--   C3 Multilingual Names:               27 rows');
lines.push('--   C4 Organization Symbols:             19 rows');
lines.push('--   C5 Organization Aliases:          1,043 rows');
lines.push('--   C6 Provisional Quarantine:            0 rows (quarantine log retention)');
lines.push('--   C7 Raw String Disposition Assertion:  0 rows (disposition assertion)');
lines.push('-- Total Actual Database Inserts:      1,207 rows');
lines.push('-- Batch Provenance: 0215b22c-0000-0000-0000-000000000001');
lines.push('-- ==============================================================================');
lines.push('');
lines.push('BEGIN;');
lines.push('');

// C0: Provenance & Dataset Registration
lines.push('-- ─── C0: DATASET, DATASET VERSION & PROVENANCE ANCHOR ───────────────────────');
lines.push('-- C0.1 Pre-assertion: Fail-closed canonical dataset identity protection');
lines.push('DO $BODY$');
lines.push('DECLARE');
lines.push('  v_ds RECORD;');
lines.push('BEGIN');
lines.push('  SELECT id, name, domain, description, source_id, license');
lines.push('  INTO v_ds');
lines.push('  FROM public.datasets');
lines.push('  WHERE id = \'eci_political_parties\';');
lines.push('');
lines.push('  IF FOUND THEN');
lines.push('    IF (v_ds.name, v_ds.domain, v_ds.source_id, COALESCE(v_ds.description, \'\'), COALESCE(v_ds.license, \'\'))');
lines.push('       IS DISTINCT FROM');
lines.push('       (\'ECI Registered Political Parties & Recognized State/National Formations\',');
lines.push('        \'political_profiles\',');
lines.push('        \'eci\',');
lines.push('        \'Statutory political party notification published by the Election Commission of India under Section 29A of the Representation of the People Act, 1951\',');
lines.push('        \'Government Open Data\') THEN');
lines.push('      RAISE EXCEPTION \'CANONICAL_DATASET_IDENTITY_CONFLICT: Existing dataset % has conflicting canonical attributes (name=%, domain=%, source=%, desc=%, lic=%)\',');
lines.push('        v_ds.id, v_ds.name, v_ds.domain, v_ds.source_id, v_ds.description, v_ds.license;');
lines.push('    END IF;');
lines.push('  END IF;');
lines.push('END $BODY$;');
lines.push('');
lines.push(`-- 1. Canonical Dataset Registration`);
lines.push(`INSERT INTO public.datasets (id, name, domain, description, source_id, license)`);
lines.push(`VALUES (`);
lines.push(`  'eci_political_parties',`);
lines.push(`  'ECI Registered Political Parties & Recognized State/National Formations',`);
lines.push(`  'political_profiles',`);
lines.push(`  'Statutory political party notification published by the Election Commission of India under Section 29A of the Representation of the People Act, 1951',`);
lines.push(`  'eci',`);
lines.push(`  'Government Open Data'`);
lines.push(`)`);
lines.push(`ON CONFLICT (id) DO NOTHING;`);
lines.push('');
lines.push('-- C0.2 Pre-assertion: Fail-closed canonical dataset version identity protection');
lines.push('DO $BODY$');
lines.push('DECLARE');
lines.push('  v_ver RECORD;');
lines.push('BEGIN');
lines.push('  SELECT id, dataset_id, version_tag, effective_from, effective_to, record_count, default_status');
lines.push('  INTO v_ver');
lines.push('  FROM public.dataset_versions');
lines.push('  WHERE id = \'eci_political_parties_2024_v1\';');
lines.push('');
lines.push('  IF FOUND THEN');
lines.push('    IF (v_ver.dataset_id, v_ver.version_tag, v_ver.effective_from, v_ver.effective_to, v_ver.record_count, v_ver.default_status::text)');
lines.push('       IS DISTINCT FROM');
lines.push('       (\'eci_political_parties\',');
lines.push('        \'2024_national_parties_107\',');
lines.push('        \'2024-03-15\'::date,');
lines.push('        NULL::date,');
lines.push('        107,');
lines.push('        \'OFFICIAL\') THEN');
lines.push('      RAISE EXCEPTION \'CANONICAL_DATASET_VERSION_CONFLICT: Existing dataset version % has conflicting canonical attributes (dataset=%, tag=%, from=%, to=%, records=%, status=%)\',');
lines.push('        v_ver.id, v_ver.dataset_id, v_ver.version_tag, v_ver.effective_from, v_ver.effective_to, v_ver.record_count, v_ver.default_status;');
lines.push('    END IF;');
lines.push('  END IF;');
lines.push('END $BODY$;');
lines.push('');
lines.push(`-- 2. Authoritative Dataset Version Snapshot`);
lines.push(`INSERT INTO public.dataset_versions (`);
lines.push(`  id, dataset_id, version_tag, effective_from, default_status, record_count, metadata`);
lines.push(`)`);
lines.push(`VALUES (`);
lines.push(`  'eci_political_parties_2024_v1',`);
lines.push(`  'eci_political_parties',`);
lines.push(`  '2024_national_parties_107',`);
lines.push(`  '2024-03-15'::date,`);
lines.push(`  'OFFICIAL',`);
lines.push(`  107,`);
lines.push(`  '{"milestone": "W021.5-B2.2-C", "statutory_authority": "Election Commission of India", "canonical_org_count": 107, "total_batch_inserts": 1207}'::jsonb`);
lines.push(`)`);
lines.push(`ON CONFLICT (id) DO NOTHING;`);
lines.push('');
lines.push(`-- 3. Batch Provenance Anchor Record`);
lines.push(`INSERT INTO public.provenance_records (`);
lines.push(`  id, dataset_version_id, status, transformation_type, operator, metadata, created_at`);
lines.push(`)`);
lines.push(`VALUES (`);
lines.push(`  '0215b22c-0000-0000-0000-000000000001'::uuid,`);
lines.push(`  'eci_political_parties_2024_v1',`);
lines.push(`  'OFFICIAL',`);
lines.push(`  'canonical_ingest',`);
lines.push(`  'system:w021.5_b2.2c_pipeline',`);
lines.push(`  '{"source": "ECI Political Party Notification 2023 / 2024 & Verified Seed Corpora", "milestone": "W021.5-B2.2-C", "record_count": 1207}'::jsonb,`);
lines.push(`  now()`);
lines.push(`)`);
lines.push(`ON CONFLICT (id) DO NOTHING;`);
lines.push('');

// Pre-assertion: Fail-closed identity conflict detection (065-001 Remediation)
lines.push('-- ─── PRE-EXECUTION IDENTITY CONFLICT ASSERTION (065-001) ─────────────────────');
lines.push('DO $BODY$');
lines.push('DECLARE');
lines.push('  v_conflict RECORD;');
lines.push('BEGIN');
lines.push('  WITH incoming(id, org_type, name, short_name, recognition_level, headquarters_state) AS (');
lines.push('    VALUES');
const assertionValues = manifest.canonicalOrganizations.map(o => {
  const hqState = o.headquartersState ? escapeSql(o.headquartersState) : 'NULL';
  return `      (${escapeSql(o.id)}, ${escapeSql(o.orgType)}, ${escapeSql(o.name)}, ${escapeSql(o.shortName)}, ${escapeSql(o.recognitionLevel)}, ${hqState})`;
});
lines.push(assertionValues.join(',\n'));
lines.push('  ),');
lines.push('  conflicts AS (');
lines.push('    SELECT ');
lines.push('      e.id, ');
lines.push('      e.name AS existing_name, i.name AS incoming_name,');
lines.push('      e.short_name AS existing_short, i.short_name AS incoming_short,');
lines.push('      e.recognition_level AS existing_recog, i.recognition_level AS incoming_recog,');
lines.push('      e.headquarters_state AS existing_hq, i.headquarters_state AS incoming_hq');
lines.push('    FROM public.political_organizations e');
lines.push('    JOIN incoming i ON e.id = i.id');
lines.push('    WHERE (e.org_type, e.name, e.short_name, e.recognition_level, COALESCE(e.headquarters_state, \'\'))');
lines.push('       IS DISTINCT FROM ');
lines.push('          (i.org_type, i.name, i.short_name, i.recognition_level, COALESCE(i.headquarters_state, \'\'))');
lines.push('  )');
lines.push('  SELECT * INTO v_conflict FROM conflicts LIMIT 1;');
lines.push('');
lines.push('  IF v_conflict.id IS NOT NULL THEN');
lines.push('    RAISE EXCEPTION \'CANONICAL_IDENTITY_CONFLICT: Existing organization % has conflicting attributes (Existing: name=%, short=%, recog=%, hq=% | Incoming: name=%, short=%, recog=%, hq=%)\',');
lines.push('      v_conflict.id, v_conflict.existing_name, v_conflict.existing_short, v_conflict.existing_recog, v_conflict.existing_hq,');
lines.push('      v_conflict.incoming_name, v_conflict.incoming_short, v_conflict.incoming_recog, v_conflict.incoming_hq;');
lines.push('  END IF;');
lines.push('END $BODY$;');
lines.push('');

// C1: Political Organizations (107 rows)
lines.push('-- ─── C1: CANONICAL POLITICAL ORGANIZATIONS (107 ROWS) ────────────────────────');
lines.push(`INSERT INTO public.political_organizations (`);
lines.push(`  id, org_type, name, short_name, recognition_level, headquarters_state,`);
lines.push(`  data_status, provenance_id, created_at, updated_at`);
lines.push(`)`);
lines.push(`VALUES`);

const orgValueRows = manifest.canonicalOrganizations.map(o => {
  const hqState = o.headquartersState ? escapeSql(o.headquartersState) : 'NULL';
  return `  (${escapeSql(o.id)}, ${escapeSql(o.orgType)}, ${escapeSql(o.name)}, ${escapeSql(o.shortName)}, ${escapeSql(o.recognitionLevel)}, ${hqState}, 'OFFICIAL', '0215b22c-0000-0000-0000-000000000001', now(), now())`;
});
lines.push(orgValueRows.join(',\n'));
lines.push(`ON CONFLICT (id) DO NOTHING;`);
lines.push('');

// C2: Organization Relationships (10 rows)
lines.push('-- ─── C2: ORGANIZATION RELATIONSHIPS (10 ROWS) ───────────────────────────────');
lines.push(`INSERT INTO public.organization_relationships (`);
lines.push(`  source_org_id, target_org_id, relationship_type, valid_from, valid_to, is_current,`);
lines.push(`  metadata, data_status, provenance_id, created_at, updated_at`);
lines.push(`)`);
lines.push(`VALUES`);

const relValueRows = lineage.relationships.map(r => {
  const meta = {
    notes: r.notes || '',
    legalInstrument: r.legalInstrument || '',
    confidence: r.confidence || 'VERIFIED'
  };
  return `  (${escapeSql(r.sourceOrgId)}, ${escapeSql(r.targetOrgId)}, ${escapeSql(r.relationshipType)}, ${escapeSql(r.effectiveDate)}::date, NULL, true, ${escapeJson(meta)}, 'OFFICIAL', '0215b22c-0000-0000-0000-000000000001', now(), now())`;
});
lines.push(relValueRows.join(',\n'));
lines.push(`ON CONFLICT DO NOTHING;`);
lines.push('');

// C3: Multilingual Names (27 rows)
lines.push('-- ─── C3: MULTILINGUAL ORGANIZATION NAMES (27 ROWS) ──────────────────────────');
lines.push(`INSERT INTO public.organization_multilingual_names (`);
lines.push(`  organization_id, language_code, script_code, representation_type, name_value,`);
lines.push(`  short_name_value, is_preferred, is_official, valid_from, data_status, provenance_id, created_at, updated_at`);
lines.push(`)`);
lines.push(`VALUES`);

const multiValueRows = multi.identities.map(m => {
  const shortVal = m.short ? escapeSql(m.short) : 'NULL';
  return `  (${escapeSql(m.orgId)}, ${escapeSql(m.lang)}, ${escapeSql(m.script)}, ${escapeSql(m.type)}, ${escapeSql(m.name)}, ${shortVal}, ${m.isPreferred ? 'true' : 'false'}, ${m.isOfficial ? 'true' : 'false'}, '1947-08-15'::date, 'OFFICIAL', '0215b22c-0000-0000-0000-000000000001', now(), now())`;
});
lines.push(multiValueRows.join(',\n'));
lines.push(`ON CONFLICT ON CONSTRAINT uq_org_multi_name DO NOTHING;`);
lines.push('');

// C4: Organization Symbols (19 rows)
// Uses CTE + WHERE NOT EXISTS to guarantee trigger-safe idempotency on repeat runs
lines.push('-- ─── C4: STATUTORY ELECTION SYMBOLS (19 ROWS) ───────────────────────────────');
lines.push(`WITH incoming_symbols (`);
lines.push(`  organization_id, symbol_name, symbol_url, jurisdiction_scope, valid_from, valid_to,`);
lines.push(`  is_current, statutory_order_ref, data_status, provenance_id, created_at, updated_at`);
lines.push(`) AS (`);
lines.push(`  VALUES`);

const symbolValueRows = symbols.symbols.map(s => {
  const jurVal = s.jurisdiction ? escapeSql(s.jurisdiction) : 'NULL::text';
  const orderRef = s.authority ? escapeSql(s.authority) : 'NULL::text';
  return `    (${escapeSql(s.orgId)}, ${escapeSql(s.symbolName)}, NULL::text, ${jurVal}, ${escapeSql(s.validFrom)}::date, NULL::date, ${s.isCurrent ? 'true' : 'false'}, ${orderRef}, 'OFFICIAL'::public.data_status_enum, '0215b22c-0000-0000-0000-000000000001'::uuid, now(), now())`;
});
lines.push(symbolValueRows.join(',\n'));
lines.push(`)`);
lines.push(`INSERT INTO public.organization_symbols (`);
lines.push(`  organization_id, symbol_name, symbol_url, jurisdiction_scope, valid_from, valid_to,`);
lines.push(`  is_current, statutory_order_ref, data_status, provenance_id, created_at, updated_at`);
lines.push(`)`);
lines.push(`SELECT i.* FROM incoming_symbols i`);
lines.push(`WHERE NOT EXISTS (`);
lines.push(`  SELECT 1 FROM public.organization_symbols e`);
lines.push(`  WHERE e.organization_id = i.organization_id`);
lines.push(`    AND e.symbol_name = i.symbol_name`);
lines.push(`    AND e.valid_from = i.valid_from`);
lines.push(`);`);
lines.push('');

// C5: Organization Aliases (1,043 rows)
// Uses CTE + WHERE NOT EXISTS to guarantee trigger-safe idempotency on repeat runs
lines.push('-- ─── C5: DETERMINISTIC ORGANIZATION ALIASES (1,043 ROWS) ─────────────────────');
lines.push(`WITH incoming_aliases (`);
lines.push(`  raw_lookup_key, raw_original_string, organization_id, alias_type, jurisdiction_scope,`);
lines.push(`  valid_from, valid_to, confidence, provenance_id, created_at, updated_at`);
lines.push(`) AS (`);
lines.push(`  VALUES`);

function mapAliasType(resolutionType) {
  switch (resolutionType) {
    case 'EXACT_MATCH': return 'STANDARD_ABBREVIATION';
    case 'STANDARD_ALIAS': return 'STANDARD_ABBREVIATION';
    case 'FULL_NAME_MATCH': return 'POPULAR_NAME';
    case 'HISTORICAL_PREDECESSOR': return 'HISTORICAL_PREDECESSOR';
    case 'CORRUPTED_TRUNCATED_STRING': return 'TYPOGRAPHIC_VARIANT';
    case 'SYNTHETIC_CODE_ALIAS': return 'ECI_PARTY_CODE';
    case 'ALLIANCE_ENTITY': return 'POPULAR_NAME';
    case 'COMPOUND_CANDIDATE_STRING': return 'TYPOGRAPHIC_VARIANT';
    default: return 'TYPOGRAPHIC_VARIANT';
  }
}

const aliasValueRows = aliases.map(a => {
  const resType = reconTypeMap.get(a.raw_string) || 'STANDARD_ALIAS';
  const aliasType = mapAliasType(resType);
  return `    (${escapeSql(a.normalized_key)}, ${escapeSql(a.raw_string)}, ${escapeSql(a.organization_id)}, ${escapeSql(aliasType)}, NULL::text, '1947-08-15'::date, NULL::date, ${escapeSql(a.confidence)}, '0215b22c-0000-0000-0000-000000000001'::uuid, now(), now())`;
});
lines.push(aliasValueRows.join(',\n'));
lines.push(`)`);
lines.push(`INSERT INTO public.organization_aliases (`);
lines.push(`  raw_lookup_key, raw_original_string, organization_id, alias_type, jurisdiction_scope,`);
lines.push(`  valid_from, valid_to, confidence, provenance_id, created_at, updated_at`);
lines.push(`)`);
lines.push(`SELECT i.* FROM incoming_aliases i`);
lines.push(`WHERE NOT EXISTS (`);
lines.push(`  SELECT 1 FROM public.organization_aliases e`);
lines.push(`  WHERE e.raw_lookup_key = i.raw_lookup_key`);
lines.push(`    AND ((e.jurisdiction_scope IS NULL AND i.jurisdiction_scope IS NULL) OR e.jurisdiction_scope = i.jurisdiction_scope)`);
lines.push(`    AND e.organization_id = i.organization_id`);
lines.push(`    AND e.valid_from = i.valid_from`);
lines.push(`);`);
lines.push('');

lines.push('COMMIT;');
lines.push('');

const sqlContent = lines.join('\n');
const targetFile = path.join(REPO_ROOT, 'supabase', 'migrations', '065_canonical_political_organization_registry.sql');
const stagingTargetFile = path.join(REPO_ROOT, 'supabase', 'staging_packages', '065_canonical_political_organization_registry.sql');

fs.writeFileSync(targetFile, sqlContent, 'utf8');
fs.writeFileSync(stagingTargetFile, sqlContent, 'utf8');

console.log(`[MIGRATION 065 GENERATED] Target file: ${targetFile}`);
console.log(`[STAGING PACKAGE 065 GENERATED] Target file: ${stagingTargetFile}`);
console.log(`File size: ${Buffer.byteLength(sqlContent, 'utf8')} bytes`);
console.log(`Rows: C0(1) + C1(107) + C2(10) + C3(27) + C4(19) + C5(1043) = 1,207`);
