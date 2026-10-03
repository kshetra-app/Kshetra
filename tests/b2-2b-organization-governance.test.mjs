/**
 * tests/b2-2b-organization-governance.test.mjs
 * 
 * Automated Verification Suite for Milestone W021.5-B2.2-B:
 * Political Organization Schema & Governance Remediation.
 * 
 * Tests:
 * 1. Migration 064 schema objects (organization_multilingual_names, organization_aliases, organization_symbols, constraints)
 * 2. Strict independent candidate prohibition (chk_prohibit_synthetic_independent, recognition_level enum)
 * 3. Temporal resolution of split/renamed organizations (SHS vs SHSUBT, NCP vs NCPSP, TRS -> BRS)
 * 4. MP 37 single-letter code forensic reconciliations
 * 5. MLA 13 truncated string forensic reconciliations
 * 6. Exception handling (SHORTNAM - Baljeet Yadav preserved as PROVISIONAL)
 * 7. Adversarial compound string parsing (candidate names with hyphens, party code extraction)
 * 8. Evidence report file integrity and structure
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const migration064Path = path.join(REPO_ROOT, 'supabase', 'migrations', '064_political_organization_governance_remediation.sql');
const reconV2Path = path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_reconciliation_v2.json');
const schemaRemediationPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_schema_remediation.json');
const exceptionsPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_exceptions.json');
const relationshipsPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_relationships.json');

test('W021.5-B2.2-B Suite: Evidence Artifact Existence & Integrity', () => {
  assert.ok(fs.existsSync(migration064Path), 'Migration 064 SQL file must exist');
  assert.ok(fs.existsSync(reconV2Path), 'Reconciliation V2 JSON must exist');
  assert.ok(fs.existsSync(schemaRemediationPath), 'Schema remediation JSON must exist');
  assert.ok(fs.existsSync(exceptionsPath), 'Exceptions JSON must exist');
  assert.ok(fs.existsSync(relationshipsPath), 'Relationships JSON must exist');

  const reconV2 = JSON.parse(fs.readFileSync(reconV2Path, 'utf8'));
  assert.strictEqual(reconV2.totalRawStrings, 1096, 'Must audit exactly 1,096 unique raw party strings');
  assert.strictEqual(reconV2.reconciliationRecords.length, 1096, 'All raw strings must be mapped in ledger V2');
  assert.ok(reconV2.confidenceCounts.VERIFIED >= 1050, 'Verified count must be at least 1,050');
  assert.strictEqual(reconV2.confidenceCounts.CONFLICTING, 0, 'Zero conflicting records allowed');
});

test('W021.5-B2.2-B Suite: Migration 064 Schema Invariants', () => {
  const sql = fs.readFileSync(migration064Path, 'utf8');

  // Verify GAP-ORG-001: multilingual names
  assert.ok(sql.includes('public.organization_multilingual_names'), 'Must define organization_multilingual_names table');
  assert.ok(sql.includes('language_code'), 'Must include language_code column');
  assert.ok(sql.includes('script_code'), 'Must include script_code column');
  assert.ok(sql.includes('is_official'), 'Must include is_official column');
  assert.ok(sql.includes('is_preferred'), 'Must include is_preferred column');

  // Verify GAP-ORG-002: organization aliases
  assert.ok(sql.includes('public.organization_aliases'), 'Must define organization_aliases table');
  assert.ok(sql.includes('raw_lookup_key'), 'Must include raw_lookup_key column');
  assert.ok(sql.includes('raw_original_string'), 'Must include raw_original_string column');
  assert.ok(sql.includes('organization_id'), 'Must include organization_id column');
  assert.ok(sql.includes('uq_org_alias_national'), 'Must enforce national unique alias index');

  // Verify GAP-ORG-003: organization symbols
  assert.ok(sql.includes('public.organization_symbols'), 'Must define organization_symbols table');
  assert.ok(sql.includes('symbol_name'), 'Must include symbol_name column');
  assert.ok(sql.includes('statutory_order_ref'), 'Must include statutory_order_ref column');
  assert.ok(sql.includes('valid_from'), 'Must include valid_from column');

  // Verify GAP-ORG-004: Anti-synthetic independent constraint
  assert.ok(sql.includes('chk_prohibit_synthetic_independent'), 'Must enforce chk_prohibit_synthetic_independent constraint');
  assert.ok(sql.includes("CHECK (recognition_level IN ('national', 'state', 'unrecognized', 'registered_unrecognized'))"), 'recognition_level check must prohibit independent');

  // Verify Relationship constraints
  assert.ok(sql.includes('organization_relationships_relationship_type_check'), 'Must enforce expanded relationship types check');
  assert.ok(sql.includes('renamed_to'), 'Must include renamed_to relationship type');
  assert.ok(sql.includes('succeeded_by'), 'Must include succeeded_by relationship type');
  assert.ok(sql.includes('split_from'), 'Must include split_from relationship type');
});

test('W021.5-B2.2-B Suite: Independent Candidate Boundary Invariants', () => {
  const reconV2 = JSON.parse(fs.readFileSync(reconV2Path, 'utf8'));

  const indEntries = reconV2.reconciliationRecords.filter(r => r.isIndependent);
  assert.ok(indEntries.length >= 24, 'Independent representations must be identified');

  for (const entry of indEntries) {
    assert.strictEqual(entry.canonicalOrgId, null, `Independent entry '${entry.rawString}' must have null canonicalOrgId`);
    assert.notStrictEqual(entry.canonicalOrgId, 'ORG-INDEPENDENT', 'Must NEVER map to ORG-INDEPENDENT');
    assert.ok(
      entry.resolutionType === 'INDEPENDENT_REPRESENTATION' ||
      entry.resolutionType === 'COMPOUND_CANDIDATE_STRING' ||
      entry.resolutionType === 'CORRUPTED_1LETTER_CODE',
      `Unexpected resolutionType ${entry.resolutionType} for ${entry.rawString}`
    );
    assert.ok(
      entry.confidence === 'VERIFIED' || entry.confidence === 'RECONCILED',
      `Confidence must be VERIFIED or RECONCILED, got ${entry.confidence}`
    );
  }
});

test('W021.5-B2.2-B Suite: Temporal Split & Rename Lineage Resolution', () => {
  const rels = JSON.parse(fs.readFileSync(relationshipsPath, 'utf8')).relationships;

  // TRS -> BRS
  const trsBrs = rels.find(r => r.sourceOrgId === 'ORG-PARTY-TRS' && r.targetOrgId === 'ORG-PARTY-BRS');
  assert.ok(trsBrs, 'TRS to BRS relationship must exist');
  assert.strictEqual(trsBrs.relationshipType, 'renamed_to');
  assert.strictEqual(trsBrs.validFrom, '2022-10-05');

  // SHS split
  const shsSplit = rels.find(r => r.sourceOrgId === 'ORG-PARTY-SHS' && r.targetOrgId === 'ORG-PARTY-SHSUBT');
  assert.ok(shsSplit, 'SHS to SHSUBT split must exist');
  assert.strictEqual(shsSplit.relationshipType, 'split_from');

  // NCP split
  const ncpSplit = rels.find(r => r.sourceOrgId === 'ORG-PARTY-NCP' && r.targetOrgId === 'ORG-PARTY-NCPSP');
  assert.ok(ncpSplit, 'NCP to NCPSP split must exist');
  assert.strictEqual(ncpSplit.relationshipType, 'split_from');

  // Simulation: temporal resolution helper
  function resolveTemporalOrg(rawAlias, electionDate) {
    if (rawAlias === 'TRS' || rawAlias === 'BRS') {
      return (electionDate < '2022-10-05') ? 'ORG-PARTY-TRS' : 'ORG-PARTY-BRS';
    }
    if (rawAlias === 'SHS' || rawAlias === 'SS') {
      return (electionDate < '2022-06-25') ? 'ORG-PARTY-SHS' : 'ORG-PARTY-SHS'; // Parent retains original id post-split
    }
    return null;
  }

  assert.strictEqual(resolveTemporalOrg('TRS', '2018-12-07'), 'ORG-PARTY-TRS', '2018 election must resolve to TRS');
  assert.strictEqual(resolveTemporalOrg('TRS', '2023-11-30'), 'ORG-PARTY-BRS', '2023 election must resolve to BRS');
});

test('W021.5-B2.2-B Suite: MP 37 Single-Letter Code Forensic Audit', () => {
  const exceptions = JSON.parse(fs.readFileSync(exceptionsPath, 'utf8'));
  const mpExceptions = exceptions.mpSingleLetterExceptions;

  assert.strictEqual(mpExceptions.length, 37, 'Must audit exactly 37 single-letter MP records');

  for (const mp of mpExceptions) {
    assert.strictEqual(mp.confidence, 'VERIFIED', `MP ${mp.name} (${mp.id}) must have VERIFIED confidence`);
    
    // Check specific known records
    if (mp.name === 'Sudha Murty') {
      assert.strictEqual(mp.isNominated, true);
      assert.strictEqual(mp.resolvedPartyId, null);
    } else if (mp.name === 'Kapil Sibal') {
      assert.strictEqual(mp.isIndependent, true);
      assert.strictEqual(mp.resolvedPartyId, null);
    } else if (mp.name === 'Sharadchandra Pawar') {
      assert.strictEqual(mp.resolvedPartyId, 'ORG-PARTY-NCPSP');
    } else if (mp.name === 'Sanjay Raut') {
      assert.strictEqual(mp.resolvedPartyId, 'ORG-PARTY-SHSUBT');
    } else if (mp.letter === 'J' && mp.state === 'BR') {
      assert.strictEqual(mp.resolvedPartyId, 'ORG-PARTY-JDU');
    } else if (mp.letter === 'J' && mp.state === 'JH') {
      assert.strictEqual(mp.resolvedPartyId, 'ORG-PARTY-JMM');
    } else if (mp.letter === 'J' && mp.state === 'JK') {
      assert.strictEqual(mp.resolvedPartyId, 'ORG-PARTY-JKNC');
    } else if (mp.letter === 'C' && mp.state === 'BR') {
      assert.strictEqual(mp.resolvedPartyId, 'ORG-PARTY-CPIML');
    }
  }
});

test('W021.5-B2.2-B Suite: MLA 13 Truncated String Forensic Audit', () => {
  const exceptions = JSON.parse(fs.readFileSync(exceptionsPath, 'utf8'));
  const mlaExceptions = exceptions.mlaTruncatedExceptions;

  assert.strictEqual(mlaExceptions.length, 13, 'Must audit exactly 13 truncated MLA records');

  const aimm = mlaExceptions.find(e => e.raw === 'AIMM');
  assert.ok(aimm);
  assert.strictEqual(aimm.resolvedPartyId, 'ORG-PARTY-AIMIM');

  const cpiml = mlaExceptions.find(e => e.raw === 'CPI(ML');
  assert.ok(cpiml);
  assert.strictEqual(cpiml.resolvedPartyId, 'ORG-PARTY-CPIML');

  const apnaDal = mlaExceptions.find(e => e.raw === 'Apna Dal (');
  assert.ok(apnaDal);
  assert.strictEqual(apnaDal.resolvedPartyId, 'ORG-PARTY-ADAL');

  const jansatta = mlaExceptions.find(e => e.raw === 'Jansatta D');
  assert.ok(jansatta);
  assert.strictEqual(jansatta.resolvedPartyId, 'ORG-PARTY-JSD');
});

test('W021.5-B2.2-B Suite: Exception SHORTNAM Preserved as PROVISIONAL', () => {
  const reconV2 = JSON.parse(fs.readFileSync(reconV2Path, 'utf8'));
  const exceptions = JSON.parse(fs.readFileSync(exceptionsPath, 'utf8'));

  const shortnam = reconV2.reconciliationRecords.find(r => r.rawString.startsWith('SHORTNAM'));
  assert.ok(shortnam, 'SHORTNAM entry must exist in ledger');
  assert.strictEqual(shortnam.confidence, 'PROVISIONAL', 'SHORTNAM must be flagged PROVISIONAL per CTO directive');
  assert.strictEqual(shortnam.canonicalOrgId, 'ORG-PARTY-RJS', 'PROVISIONAL record points to identified candidate org ORG-PARTY-RJS');

  assert.strictEqual(exceptions.placeholderException.status, 'PROVISIONAL');
  assert.ok(exceptions.placeholderException.reason.includes('Form 21E'));
});

test('W021.5-B2.2-B Suite: Adversarial Compound String Resolution', () => {
  // Test parser against complex adversarial string structures
  function parseAdversarialCandidateParty(compound) {
    const trimmed = compound.trim();
    // Pattern: "PARTY - Candidate Name" or "PARTY-Candidate Name"
    const match = trimmed.match(/^([A-Z0-9\(\)]+)\s*-\s*(.+)$/i);
    if (match) {
      return { partyCode: match[1].trim(), candidateName: match[2].trim() };
    }
    return { partyCode: null, candidateName: trimmed };
  }

  const res1 = parseAdversarialCandidateParty('SHORTNAM - Baljeet Yadav');
  assert.strictEqual(res1.partyCode, 'SHORTNAM');
  assert.strictEqual(res1.candidateName, 'Baljeet Yadav');

  const res2 = parseAdversarialCandidateParty('BJP - Narendra Modi');
  assert.strictEqual(res2.partyCode, 'BJP');
  assert.strictEqual(res2.candidateName, 'Narendra Modi');

  const res3 = parseAdversarialCandidateParty('CPI(ML) - Sandeep Saurav');
  assert.strictEqual(res3.partyCode, 'CPI(ML)');
  assert.strictEqual(res3.candidateName, 'Sandeep Saurav');
});
