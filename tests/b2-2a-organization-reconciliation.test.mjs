/**
 * tests/b2-2a-organization-reconciliation.test.mjs
 * 
 * Automated Verification Suite for Milestone W021.5-B2.2-A:
 * National Political Organization Forensic Audit & Reconciliation Engine.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const vocabPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_raw_party_vocabulary.json');
const reconPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_reconciliation.json');
const matrixPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_quality_matrix.json');
const gapsPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_schema_gaps.json');
const depsPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_dependencies.json');

test('W021.5-B2.2-A Suite: Evidence Artifact Existence & Integrity', () => {
  assert.ok(fs.existsSync(vocabPath), 'Raw party vocabulary JSON must exist');
  assert.ok(fs.existsSync(reconPath), 'Reconciliation ledger JSON must exist');
  assert.ok(fs.existsSync(matrixPath), 'Quality matrix JSON must exist');
  assert.ok(fs.existsSync(gapsPath), 'Schema gaps JSON must exist');
  assert.ok(fs.existsSync(depsPath), 'Runtime dependencies JSON must exist');
});

test('W021.5-B2.2-A Suite: Forensic Audit Completeness & Zero Unresolved', () => {
  const vocab = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
  const recon = JSON.parse(fs.readFileSync(reconPath, 'utf8'));
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

  assert.strictEqual(vocab.totalUniqueRawStrings, 1096, 'Must audit exactly 1,096 unique raw party strings');
  assert.strictEqual(vocab.totalOccurrences, 16011, 'Must audit exactly 16,011 occurrences across repo');
  assert.strictEqual(recon.reconciliationRecords.length, 1096, 'All raw strings must be mapped in ledger');
  assert.strictEqual(matrix.qualityMatrix.unresolvedCount, 0, 'Zero provisional unresolved strings allowed');
});

test('W021.5-B2.2-A Suite: Independence Invariant Enforcement', () => {
  const recon = JSON.parse(fs.readFileSync(reconPath, 'utf8'));
  
  // Verify independent entries have isIndependent === true and canonicalOrgId === null
  const indEntries = recon.reconciliationRecords.filter(r => r.isIndependent);
  assert.ok(indEntries.length >= 24, 'Independent representations must be identified');
  
  for (const entry of indEntries) {
    assert.strictEqual(entry.canonicalOrgId, null, `Independent entry '${entry.rawString}' must not have a synthetic party org ID`);
  }
});

test('W021.5-B2.2-A Suite: NOTA Ballot Option Separation', () => {
  const recon = JSON.parse(fs.readFileSync(reconPath, 'utf8'));
  
  const notaEntries = recon.reconciliationRecords.filter(r => r.isNota);
  assert.strictEqual(notaEntries.length, 2, 'NOTA and None of the Above must be identified');
  
  for (const entry of notaEntries) {
    assert.strictEqual(entry.canonicalOrgId, null, 'NOTA must not have a party organization ID');
    assert.strictEqual(entry.resolutionType, 'STATUTORY_BALLOT_OPTION');
  }
});

test('W021.5-B2.2-A Suite: Political Split & Successor Separation', () => {
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
  const lineage = matrix.organizationLineage;

  // Verify Shiv Sena split
  const shsSplit = lineage.find(l => l.sourceOrgId === 'ORG-PARTY-SHS' && l.targetOrgId === 'ORG-PARTY-SHSUBT');
  assert.ok(shsSplit, 'Shiv Sena split into SHS and SHSUBT must be modeled');
  assert.strictEqual(shsSplit.relationshipType, 'split_into');

  // Verify NCP split
  const ncpSplit = lineage.find(l => l.sourceOrgId === 'ORG-PARTY-NCP' && l.targetOrgId === 'ORG-PARTY-NCPSP');
  assert.ok(ncpSplit, 'NCP split into NCP and NCPSP must be modeled');
  assert.strictEqual(ncpSplit.relationshipType, 'split_into');

  // Verify TRS renaming to BRS
  const trsRename = lineage.find(l => l.sourceOrgId === 'ORG-PARTY-TRS' && l.targetOrgId === 'ORG-PARTY-BRS');
  assert.ok(trsRename, 'TRS renamed_to BRS must be modeled');
  assert.strictEqual(trsRename.relationshipType, 'renamed_to');
});

test('W021.5-B2.2-A Suite: Alliance Entity Modeling', () => {
  const recon = JSON.parse(fs.readFileSync(reconPath, 'utf8'));
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

  const ndaEntry = recon.reconciliationRecords.find(r => r.rawString === 'NDA');
  assert.ok(ndaEntry, 'NDA must be present');
  assert.strictEqual(ndaEntry.canonicalOrgId, 'ORG-ALLIANCE-NDA');
  assert.strictEqual(ndaEntry.isAlliance, true);

  const alliancePartners = matrix.organizationLineage.filter(l => l.targetOrgId === 'ORG-ALLIANCE-NDA');
  assert.ok(alliancePartners.length >= 4, 'NDA alliance partners (BJP, TDP, JSP, JDU) must be recorded');
});

test('W021.5-B2.2-A Suite: Corrupted Syntax & Truncation Defect Resolution', () => {
  const recon = JSON.parse(fs.readFileSync(reconPath, 'utf8'));

  // Test Bihar MLA corruptions
  const aimm = recon.reconciliationRecords.find(r => r.rawString === 'AIMM');
  assert.strictEqual(aimm.canonicalOrgId, 'ORG-PARTY-AIMIM');
  assert.strictEqual(aimm.resolutionType, 'CORRUPTED_TRUNCATED_STRING');

  const cpiml = recon.reconciliationRecords.find(r => r.rawString === 'CPI(ML');
  assert.strictEqual(cpiml.canonicalOrgId, 'ORG-PARTY-CPIML');
  assert.strictEqual(cpiml.resolutionType, 'CORRUPTED_TRUNCATED_STRING');

  // Test UP MLA corruptions
  const apnaDal = recon.reconciliationRecords.find(r => r.rawString === 'Apna Dal (');
  assert.strictEqual(apnaDal.canonicalOrgId, 'ORG-PARTY-ADAL');

  // Test Nagaland MLA corruption
  const rpi = recon.reconciliationRecords.find(r => r.rawString === 'RPI(');
  assert.strictEqual(rpi.canonicalOrgId, 'ORG-PARTY-RPIA');

  // Test Kerala MLA corruptions
  const cons = recon.reconciliationRecords.find(r => r.rawString === 'CONGRESS(');
  assert.strictEqual(cons.canonicalOrgId, 'ORG-PARTY-CS');

  const loktantrik = recon.reconciliationRecords.find(r => r.rawString === 'LOKTANTRIK');
  assert.strictEqual(loktantrik.canonicalOrgId, 'ORG-PARTY-LJD');

  // Test West Bengal MLA corruption
  const rashtriya = recon.reconciliationRecords.find(r => r.rawString === 'RASHTRIYA');
  assert.strictEqual(rashtriya.canonicalOrgId, 'ORG-PARTY-ISF');

  // Test MP single-letter corruptions
  const jCode = recon.reconciliationRecords.find(r => r.rawString === 'J' && r.sources[0].includes('mp-profiles'));
  assert.ok(jCode);
  assert.strictEqual(jCode.resolutionType, 'CORRUPTED_1LETTER_CODE');
});

test('W021.5-B2.2-A Suite: Compound Candidate Runner-Up String Extraction', () => {
  const recon = JSON.parse(fs.readFileSync(reconPath, 'utf8'));
  
  const compoundSample = recon.reconciliationRecords.find(r => r.rawString === 'INC - Gulab Kamro');
  assert.ok(compoundSample);
  assert.strictEqual(compoundSample.resolutionType, 'COMPOUND_CANDIDATE_STRING');
  assert.strictEqual(compoundSample.canonicalOrgId, 'ORG-PARTY-INC');
  assert.strictEqual(compoundSample.candidateExtracted, 'Gulab Kamro');
});

test('W021.5-B2.2-A Suite: Schema Gap Analysis Integrity', () => {
  const fileContent = JSON.parse(fs.readFileSync(gapsPath, 'utf8'));
  const gaps = fileContent.schemaGaps;
  assert.strictEqual(gaps.identifiedGaps.length, 4, 'Must identify 4 distinct schema gaps');
  assert.ok(gaps.identifiedGaps.some(g => g.gapId === 'GAP-ORG-001'), 'GAP-ORG-001 (multilingual) must exist');
  assert.ok(gaps.identifiedGaps.some(g => g.gapId === 'GAP-ORG-002'), 'GAP-ORG-002 (aliases) must exist');
  assert.ok(gaps.identifiedGaps.some(g => g.gapId === 'GAP-ORG-004'), 'GAP-ORG-004 (independent enum trap) must exist');
});
