import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();

test('B2.2-F Master Cross-Phase Graph & Accounting Parity Suite', async (t) => {
  await t.test('Invariant 1: Exact Master Payload Sum (58,360 total mutations)', () => {
    const parity = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_2f_cross_phase_parity.json')));
    assert.strictEqual(parity.grandTotals.totalPhysicalInserts, 58360);
    assert.strictEqual(parity.subsystemParity.b2_2c_organizations.totalPhysicalInserts, 1207);
    assert.strictEqual(parity.subsystemParity.b2_2d_persons_and_candidacies.totalPhysicalInserts, 48284);
    assert.strictEqual(parity.subsystemParity.b2_2e_civic_extensions.totalPhysicalInserts, 8869);
  });

  await t.test('Invariant 2: Reconciliation of B2.2-E 8,868 Data vs 8,869 Physical Inserts', () => {
    const parity = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_2f_cross_phase_parity.json')));
    const e = parity.subsystemParity.b2_2e_civic_extensions;
    assert.strictEqual(e.candidateAffidavits, 4524);
    assert.strictEqual(e.constituencyLineage, 154);
    assert.strictEqual(e.constituencyDemographics, 4142);
    assert.strictEqual(e.turnoutRecords, 48);
    assert.strictEqual(e.dataRecords, 8868);
    assert.strictEqual(e.provenanceAnchors, 1);
    assert.strictEqual(e.totalPhysicalInserts, 8869);
    assert.strictEqual(e.dataRecords + e.provenanceAnchors, e.totalPhysicalInserts);
  });

  await t.test('Invariant 3: Distinct 128-bit Batch Provenance Anchors across C, D, E', () => {
    const prov = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_2f_provenance_graph.json')));
    const anchorUuids = prov.anchors.map(a => a.anchorUuid);
    assert.strictEqual(anchorUuids.length, 3);
    assert.strictEqual(new Set(anchorUuids).size, 3);
    assert.deepStrictEqual(anchorUuids, [
      '0215b22c-0000-0000-0000-000000000001',
      '0215b22d-0000-0000-0000-000000000001',
      '0215b22e-0000-0000-0000-000000000001'
    ]);
  });

  await t.test('Invariant 4: Foreign Key Closed Graph (Zero Dangling References)', () => {
    const ePost = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_b2_2e_post_population_audit.json')));
    assert.strictEqual(ePost.foreignKeyIntegrity.orphanEntities, 0);
    assert.strictEqual(ePost.foreignKeyIntegrity.affidavit_to_canonical_person, '4524/4524 (100.00%)');
    assert.strictEqual(ePost.foreignKeyIntegrity.affidavit_to_candidacy, '4524/4524 (100.00%)');
  });

  await t.test('Invariant 5: Temporal Consistency & Delimitation Succession Respect', () => {
    const temporal = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_2f_temporal_integrity.json')));
    assert.strictEqual(temporal.temporalBounds.candidacyElectionYears.valid, true);
    assert.strictEqual(temporal.temporalBounds.electedTenures.chronologicalViolations, 0);
    assert.strictEqual(temporal.temporalBounds.delimitationSuccessionDates.epochViolations, 0);
    assert.strictEqual(temporal.temporalBounds.retrospectiveFalsificationCheck.retrospectiveAlterationCount, 0);
  });

  await t.test('Invariant 6: 102 Homonym Collision Clusters Enforce Separate Canonical Persons', () => {
    const collision = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_2f_duplicate_collision_audit.json')));
    assert.strictEqual(collision.homonymCollisionClusters.totalDiscoveredClusters, 102);
    assert.strictEqual(collision.homonymCollisionClusters.unintendedMerges, 0);
    assert.strictEqual(collision.homonymCollisionClusters.disposition, 'SEPARATE_CANONICAL_PERSONS_ENFORCED');
  });

  await t.test('Invariant 7: Master Idempotency Invariant across Multiple Runs', () => {
    const idem = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_2f_idempotency_audit.json')));
    assert.strictEqual(idem.runs.length, 3);
    assert.strictEqual(idem.runs[0].rowsInserted, 58360);
    assert.strictEqual(idem.runs[1].rowsInserted, 0);
    assert.strictEqual(idem.runs[2].rowsInserted, 0);
    assert.strictEqual(idem.runs[1].finalCount, 58360);
    assert.strictEqual(idem.runs[2].finalCount, 58360);
    assert.strictEqual(idem.verdict, 'STRICT_IDEMPOTENCY_CONFIRMED');
  });

  await t.test('Invariant 8: Bounded Rollback Precision & Complete Restoration', () => {
    const rollback = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_2f_rollback_audit.json')));
    const gt = rollback.rollbackPrecisionResults.grandTotal;
    assert.strictEqual(gt.targetRows, 58360);
    assert.strictEqual(gt.rowsRemovedOnRollback, 58360);
    assert.strictEqual(gt.residualRows, 0);
    assert.strictEqual(gt.restoredRows, 58360);
    assert.strictEqual(gt.contentHashMatches, true);
  });
});
