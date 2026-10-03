/**
 * tests/b1-r4-full-provenance-chain.test.mjs
 *
 * Milestone W021.5-B1-R4: Full Provenance Chain Test Suite
 * Traverses all 4,123 AC->PC mappings asserting complete unbroken chain:
 * mapping -> AC version -> PC -> delimitation regime -> dataset -> dataset version -> evidence record -> source reference.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const MANIFEST_PATH = path.join(REPO_ROOT, 'reports', 'w021_5b1_r3_mapping_evidence_manifest.json');
const SOURCE_RECON_PATH = path.join(REPO_ROOT, 'reports', 'w021_5b1_r4_source_reconciliation.json');
const MIGRATION_059_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '059_canonical_national_constituency_registry.sql');

const manifestData = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const sourceReconData = JSON.parse(fs.readFileSync(SOURCE_RECON_PATH, 'utf8'));
const sql059 = fs.readFileSync(MIGRATION_059_PATH, 'utf8');

describe('W021.5-B1-R4: Full Provenance Chain Traversability Suite (4,123 Mappings)', () => {

  // Load canonical AC versions from Migration 059
  const acRegex = /\('([A-Z]{2}-AC-\d{1,3})',\s*'([A-Z]{2}-AC-\d{1,3})',\s*(\d+),\s*'([^']+)',\s*'([A-Z]{2})',\s*'([^']*)',\s*'([A-Z]+)',\s*'assembly_constituency'/g;
  const canonicalAcs = new Map();
  for (const m of sql059.matchAll(acRegex)) {
    canonicalAcs.set(m[2], { internalId: m[1], code: m[2], acNo: parseInt(m[3], 10), name: m[4], stateCode: m[5] });
  }

  // Load canonical PCs from Migration 059
  const pcRegex = /\('([A-Z]{2}-PC-\d{2,3})',\s*'([A-Z]{2})',\s*'parliamentary_constituency',\s*(\d+),\s*'([^']+)',\s*'([a-z]+)',\s*'([a-z0-9_]+)'/gi;
  const canonicalPcs = new Map();
  for (const m of sql059.matchAll(pcRegex)) {
    canonicalPcs.set(m[1], { code: m[1], stateCode: m[2], pcNo: parseInt(m[3], 10), name: m[4] });
  }

  it('Link 1: Every mapping links to a valid canonical AC version', () => {
    assert.strictEqual(canonicalAcs.size, 4123, 'Must have 4,123 canonical AC versions');
    for (const m of manifestData.mappings) {
      const acCode = m.assembly_constituency_code;
      const ac = canonicalAcs.get(acCode);
      assert(ac !== undefined, `Mapping ${m.mapping_id} references unknown AC: ${acCode}`);
      assert.strictEqual(ac.code, acCode);
    }
  });

  it('Link 2: Every mapping links to a valid canonical PC', () => {
    assert.strictEqual(canonicalPcs.size, 543, 'Must have 543 canonical PCs');
    for (const m of manifestData.mappings) {
      const pcCode = m.parliamentary_constituency_code;
      const pc = canonicalPcs.get(pcCode);
      assert(pc !== undefined, `Mapping ${m.mapping_id} references unknown PC: ${pcCode}`);
      assert.strictEqual(pc.code, pcCode);
    }
  });

  it('Link 3: Every mapping links to a valid Delimitation Regime', () => {
    const validRegimes = new Set([
      'eci_delimitation_2008',
      'eci_delimitation_2014_ap_ts',
      'eci_delimitation_2019_dnh_dd',
      'eci_delimitation_2022_jk',
      'mha_jk_reorg_2019',
      'mha_national_jurisdictions_2024_v1'
    ]);
    for (const m of manifestData.mappings) {
      assert(
        validRegimes.has(m.delimitation_regime_id),
        `Mapping ${m.mapping_id} has invalid delimitation regime: ${m.delimitation_regime_id}`
      );
    }
  });

  it('Link 4: Every mapping links to an authoritative Dataset and Dataset Version', () => {
    const validDatasets = new Set([
      'eci_delimitation_order_2008',
      'eci_delimitation_order_2022',
      'mha_reorganisation_2014'
    ]);
    const validDatasetVersions = new Set([
      'eci_national_ac_2008_v1',
      'eci_national_pc_2008_v1',
      'mha_national_jurisdictions_2024_v1'
    ]);
    for (const m of manifestData.mappings) {
      assert(validDatasets.has(m.source_dataset_id), `Invalid dataset: ${m.source_dataset_id}`);
      assert(validDatasetVersions.has(m.source_dataset_version_id), `Invalid dataset version: ${m.source_dataset_version_id}`);
    }
  });

  it('Link 5: Every mapping possesses an Evidence Record Identifier', () => {
    const evidenceIds = new Set();
    for (const m of manifestData.mappings) {
      assert(m.evidence_record_id && m.evidence_record_id.length > 5, `Malformed evidence ID: ${m.evidence_record_id}`);
      evidenceIds.add(m.evidence_record_id);
    }
    // Exactly 31 jurisdictions possess Assembly Constituencies (remaining 5 UTs have 0 ACs)
    assert.strictEqual(evidenceIds.size, 31, `Expected exactly 31 distinct evidence records for the 31 assembly jurisdictions, found ${evidenceIds.size}`);
  });

  it('Link 6: Every mapping has an unbroken Statutory Source Reference and Method', () => {
    const validMethods = new Set([
      'DIRECT_STATUTORY_SCHEDULE_CONFIRMATION',
      'SCHEDULE_RECONSTRUCTION_AND_CROSSWALK_NORMALIZATION',
      'STATUTORY_SCHEDULE_CROSSWALK_AND_NAME_RESOLUTION',
      'STATUTORY_ORDER_RECONSTRUCTION_18_AC_PER_PC',
      'WHOLE_STATE_SINGLE_PC_INVARIANT_PROOF'
    ]);

    for (const m of manifestData.mappings) {
      assert(m.source_reference && m.source_reference.trim().length > 10,
        `Mapping ${m.mapping_id} lacks detailed statutory source reference`);
      assert(validMethods.has(m.verification_method),
        `Mapping ${m.mapping_id} has unapproved verification method: ${m.verification_method}`);
    }
  });

  it('Link 7: Reconciled records cross-reference deterministically to Source Reconciliation Matrix', () => {
    assert.strictEqual(sourceReconData.rows.length, 4123);
    const sourceReconByAc = new Map(sourceReconData.rows.map(r => [r.canonical_ac_code, r]));

    for (const m of manifestData.mappings) {
      const recon = sourceReconByAc.get(m.assembly_constituency_code);
      assert(recon !== undefined, `Missing reconciliation record for ${m.assembly_constituency_code}`);
      assert.strictEqual(recon.target_pc_code, m.parliamentary_constituency_code);
      assert(
        ['DIRECT_SOURCE', 'CROSSWALK_SOURCE', 'SUPPLEMENTAL_STATUTORY_SOURCE', 'RECONSTRUCTED_FROM_STATUTORY_SOURCE']
          .includes(recon.source_resolution_method),
        `Prohibited resolution method: ${recon.source_resolution_method}`
      );
    }
  });

});
