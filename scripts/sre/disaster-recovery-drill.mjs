#!/usr/bin/env node
/**
 * Disaster Recovery Drill & Point-In-Time-Recovery (PITR) Execution Script
 * Domain 10: JOB 085
 * Authority: Master Product Blueprint, DEC-203, DEC-204 & Amendment v1.6 Control M
 */

import { DisasterRecoveryService } from '../../apps/api/src/services/disasterRecoveryService.js';

export async function runDisasterRecoveryDrill(incident = 'PRIMARY_REGION_TOTAL_OUTAGE') {
  const report = await DisasterRecoveryService.executeDisasterRecoveryDrill(incident);
  return report;
}

if (process.argv[1] && process.argv[1].endsWith('disaster-recovery-drill.mjs')) {
  runDisasterRecoveryDrill().then(report => {
    console.log('=== POLIGRAM DISASTER RECOVERY DRILL REPORT ===');
    console.log(JSON.stringify(report, null, 2));
    if (!report.overallDrillPassed) {
      console.error('DR DRILL FAILED: SLA RPO/RTO or data parity breached!');
      process.exit(1);
    }
    console.log(`DR DRILL PASSED: RPO (${report.rpoActualMinutes}m < 60m), RTO (${report.rtoActualMinutes}m < 30m), 100% entity parity certified.`);
  });
}
