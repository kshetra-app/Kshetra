import assert from 'node:assert/strict';
import { DisasterRecoveryService } from '../apps/api/src/services/disasterRecoveryService';

async function run() {
  console.log('=== RUNNING DOMAIN 10: JOB 085 DISASTER RECOVERY & PITR SUITE ===');

  // Check 1: Disaster Recovery Drill Execution (Simulated Datacenter Outage)
  console.log('\n[CHECK 1] Executing full-scale simulated disaster recovery drill...');
  const report = await DisasterRecoveryService.executeDisasterRecoveryDrill('PRIMARY_REGION_TOTAL_OUTAGE');
  assert.strictEqual(report.overallDrillPassed, true, 'Disaster recovery drill must pass overall');
  assert.strictEqual(report.simulatedIncident, 'PRIMARY_REGION_TOTAL_OUTAGE');
  console.log(`  [PASS] Disaster recovery drill [${report.drillId}] initiated for incident: ${report.simulatedIncident}.`);

  // Check 2: Recovery Point Objective (RPO < 1 Hour)
  console.log('\n[CHECK 2] Verifying Recovery Point Objective (RPO < 60m)...');
  assert.strictEqual(report.rpoPass, true, 'RPO must pass');
  assert.ok(report.rpoActualMinutes <= 60.0, `Actual RPO (${report.rpoActualMinutes}m) must be <= 60m target`);
  console.log(`  [PASS] RPO verified: ${report.rpoActualMinutes} minutes lag (SLA target: ${report.rpoTargetMinutes}m).`);

  // Check 3: Recovery Time Objective (RTO < 30 Minutes)
  console.log('\n[CHECK 3] Verifying Recovery Time Objective (RTO < 30m)...');
  assert.strictEqual(report.rtoPass, true, 'RTO must pass');
  assert.ok(report.rtoActualMinutes <= 30.0, `Actual RTO (${report.rtoActualMinutes}m) must be <= 30m target`);
  console.log(`  [PASS] RTO verified: ${report.rtoActualMinutes} minutes recovery duration (SLA target: ${report.rtoTargetMinutes}m).`);

  // Check 4: Data Parity Certification (100% Entity Parity)
  console.log('\n[CHECK 4] Verifying 100.00% entity parity post-restoration...');
  assert.strictEqual(report.dataIntegrityParity.parityPercent, 100.0, 'Parity must be exactly 100.00%');
  assert.strictEqual(report.dataIntegrityParity.entitiesPreIncident, 63045);
  assert.strictEqual(report.dataIntegrityParity.entitiesPostRecovery, 63045);
  assert.strictEqual(report.snapshotSha256.length, 64, 'Snapshot SHA-256 must be 64 characters');
  console.log(`  [PASS] 100% entity parity certified: ${report.dataIntegrityParity.entitiesPostRecovery}/${report.dataIntegrityParity.entitiesPreIncident} records match.`);

  // Check 5: Runbook Executed Steps Verification
  console.log('\n[CHECK 5] Verifying executed SRE disaster recovery runbook steps...');
  assert.ok(report.runbookExecutedSteps.length >= 7, 'Must execute full 7-step DR runbook');
  for (const step of report.runbookExecutedSteps) {
    console.log(`  ${step}`);
  }
  console.log('  [PASS] Full 7-stage DR recovery runbook verified.');

  // Check 6: Option B Provision - Single-Region Manual Snapshot Restore Fallback
  console.log('\n[CHECK 6] Verifying Option B provision: Single-region snapshot restore fallback adapter...');
  const fallback = await DisasterRecoveryService.restoreSingleRegionManualSnapshot({
    snapshotPath: '/backups/manual_snap_single_region.sql.gz',
    destinationDatabaseUrl: 'postgres://postgres:postgres@localhost:5432/poligram_fallback',
  });
  assert.strictEqual(fallback.status, 'SUCCESS');
  assert.strictEqual(fallback.restoredEntities, 63045);
  console.log(`  [PASS] Option B single-region restore adapter verified (${fallback.restoredEntities} entities restored in ${fallback.durationSeconds}s).`);

  console.log('\n===============================================================');
  console.log('  JOB 085 DISASTER RECOVERY & PITR: ALL CHECKS PASSED (100%)!');
  console.log('===============================================================');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
