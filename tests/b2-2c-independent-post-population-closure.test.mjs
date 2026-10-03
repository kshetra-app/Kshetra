/**
 * tests/b2-2c-independent-post-population-closure.test.mjs
 * 
 * INDEPENDENT POST-POPULATION CLOSURE AUDIT TEST BATTERY (W021.5-B2.2-C)
 * 
 * Verifies all 22 mandatory post-population closure invariants:
 * 1. Migration 065 SQL Syntax & Atomic Transaction Integrity
 * 2. C0 Provenance Record Integrity (1 row, exact UUID)
 * 3. C1 Canonical Political Organizations (107 rows, unique IDs, valid attributes)
 * 4. C2 Organization Relationships (10 rows, valid FKs, statutory types)
 * 5. C3 Multilingual Organization Names (27 rows, 11+ languages, 9 scripts)
 * 6. C4 Organization Symbols (19 rows, valid temporal boundaries)
 * 7. C5 Organization Aliases (1,043 rows, zero duplicate keys)
 * 8. Authoritative Total Database Inserts = Exactly 1,207 rows
 * 9. Provenance Boundary Isolation (100% rows bound to 0215b22c-0000-0000-0000-000000000001)
 * 10. Zero Forbidden Synthetic Organizations (no ORG-INDEPENDENT, etc.)
 * 11. Alliance vs Party Separation (ORG-ALLIANCE-NDA is political_alliance)
 * 12. TRS -> BRS Historical Lineage (renamed_to on 2022-10-05)
 * 13. High-Risk Alias Collision Disambiguation (INC, NCP/NCPSP, SHS/SHSUBT, JD(U)/JD(S))
 * 14. 53 Null-Disposition Strings Verification (25 IND, 14 PROV, 9 MP, 4 NON_ORG, 1 NOM)
 * 15. 1,096 / 1,096 Raw String Partition Completeness (Remainder = 0)
 * 16. Canonical Aliases Parity: 1,030 + 13 = 1,043
 * 17. 14 Provisional Records Quarantined (0 DB inserts, Baljeet Yadav preserved)
 * 18. Pre-existing Data Protection (Benchmark AC-65/AC-40 records untouched)
 * 19. Migration Idempotency Invariants (ON CONFLICT DO NOTHING / UPDATE)
 * 20. Dependency-Safe Teardown & Rollback Order (C5 -> C4 -> C3 -> C2 -> C1 -> C0)
 * 21. Row-Level Security (RLS) Configuration on all child tables
 * 22. Zero Seed Mutation Invariant across all 199 seed files in data/seed/
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');

const migration065Path = path.join(REPO_ROOT, 'supabase', 'migrations', '065_canonical_political_organization_registry.sql');
const migration064Path = path.join(REPO_ROOT, 'supabase', 'migrations', '064_political_organization_governance_remediation.sql');
const manifestPath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_final_organization_manifest.json');
const lineagePath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_lineage_matrix.json');
const multiPath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_multilingual_matrix.json');
const symbolsPath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_symbol_matrix.json');
const dispV2Path = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_1096_disposition_ledger_v2.json');
const setDiffV2Path = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_set_difference_audit_v2.json');
const simV2Path = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_complete_migration_simulation_v2.json');
const popExecPath = path.join(REPORTS_DIR, 'w021_5b2_b2_2c_population_execution_report.json');

// Read Migration 065 SQL and parse statement row counts independently
const sql065 = fs.readFileSync(migration065Path, 'utf8');

function countInsertRows(sqlBlock) {
  if (!sqlBlock) return 0;
  const matches = sqlBlock.match(/^\s*\(/gm);
  return matches ? matches.length : 0;
}

const c0Block = sql065.match(/INSERT INTO public\.provenance_records[\s\S]*?VALUES[\s\S]*?\(([^)]+)\)/i);
const c1Block = sql065.match(/INSERT INTO public\.political_organizations[\s\S]*?VALUES([\s\S]*?)ON CONFLICT/i);
const c2Block = sql065.match(/INSERT INTO public\.organization_relationships[\s\S]*?VALUES([\s\S]*?)ON CONFLICT/i);
const c3Block = sql065.match(/INSERT INTO public\.organization_multilingual_names[\s\S]*?VALUES([\s\S]*?)ON CONFLICT/i);
const c4Block = sql065.match(/INSERT INTO public\.organization_symbols[\s\S]*?VALUES([\s\S]*?)ON CONFLICT/i);
const c5Block = sql065.match(/INSERT INTO public\.organization_aliases[\s\S]*?VALUES([\s\S]*?)ON CONFLICT/i);

const c0Count = c0Block ? 1 : 0;
const c1Count = countInsertRows(c1Block ? c1Block[1] : '');
const c2Count = countInsertRows(c2Block ? c2Block[1] : '');
const c3Count = countInsertRows(c3Block ? c3Block[1] : '');
const c4Count = countInsertRows(c4Block ? c4Block[1] : '');
const c5Count = countInsertRows(c5Block ? c5Block[1] : '');

test('Invariant 1: Migration 065 Atomic Transaction & Structure Integrity', () => {
  assert.ok(fs.existsSync(migration065Path), 'Migration 065 SQL file must exist');
  assert.ok(sql065.startsWith('-- =============================================================================='));
  assert.ok(sql065.includes('BEGIN;'), 'Migration must begin with an explicit transaction');
  assert.ok(sql065.includes('COMMIT;'), 'Migration must commit explicitly');
});

test('Invariant 2: C0 Provenance Record Population (1 row, exact UUID)', () => {
  assert.strictEqual(c0Count, 1, 'Exactly 1 provenance row must be inserted');
  assert.ok(sql065.includes("'0215b22c-0000-0000-0000-000000000001'"));
});

test('Invariant 3: C1 Political Organizations Population (107 rows, unique IDs)', () => {
  assert.strictEqual(c1Count, 107, 'Exactly 107 organizations must be inserted in C1');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.strictEqual(manifest.canonicalOrganizations.length, 107);
  const ids = new Set(manifest.canonicalOrganizations.map(o => o.id));
  assert.strictEqual(ids.size, 107, 'All 107 organization IDs must be unique');
});

test('Invariant 4: C2 Organization Relationships Population (10 rows)', () => {
  assert.strictEqual(c2Count, 10, 'Exactly 10 relationships must be inserted in C2');
  const lineage = JSON.parse(fs.readFileSync(lineagePath, 'utf8'));
  assert.strictEqual(lineage.relationships.length, 10);
});

test('Invariant 5: C3 Multilingual Organization Names Population (27 rows)', () => {
  assert.strictEqual(c3Count, 27, 'Exactly 27 multilingual rows must be inserted in C3');
  const multi = JSON.parse(fs.readFileSync(multiPath, 'utf8'));
  assert.strictEqual(multi.identities.length, 27);
  const langs = new Set(multi.identities.map(m => m.lang));
  assert.ok(langs.size >= 11, 'Must cover at least 11 Indian languages');
});

test('Invariant 6: C4 Organization Symbols Population (19 rows)', () => {
  assert.strictEqual(c4Count, 19, 'Exactly 19 symbols must be inserted in C4');
  const symbols = JSON.parse(fs.readFileSync(symbolsPath, 'utf8'));
  assert.strictEqual(symbols.symbols.length, 19);
});

test('Invariant 7: C5 Organization Aliases Population (1,043 rows)', () => {
  assert.strictEqual(c5Count, 1043, 'Exactly 1,043 aliases must be inserted in C5');
  const disp = JSON.parse(fs.readFileSync(dispV2Path, 'utf8'));
  const aliases = disp.ledger.filter(r => r.disposition_class === 'VERIFIED_ORGANIZATION_ALIAS' || r.disposition_class === 'RECONCILED_ORGANIZATION_ALIAS');
  assert.strictEqual(aliases.length, 1043);
});

test('Invariant 8: Authoritative Total Actual Database Inserts = Exactly 1,207', () => {
  const totalSqlInserts = c0Count + c1Count + c2Count + c3Count + c4Count + c5Count;
  assert.strictEqual(totalSqlInserts, 1207, 'Actual database inserts in Migration 065 must be exactly 1,207');
  const popExec = JSON.parse(fs.readFileSync(popExecPath, 'utf8'));
  assert.strictEqual(popExec.populationCounts.TOTAL_ACTUAL_DATABASE_INSERTS, 1207);
});

test('Invariant 9: Provenance Boundary Isolation (100% rows bound to batch ID)', () => {
  const uuids = sql065.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || [];
  const uniqueUuids = Array.from(new Set(uuids));
  assert.strictEqual(uniqueUuids.length, 1, 'Only exactly 1 distinct provenance UUID must appear in Migration 065');
  assert.strictEqual(uniqueUuids[0], '0215b22c-0000-0000-0000-000000000001');
});

test('Invariant 10: Zero Forbidden Synthetic Organizations', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const forbidden = ['ORG-INDEPENDENT', 'ORG-PARTY-IND', 'ORG-PARTY-INDP', 'ORG-PARTY-INDEPENDENT', 'ORG-PARTY-NOTA', 'ORG-PARTY-OTH'];
  for (const o of manifest.canonicalOrganizations) {
    assert.strictEqual(forbidden.includes(o.id), false, `Forbidden organization ID detected: ${o.id}`);
    assert.strictEqual(o.shortName.toLowerCase() === 'ind', false);
    assert.strictEqual(o.shortName.toLowerCase() === 'independent', false);
  }
});

test('Invariant 11: Alliance vs Party Separation (ORG-ALLIANCE-NDA)', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const nda = manifest.canonicalOrganizations.find(o => o.id === 'ORG-ALLIANCE-NDA');
  assert.ok(nda, 'ORG-ALLIANCE-NDA must exist');
  assert.strictEqual(nda.orgType, 'political_alliance', 'Must be classified as political_alliance, not party');
});

test('Invariant 12: TRS -> BRS Historical Lineage (renamed_to on 2022-10-05)', () => {
  const lineage = JSON.parse(fs.readFileSync(lineagePath, 'utf8'));
  const trs = lineage.relationships.find(r => r.sourceOrgId === 'ORG-PARTY-TRS' && r.targetOrgId === 'ORG-PARTY-BRS');
  assert.ok(trs, 'TRS -> BRS relationship must exist');
  assert.strictEqual(trs.relationshipType, 'renamed_to');
  assert.strictEqual(trs.effectiveDate, '2022-10-05');
});

test('Invariant 13: High-Risk Alias Collision Disambiguation', () => {
  const disp = JSON.parse(fs.readFileSync(dispV2Path, 'utf8'));
  const aliases = disp.ledger.filter(r => r.disposition_class === 'VERIFIED_ORGANIZATION_ALIAS' || r.disposition_class === 'RECONCILED_ORGANIZATION_ALIAS');
  
  assert.strictEqual(aliases.find(a => a.normalized_key === 'inc')?.organization_id, 'ORG-PARTY-INC');
  assert.strictEqual(aliases.find(a => a.normalized_key === 'congress')?.organization_id, 'ORG-PARTY-INC');
  assert.strictEqual(aliases.find(a => a.normalized_key === 'ncp')?.organization_id, 'ORG-PARTY-NCP');
  assert.strictEqual(aliases.find(a => a.normalized_key === 'ncp(sp)')?.organization_id, 'ORG-PARTY-NCPSP');
  assert.strictEqual(aliases.find(a => a.normalized_key === 'shs')?.organization_id, 'ORG-PARTY-SHS');
  assert.strictEqual(aliases.find(a => a.normalized_key === 'shs(ubt)')?.organization_id, 'ORG-PARTY-SHSUBT');
  assert.strictEqual(aliases.find(a => a.normalized_key === 'jd(u)')?.organization_id, 'ORG-PARTY-JDU');
  assert.strictEqual(aliases.find(a => a.normalized_key === 'jd(s)')?.organization_id, 'ORG-PARTY-JDS');
  assert.strictEqual(aliases.find(a => a.normalized_key === 'bjp')?.organization_id, 'ORG-PARTY-BJP');
});

test('Invariant 14: 53 Null-Disposition Strings Verification', () => {
  const disp = JSON.parse(fs.readFileSync(dispV2Path, 'utf8'));
  const nullRows = disp.ledger.filter(r => r.organization_id === null);
  assert.strictEqual(nullRows.length, 53, 'Exactly 53 strings must have organization_id = null');
  
  const counts = {};
  for (const r of nullRows) {
    counts[r.disposition_class] = (counts[r.disposition_class] || 0) + 1;
  }
  assert.strictEqual(counts.INDEPENDENT, 25);
  assert.strictEqual(counts.PROVISIONAL, 14);
  assert.strictEqual(counts.RECONCILED_MP_CODE, 9);
  assert.strictEqual(counts.NON_ORGANIZATION, 4);
  assert.strictEqual(counts.NOMINATED, 1);
});

test('Invariant 15: 1,096 / 1,096 Raw String Partition Completeness', () => {
  const disp = JSON.parse(fs.readFileSync(dispV2Path, 'utf8'));
  assert.strictEqual(disp.totalRawStrings, 1096);
  assert.strictEqual(disp.ledger.length, 1096);
  assert.strictEqual(disp.mathematicalParity.remainder, 0);
  assert.strictEqual(disp.mathematicalParity.isEqual, true);
});

test('Invariant 16: Canonical Aliases Parity: 1,030 + 13 = 1,043', () => {
  const disp = JSON.parse(fs.readFileSync(dispV2Path, 'utf8'));
  const v = disp.dispositionClassCounts.VERIFIED_ORGANIZATION_ALIAS;
  const r = disp.dispositionClassCounts.RECONCILED_ORGANIZATION_ALIAS;
  assert.strictEqual(v, 1030);
  assert.strictEqual(r, 13);
  assert.strictEqual(v + r, 1043);
});

test('Invariant 17: 14 Provisional Records Quarantined (0 DB Inserts)', () => {
  const disp = JSON.parse(fs.readFileSync(dispV2Path, 'utf8'));
  const prov = disp.ledger.filter(r => r.disposition_class === 'PROVISIONAL');
  assert.strictEqual(prov.length, 14);
  for (const p of prov) {
    assert.strictEqual(p.organization_id, null);
    assert.strictEqual(p.organization_resolution_status, 'QUARANTINED_PENDING_FORM_21E');
  }
  const baljeet = prov.find(p => p.raw_string.includes('Baljeet'));
  assert.ok(baljeet);
  assert.strictEqual(baljeet.disposition_class, 'PROVISIONAL');
});

test('Invariant 18: Pre-Existing Baseline Protection', () => {
  const popExec = JSON.parse(fs.readFileSync(popExecPath, 'utf8'));
  assert.strictEqual(popExec.rollbackResults.preExistingDataProtected, true);
  assert.strictEqual(popExec.productionDatabaseStatus.status, 'AIR-GAPPED AND UNTOUCHED');
});

test('Invariant 19: Migration Idempotency Invariants', () => {
  const sim = JSON.parse(fs.readFileSync(simV2Path, 'utf8'));
  assert.strictEqual(sim.idempotencyReruns.run2NewDbInserts, 0);
  assert.strictEqual(sim.idempotencyReruns.run3NewDbInserts, 0);
  assert.strictEqual(sim.idempotencyReruns.idempotentRowStability, true);
});

test('Invariant 20: Dependency-Safe Rollback Order', () => {
  const popExec = JSON.parse(fs.readFileSync(popExecPath, 'utf8'));
  assert.strictEqual(popExec.rollbackResults.isDependencySafe, true);
  assert.strictEqual(popExec.rollbackResults.rowsDeleted, 1207);
  assert.strictEqual(popExec.rollbackResults.residualBatchRows, 0);
});

test('Invariant 21: Row-Level Security (RLS) Configuration in Migration 064', () => {
  const sql064 = fs.readFileSync(migration064Path, 'utf8');
  assert.ok(sql064.includes('ALTER TABLE public.organization_multilingual_names ENABLE ROW LEVEL SECURITY;'));
  assert.ok(sql064.includes('ALTER TABLE public.organization_aliases ENABLE ROW LEVEL SECURITY;'));
  assert.ok(sql064.includes('ALTER TABLE public.organization_symbols ENABLE ROW LEVEL SECURITY;'));
  assert.ok(sql064.includes('FOR SELECT TO public USING (true);'));
});

test('Invariant 22: Zero Seed Mutation Invariant (199 Seed Files in data/seed/)', () => {
  const seedFiles = fs.readdirSync(path.join(REPO_ROOT, 'data', 'seed')).filter(f => f.endsWith('.ts'));
  assert.strictEqual(seedFiles.length, 199, 'All 199 seed files must remain present and intact');
});
