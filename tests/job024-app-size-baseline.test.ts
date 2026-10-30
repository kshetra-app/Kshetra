/**
 * tests/job024-app-size-baseline.test.ts
 * 
 * Verifies JOB 024: App Size Baseline measurement and statutory gate compliance.
 */

import assert from 'node:assert/strict';
import { auditBundleMetrics } from '../scripts/audit-bundle-size.mjs';

console.log('=== RUNNING JOB 024 APP SIZE BASELINE VERIFICATION ===\n');

// 1. Audit metrics extraction
console.log('[CHECK 1] Auditing mobile bundle metrics and projections...');
const audit = auditBundleMetrics();

assert.ok(audit.metrics.hermesBytecodeBytes > 0, 'Hermes bytecode size must be greater than 0');
assert.ok(audit.metrics.hermesBytecodeMB < 5.0, `Hermes bytecode (${audit.metrics.hermesBytecodeMB} MB) must not exceed 5.0 MB`);
console.log(`  [PASS] Hermes Bytecode size: ${audit.metrics.hermesBytecodeMB} MB (Limit: <= 5.0 MB)`);

// 2. AAB Size Gate Compliance (<= 30 MB; target <= 25 MB)
console.log('[CHECK 2] Verifying Consumer Android App Bundle (AAB) release gate...');
assert.ok(audit.gates.passesAAB, `Consumer AAB size (${audit.metrics.projectedAABMB} MB) must be <= 30.0 MB`);
assert.ok(audit.gates.passesTargetAAB, `Consumer AAB size (${audit.metrics.projectedAABMB} MB) must meet target <= 25.0 MB`);
console.log(`  [PASS] Consumer AAB: ${audit.metrics.projectedAABMB} MB meets target (<= 25.0 MB)`);

// 3. Universal APK Gate Compliance (<= 45 MB)
console.log('[CHECK 3] Verifying Universal APK release gate...');
assert.ok(audit.gates.passesAPK, `Universal APK size (${audit.metrics.projectedAPKMB} MB) must be <= 45.0 MB`);
console.log(`  [PASS] Universal APK: ${audit.metrics.projectedAPKMB} MB is below statutory ceiling (<= 45.0 MB)`);

// 4. Asset Budget Verification
console.log('[CHECK 4] Verifying static asset footprint...');
assert.ok(audit.metrics.assetBytes < 5 * 1024 * 1024, 'Static asset footprint must be below 5 MB');
console.log(`  [PASS] Static assets verified: ${audit.metrics.assetKB} KB`);

console.log('\n=============================================================');
console.log('  JOB 024 APP SIZE BASELINE: ALL CHECKS PASSED (CERTIFIED)!  ');
console.log('=============================================================\n');
