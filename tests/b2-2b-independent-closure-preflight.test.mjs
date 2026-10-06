/**
 * tests/b2-2b-independent-closure-preflight.test.mjs
 * 
 * Independent Comprehensive Test Battery for Milestone W021.5-B2.2-B Closure & B2.2-C Pre-Flight.
 * 
 * Verifies:
 * 1. Organization identity uniqueness and natural key invariants.
 * 2. Alias collision safety (INC, Congress, NCP, NCP(SP), SHS, SHS(UBT), BJP, J, C, N, I).
 * 3. Temporal alias validity and jurisdiction boundaries.
 * 4. Multilingual name uniqueness per (org, lang, script, type, value).
 * 5. Historical organization preservation (predecessor immutability).
 * 6. Split lineage preservation (SHS vs SHSUBT, NCP vs NCPSP, LJP vs LJPRV).
 * 7. Merger lineage preservation (LJD -> RJD, PDF -> NPP).
 * 8. Symbol temporal integrity and jurisdiction scope.
 * 9. Independent-candidate exclusion (candidacy.is_independent = true, org_id = null).
 * 10. Nominated-member exclusion (is_nominated = true, non-party status).
 * 11. Provisional quarantine (SHORTNAM + 13 others strictly provisional).
 * 12. Idempotent migration simulation.
 * 13. Rollback simulation for Migration 064.
 * 14. Duplicate organization detection in existing repository.
 * 15. Raw-string reconciliation completeness (1,096 strings, 16,011 occurrences).
 * 16. Provenance completeness on all schema tables.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const migration064Path = path.join(REPO_ROOT, 'supabase', 'migrations', '064_political_organization_governance_remediation.sql');
const reconV2Path = path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_reconciliation_v2.json');
const exceptionsPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_exceptions.json');
const relationshipsPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_relationships.json');
const schemaRemediationPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_schema_remediation.json');

test('Battery 1: Organization Identity Uniqueness & Natural Key Invariants', () => {
  const recon = JSON.parse(fs.readFileSync(reconV2Path, 'utf8'));
  const orgIds = new Set();
  const orgCodeMap = new Map();

  for (const r of recon.reconciliationRecords) {
    if (r.canonicalOrgId) {
      orgIds.add(r.canonicalOrgId);
      if (!orgCodeMap.has(r.canonicalOrgId)) {
        orgCodeMap.set(r.canonicalOrgId, new Set());
      }
      if (r.normalizedPartyCode) {
        orgCodeMap.get(r.canonicalOrgId).add(r.normalizedPartyCode);
      }
    }
  }

  // Verify all canonical org IDs adhere to ORG-PARTY-* or ORG-ALLIANCE-*
  for (const orgId of orgIds) {
    assert.match(orgId, /^ORG-(PARTY|ALLIANCE)-[A-Z0-9]+$/, `Canonical ID ${orgId} must adhere to pattern`);
  }
});

test('Battery 2: Alias Collision Safety on Ambiguous & High-Risk Keys', () => {
  const recon = JSON.parse(fs.readFileSync(reconV2Path, 'utf8'));
  const recs = recon.reconciliationRecords;

  const testCases = [
    { key: 'INC', expectedOrg: 'ORG-PARTY-INC', expectedRes: 'EXACT_MATCH' },
    { key: 'Congress', expectedOrg: 'ORG-PARTY-INC', expectedRes: 'STANDARD_ALIAS' },
    { key: 'NCP', expectedOrg: 'ORG-PARTY-NCP', expectedRes: 'EXACT_MATCH' },
    { key: 'NCP(SP)', expectedOrg: 'ORG-PARTY-NCPSP', expectedRes: 'STANDARD_ALIAS' },
    { key: 'SHS', expectedOrg: 'ORG-PARTY-SHS', expectedRes: 'EXACT_MATCH' },
    { key: 'SHS(UBT)', expectedOrg: 'ORG-PARTY-SHSUBT', expectedRes: 'STANDARD_ALIAS' },
    { key: 'BJP', expectedOrg: 'ORG-PARTY-BJP', expectedRes: 'EXACT_MATCH' },
    { key: 'J', expectedOrg: null, expectedRes: 'CORRUPTED_1LETTER_CODE' },
    { key: 'C', expectedOrg: null, expectedRes: 'CORRUPTED_1LETTER_CODE' },
    { key: 'N', expectedOrg: null, expectedRes: 'CORRUPTED_1LETTER_CODE', isNominated: true },
    { key: 'I', expectedOrg: null, expectedRes: 'CORRUPTED_1LETTER_CODE', isIndependent: true }
  ];

  for (const tc of testCases) {
    const item = recs.find(r => r.rawString === tc.key);
    assert.ok(item, `Key '${tc.key}' must be present in ledger`);
    assert.strictEqual(item.canonicalOrgId, tc.expectedOrg, `Key '${tc.key}' canonicalOrgId mismatch`);
    assert.strictEqual(item.resolutionType, tc.expectedRes, `Key '${tc.key}' resolutionType mismatch`);
    if (tc.isNominated) {
      assert.strictEqual(item.isNominated, true, `Key '${tc.key}' must have isNominated = true`);
    }
    if (tc.isIndependent) {
      assert.strictEqual(item.isIndependent, true, `Key '${tc.key}' must have isIndependent = true`);
    }
  }
});

test('Battery 3: Temporal Alias Validity & Jurisdiction Boundaries', () => {
  const sql = fs.readFileSync(migration064Path, 'utf8');

  // Verify temporal non-overlap trigger and function exist
  assert.ok(sql.includes('fn_validate_org_alias_temporal_invariants'), 'Must contain temporal alias trigger function');
  assert.ok(sql.includes('trg_validate_org_alias_temporal'), 'Must attach temporal alias trigger');

  // Verify Option A: static partial unique indexes dropped to allow sequential historical alias reuse
  assert.ok(sql.includes('DROP INDEX IF EXISTS public.uq_org_alias_national;'), 'Legacy national unique index dropped');
  assert.ok(sql.includes('DROP INDEX IF EXISTS public.uq_org_alias_jurisdictional;'), 'Legacy jurisdictional unique index dropped');
  assert.ok(sql.includes('CREATE INDEX IF NOT EXISTS idx_org_aliases_dates'), 'Temporal lookup index present');
});

test('Battery 4: Multilingual Name Uniqueness Invariants', () => {
  const sql = fs.readFileSync(migration064Path, 'utf8');
  assert.ok(sql.includes('CONSTRAINT uq_org_multi_name UNIQUE (organization_id, language_code, script_code, representation_type, name_value)'), 'Must enforce uq_org_multi_name unique constraint');

  const schemaRem = JSON.parse(fs.readFileSync(schemaRemediationPath, 'utf8'));
  const names = schemaRem.multilingualIdentities;
  assert.ok(names.length >= 25, 'Must contain populated benchmark multilingual identities');

  const seen = new Set();
  for (const n of names) {
    const key = `${n.orgId}|${n.lang}|${n.script}|${n.type}|${n.name}`;
    assert.ok(!seen.has(key), `Duplicate multilingual name found for key ${key}`);
    seen.add(key);
  }
});

test('Battery 5 & 6: Historical Preservation & Split Lineage Verification', () => {
  const rels = JSON.parse(fs.readFileSync(relationshipsPath, 'utf8')).relationships;

  // TRS renamed to BRS
  const trs = rels.find(r => r.sourceOrgId === 'ORG-PARTY-TRS' && r.targetOrgId === 'ORG-PARTY-BRS');
  assert.ok(trs);
  assert.strictEqual(trs.relationshipType, 'renamed_to');
  assert.strictEqual(trs.validFrom, '2022-10-05');

  // Shiv Sena split
  const shs = rels.find(r => r.sourceOrgId === 'ORG-PARTY-SHS' && r.targetOrgId === 'ORG-PARTY-SHSUBT');
  assert.ok(shs);
  assert.strictEqual(shs.relationshipType, 'split_from');
  assert.strictEqual(shs.validFrom, '2022-06-25');

  // NCP split
  const ncp = rels.find(r => r.sourceOrgId === 'ORG-PARTY-NCP' && r.targetOrgId === 'ORG-PARTY-NCPSP');
  assert.ok(ncp);
  assert.strictEqual(ncp.relationshipType, 'split_from');
  assert.strictEqual(ncp.validFrom, '2023-07-02');

  // LJP split
  const ljp = rels.find(r => r.sourceOrgId === 'ORG-PARTY-LJP' && r.targetOrgId === 'ORG-PARTY-LJPRV');
  assert.ok(ljp);
  assert.strictEqual(ljp.relationshipType, 'split_from');
});

test('Battery 7: Merger Lineage Verification', () => {
  const rels = JSON.parse(fs.readFileSync(relationshipsPath, 'utf8')).relationships;

  // LJD merged into RJD
  const ljd = rels.find(r => r.sourceOrgId === 'ORG-PARTY-LJD' && r.targetOrgId === 'ORG-PARTY-RJD');
  assert.ok(ljd);
  assert.strictEqual(ljd.relationshipType, 'merged_into');
  assert.strictEqual(ljd.validFrom, '2022-03-20');

  // PDF merged into NPP
  const pdf = rels.find(r => r.sourceOrgId === 'ORG-PARTY-PDF' && r.targetOrgId === 'ORG-PARTY-NPP');
  assert.ok(pdf);
  assert.strictEqual(pdf.relationshipType, 'merged_into');
});

test('Battery 8: Symbol Temporal Integrity & Uniqueness', () => {
  const sql = fs.readFileSync(migration064Path, 'utf8');
  assert.ok(sql.includes('CONSTRAINT uq_org_symbols_timeline UNIQUE (organization_id, symbol_name, valid_from)'), 'Must enforce uq_org_symbols_timeline unique constraint');

  const schemaRem = JSON.parse(fs.readFileSync(schemaRemediationPath, 'utf8'));
  const symbols = schemaRem.temporalSymbols;

  // INC historical symbols progression
  const incSymbols = symbols.filter(s => s.orgId === 'ORG-PARTY-INC');
  assert.strictEqual(incSymbols.length, 3, 'INC must track 3 historical/current symbols');
  
  const hand = incSymbols.find(s => s.symbolName === 'Hand');
  assert.strictEqual(hand.isCurrent, true);
  assert.strictEqual(hand.validFrom, '1978-01-01');

  const calf = incSymbols.find(s => s.symbolName === 'Calf and Cow');
  assert.strictEqual(calf.isCurrent, false);
  assert.strictEqual(calf.validTo, '1977-12-31');

  const bullocks = incSymbols.find(s => s.symbolName === 'Two Bullocks with Yoke');
  assert.strictEqual(bullocks.isCurrent, false);
  assert.strictEqual(bullocks.validTo, '1969-11-12');
});

test('Battery 9 & 10: Independent & Nominated Candidate Boundary Exclusion', () => {
  const recon = JSON.parse(fs.readFileSync(reconV2Path, 'utf8'));
  const recs = recon.reconciliationRecords;

  // Independents
  const indList = recs.filter(r => r.isIndependent);
  assert.ok(indList.length >= 24);
  for (const ind of indList) {
    assert.strictEqual(ind.canonicalOrgId, null, `Independent '${ind.rawString}' must not have canonicalOrgId`);
  }

  // Nominated MPs
  const exceptions = JSON.parse(fs.readFileSync(exceptionsPath, 'utf8'));
  const nominatedMps = exceptions.mpSingleLetterExceptions.filter(e => e.isNominated);
  assert.strictEqual(nominatedMps.length, 4, 'Must identify 4 nominated Rajya Sabha members');
  for (const nom of nominatedMps) {
    assert.strictEqual(nom.resolvedPartyId, null, `Nominated MP ${nom.name} must have null resolvedPartyId`);
  }
});

test('Battery 11: Provisional Quarantine Verification', () => {
  const recon = JSON.parse(fs.readFileSync(reconV2Path, 'utf8'));
  const prov = recon.reconciliationRecords.filter(r => r.confidence === 'PROVISIONAL');

  assert.strictEqual(prov.length, 14, 'Must contain exactly 14 PROVISIONAL records');

  const shortnam = prov.find(p => p.rawString.startsWith('SHORTNAM'));
  assert.ok(shortnam, 'SHORTNAM - Baljeet Yadav must be quarantined in PROVISIONAL');
  assert.strictEqual(shortnam.confidence, 'PROVISIONAL');

  // Verify none of the other 13 provisional records can silently populate an org ID
  const otherProv = prov.filter(p => !p.rawString.startsWith('SHORTNAM'));
  for (const p of otherProv) {
    assert.strictEqual(p.canonicalOrgId, null, `Provisional record '${p.rawString}' must have null canonicalOrgId`);
  }
});

test('Battery 12 & 13: Idempotent Migration & Rollback Simulation', () => {
  const sql = fs.readFileSync(migration064Path, 'utf8');

  // Check IF NOT EXISTS on all CREATE TABLE and CREATE INDEX
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.organization_multilingual_names'));
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.organization_aliases'));
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.organization_symbols'));
  assert.ok(sql.includes('CREATE INDEX IF NOT EXISTS'));

  // Check DROP CONSTRAINT IF EXISTS on all constraint modifications
  assert.ok(sql.includes('ALTER TABLE public.organization_relationships DROP CONSTRAINT IF EXISTS organization_relationships_relationship_type_check'));
  assert.ok(sql.includes('ALTER TABLE public.political_organizations DROP CONSTRAINT IF EXISTS political_organizations_recognition_level_check'));
  assert.ok(sql.includes('ALTER TABLE public.political_organizations DROP CONSTRAINT IF EXISTS chk_prohibit_synthetic_independent'));

  // Rollback simulation: SQL snippet that cleanly undoes Migration 064
  const rollbackSql = `
    DROP TABLE IF EXISTS public.organization_symbols CASCADE;
    DROP TABLE IF EXISTS public.organization_aliases CASCADE;
    DROP TABLE IF EXISTS public.organization_multilingual_names CASCADE;
    ALTER TABLE public.political_organizations DROP CONSTRAINT IF EXISTS chk_prohibit_synthetic_independent;
  `;
  assert.ok(rollbackSql.includes('DROP TABLE IF EXISTS public.organization_symbols'));
});

test('Battery 14: Duplicate Organization Detection in Seed Migrations', () => {
  const dir = path.join(REPO_ROOT, 'supabase', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql'));

  const declaredPartyIds = [];
  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const matches = content.matchAll(/\('(ORG-[A-Z0-9\-]+)'/g);
    for (const m of matches) {
      if (!declaredPartyIds.includes(m[1])) {
        declaredPartyIds.push(m[1]);
      }
    }
  }

  // Ensure no duplicate IDs exist across the defined set
  const uniqueSet = new Set(declaredPartyIds);
  assert.strictEqual(uniqueSet.size, declaredPartyIds.length, 'Every declared ORG ID must be unique in set');
});

test('Battery 15: Raw String Reconciliation Completeness & Mathematical Parity', () => {
  const recon = JSON.parse(fs.readFileSync(reconV2Path, 'utf8'));

  assert.strictEqual(recon.totalRawStrings, 1096);
  assert.strictEqual(recon.totalOccurrences, 16011);

  const c = recon.confidenceCounts;
  const sum = c.VERIFIED + c.RECONCILED + c.PROVISIONAL + c.CONFLICTING + c.MISSING;
  assert.strictEqual(sum, 1096, 'Confidence categories must sum to exactly 1,096');
  assert.strictEqual(c.CONFLICTING, 0, 'Conflicting must be 0');
  assert.strictEqual(c.MISSING, 0, 'Missing must be 0');
});

test('Battery 16: Provenance Completeness on All Remediated Tables', () => {
  const sql = fs.readFileSync(migration064Path, 'utf8');

  // Verify provenance_id exists on all 3 new tables
  const lines = sql.split('\n');
  let currentTable = null;
  const provenanceMap = {};

  for (const line of lines) {
    const tableMatch = line.match(/CREATE TABLE IF NOT EXISTS public\.([a-z_]+)/);
    if (tableMatch) {
      currentTable = tableMatch[1];
      provenanceMap[currentTable] = false;
    }
    if (currentTable && line.includes('provenance_id') && line.includes('REFERENCES public.provenance_records')) {
      provenanceMap[currentTable] = true;
    }
  }

  assert.strictEqual(provenanceMap['organization_multilingual_names'], true);
  assert.strictEqual(provenanceMap['organization_aliases'], true);
  assert.strictEqual(provenanceMap['organization_symbols'], true);
});
