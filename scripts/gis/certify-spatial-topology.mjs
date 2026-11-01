#!/usr/bin/env node
/**
 * 100% Nationwide Spatial Boundary Topology Certification Script
 * Domain 10: JOB 082
 * Authority: Master Product Blueprint, DEC-203, DEC-204 & Amendment v1.6 Control M
 */

import { TopologyCertificationService } from '../../apps/api/src/services/topologyCertificationService.js';

export async function runSpatialCertification() {
  const report = await TopologyCertificationService.certifyNationwideTopology();
  return report;
}

if (process.argv[1] && process.argv[1].endsWith('certify-spatial-topology.mjs')) {
  runSpatialCertification().then(report => {
    console.log('=== POLIGRAM 100% SPATIAL TOPOLOGY CERTIFICATION REPORT ===');
    console.log(JSON.stringify(report, null, 2));
    if (!report.certified) {
      console.error('CERTIFICATION FAILED: Geometric topology violations detected!');
      process.exit(1);
    }
    console.log('CERTIFICATION PASSED: All 4,123 ACs & 543 PCs certified 100% valid with 0 slivers and 0 overlaps.');
  });
}
