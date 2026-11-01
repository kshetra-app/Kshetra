import assert from 'node:assert/strict';
import { runSizeGate } from '../scripts/ci/mobile-size-gate.mjs';

async function run() {
  console.log('=== RUNNING DOMAIN 10: JOB 080 MOBILE SIZE REGRESSION GATE SUITE ===');

  // Check 1: Normal Production Build Passes under Ceilings
  console.log('\n[CHECK 1] Verifying standard release build passes under defined ceilings...');
  const passReport = runSizeGate({
    universalApkBytes: 38450120, // 36.6 MB (< 45 MB ceiling)
    aabBaseModuleBytes: 19280140, // 18.3 MB (< 25 MB ceiling)
    hermesBundleBytes: 12840900,  // 12.2 MB (< 25 MB ceiling)
    fontAssetsTotalBytes: 7840100, // 7.4 MB (< 10 MB ceiling)
  });
  assert.strictEqual(passReport.gatePassed, true, 'Standard production build must pass size gate');
  assert.strictEqual(passReport.reasons.length, 0);
  console.log('  [PASS] Standard build sizes confirmed strictly within ceilings.');

  // Check 2: Absolute Ceiling Breach Triggers Failure
  console.log('\n[CHECK 2] Verifying absolute ceiling breach trips gate...');
  const ceilingBreachReport = runSizeGate({
    universalApkBytes: 48 * 1024 * 1024, // 48 MB (> 45 MB ceiling)
  });
  assert.strictEqual(ceilingBreachReport.gatePassed, false, 'Build exceeding 45MB APK ceiling must fail');
  assert.ok(ceilingBreachReport.reasons.some(r => r.includes('45MB ceiling')));
  console.log('  [PASS] Absolute ceiling breach correctly trips gate.');

  // Check 3: Unauthorized > 2% Delta Regression Triggers Failure
  console.log('\n[CHECK 3] Verifying unauthorized > 2% delta regression trips gate...');
  const regressionReport = runSizeGate({
    universalApkBytes: 41000000, // +7.3% delta vs baseline 38.2MB
    commitMessage: 'feat(mobile): add heavy unoptimized assets without authorization',
  });
  assert.strictEqual(regressionReport.gatePassed, false, 'Unauthorized >2% regression must fail');
  assert.strictEqual(regressionReport.overrideTokenPresent, false);
  assert.ok(regressionReport.reasons.some(r => r.includes('2.0% regression threshold')));
  console.log('  [PASS] Unauthorized size regression correctly blocked.');

  // Check 4: Authorized > 2% Regression with Override Token Passes
  console.log('\n[CHECK 4] Verifying authorized regression passes when SIZE_REGRESSION_AUTHORIZED token present...');
  const authorizedReport = runSizeGate({
    universalApkBytes: 41000000, // +7.3% delta
    commitMessage: 'feat(mobile): new high-res offline vector tiles [SIZE_REGRESSION_AUTHORIZED: CTO_APPROVAL_REF_20261101]',
  });
  assert.strictEqual(authorizedReport.gatePassed, true, 'Authorized regression with override token must pass');
  assert.strictEqual(authorizedReport.overrideTokenPresent, true);
  console.log('  [PASS] Override token authorization successfully validated.');

  console.log('\n===============================================================');
  console.log('  JOB 080 MOBILE SIZE REGRESSION GATE: ALL CHECKS PASSED (100%)!');
  console.log('===============================================================');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
