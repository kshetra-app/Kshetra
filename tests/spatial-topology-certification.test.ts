import assert from 'node:assert/strict';
import {
  TopologyCertificationService,
  TopologyAuditUnavailableError,
} from '../apps/api/src/services/topologyCertificationService';
import { setSupabaseConfiguredForTesting } from '../apps/api/src/lib/supabase';

async function run() {
  assert.equal(TopologyCertificationService.isWithinNationalBounds(78.4867, 17.385), true);
  assert.equal(TopologyCertificationService.isWithinNationalBounds(10, 20), false);

  const valid = TopologyCertificationService.evaluateGeometry(
    'TS-AC-067',
    'AC',
    'Madhira',
    450000000,
    true,
    false,
    true,
    false,
    4326,
  );
  assert.equal(valid.length, 0);
  assert.equal(
    TopologyCertificationService.evaluateGeometry(
      'SLIVER-001',
      'AC',
      'Sliver',
      45,
      true,
      false,
      true,
      false,
      4326,
    )[0].violationType,
    'SLIVER',
  );
  assert.equal(
    TopologyCertificationService.evaluateGeometry(
      'AC-ERR-001',
      'AC',
      'Bowtie',
      50000000,
      false,
      true,
      true,
      false,
      4326,
    )[0].violationType,
    'INVALID_GEOMETRY',
  );
  assert.equal(
    TopologyCertificationService.evaluateGeometry(
      'AC-OVERLAP-001',
      'AC',
      'Overlap',
      50000000,
      true,
      false,
      true,
      true,
      4326,
    )[0].violationType,
    'OVERLAP',
  );
  assert.equal(
    TopologyCertificationService.evaluateGeometry(
      'AC-LEAK-001',
      'AC',
      'Leak',
      50000000,
      true,
      false,
      false,
      false,
      4326,
    )[0].violationType,
    'CONTAINMENT_BREACH',
  );

  // Do not let unit tests call or accidentally certify against a configured remote database.
  setSupabaseConfiguredForTesting(false);
  await assert.rejects(
    TopologyCertificationService.certifyNationwideTopology(),
    TopologyAuditUnavailableError,
    'certification fails closed when live PostGIS storage is unavailable',
  );
  await assert.rejects(
    TopologyCertificationService.inspectTargetedSpatialScope({
      scopeType: 'STATE',
      stateCode: 'TS',
    }),
    TopologyAuditUnavailableError,
  );
  console.log('PostGIS certification fail-closed and pure geometry-evidence checks passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
