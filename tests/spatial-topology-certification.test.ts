import assert from 'node:assert/strict';
import { TopologyCertificationService } from '../apps/api/src/services/topologyCertificationService';

async function run() {
  console.log('=== RUNNING DOMAIN 10: JOB 082 SPATIAL TOPOLOGY CERTIFICATION SUITE ===');

  // Check 1: Statutory National Coordinate Bounding Box
  console.log('\n[CHECK 1] Verifying statutory India bounding box coordinates...');
  assert.strictEqual(TopologyCertificationService.isWithinNationalBounds(78.4867, 17.3850), true, 'Hyderabad within bounds');
  assert.strictEqual(TopologyCertificationService.isWithinNationalBounds(77.2090, 28.6139), true, 'New Delhi within bounds');
  assert.strictEqual(TopologyCertificationService.isWithinNationalBounds(88.3639, 22.5726), true, 'Kolkata within bounds');
  assert.strictEqual(TopologyCertificationService.isWithinNationalBounds(72.8777, 19.0760), true, 'Mumbai within bounds');
  assert.strictEqual(TopologyCertificationService.isWithinNationalBounds(10.0, 20.0), false, 'Atlantic coordinates rejected');
  assert.strictEqual(TopologyCertificationService.isWithinNationalBounds(80.0, 50.0), false, 'Russian coordinates rejected');
  console.log('  [PASS] Statutory territorial bounding box [68.0°E, 6.5°N] to [97.5°E, 37.5°N] verified.');

  // Check 2: Geometric Violation Evaluator & Sliver / Bowtie Detection
  console.log('\n[CHECK 2] Verifying geometric evaluator catches slivers, self-intersections, and overlaps...');
  // Compliant constituency geometry
  const validViolations = TopologyCertificationService.evaluateGeometry(
    'AC-TS-067', 'AC', 'Madhira', 450000000, true, false, true, false, 4326
  );
  assert.strictEqual(validViolations.length, 0, 'Compliant geometry must have 0 violations');

  // Sliver violation (< 100 m²)
  const sliverViolations = TopologyCertificationService.evaluateGeometry(
    'SLIVER-001', 'AC', 'Anomalous Gap', 45.0, true, false, true, false, 4326
  );
  assert.strictEqual(sliverViolations.length, 1);
  assert.strictEqual(sliverViolations[0].violationType, 'SLIVER');

  // Bowtie / self-intersection violation
  const bowtieViolations = TopologyCertificationService.evaluateGeometry(
    'AC-ERR-001', 'AC', 'Bowtie AC', 50000000, false, true, true, false, 4326
  );
  assert.strictEqual(bowtieViolations.length, 1);
  assert.strictEqual(bowtieViolations[0].violationType, 'INVALID_GEOMETRY');

  // Overlap violation
  const overlapViolations = TopologyCertificationService.evaluateGeometry(
    'AC-OVERLAP-001', 'AC', 'Overlapping AC', 50000000, true, false, true, true, 4326
  );
  assert.strictEqual(overlapViolations.length, 1);
  assert.strictEqual(overlapViolations[0].violationType, 'OVERLAP');

  // Containment violation
  const leakViolations = TopologyCertificationService.evaluateGeometry(
    'AC-LEAK-001', 'AC', 'Leaking AC', 50000000, true, false, false, false, 4326
  );
  assert.strictEqual(leakViolations.length, 1);
  assert.strictEqual(leakViolations[0].violationType, 'CONTAINMENT_BREACH');

  console.log('  [PASS] Evaluator detects slivers, invalid geometries, overlaps, and state containment breaches.');

  // Check 3: Nationwide 100% Boundary Topology Certification Execution
  console.log('\n[CHECK 3] Executing nationwide 100% spatial topology certification...');
  const report = await TopologyCertificationService.certifyNationwideTopology();
  assert.strictEqual(report.summary.totalAssemblyConstituencies, 4123, 'Must certify all 4,123 Assembly Constituencies');
  assert.strictEqual(report.summary.totalParliamentaryConstituencies, 543, 'Must certify all 543 Parliamentary Constituencies');
  assert.strictEqual(report.summary.invalidGeometriesCount, 0, 'Invalid geometries must be exactly 0');
  assert.strictEqual(report.summary.sliverPolygonsCount, 0, 'Sliver polygons must be exactly 0');
  assert.strictEqual(report.summary.crossBoundaryOverlapsCount, 0, 'Cross-boundary overlaps must be exactly 0');
  assert.strictEqual(report.summary.stateContainmentViolationsCount, 0, 'Containment violations must be exactly 0');
  assert.strictEqual(report.certified, true, 'Spatial topology must be 100% certified');
  assert.strictEqual(report.failureLog.length, 0);
  console.log(`  [PASS] Nationwide topology certified across ${report.summary.totalAssemblyConstituencies} ACs and ${report.summary.totalParliamentaryConstituencies} PCs.`);

  // Check 4: Option B Provision - Targeted Spatial Scope Inspection
  console.log('\n[CHECK 4] Verifying Option B provision: Targeted state/bounding-box spatial inspection...');
  const stateInspection = await TopologyCertificationService.inspectTargetedSpatialScope({
    scopeType: 'STATE',
    stateCode: 'TS',
  });
  assert.strictEqual(stateInspection.pass, true);
  assert.strictEqual(stateInspection.count, 119, 'Telangana must have 119 ACs');

  const bboxInspection = await TopologyCertificationService.inspectTargetedSpatialScope({
    scopeType: 'BOUNDING_BOX',
    boundingBox: [78.0, 17.0, 79.0, 18.0],
  });
  assert.strictEqual(bboxInspection.pass, true);
  assert.ok(bboxInspection.count > 0);
  console.log('  [PASS] Option B targeted spatial inspection verified for state and bounding box scopes.');

  console.log('\n===============================================================');
  console.log('  JOB 082 SPATIAL TOPOLOGY CERTIFICATION: ALL CHECKS PASSED (100%)!');
  console.log('===============================================================');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
