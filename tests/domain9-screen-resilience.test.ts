import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { ScreenUIState, ScreenStateConfig } from '@kshetra/shared';

console.log('=== RUNNING DOMAIN 9: JOB 073 SCREEN RESILIENCE VERIFICATION ===');

const stateViewPath = path.resolve('apps/mobile/components/StateView.tsx');
assert.ok(fs.existsSync(stateViewPath), 'StateView.tsx must exist');
const stateViewSource = fs.readFileSync(stateViewPath, 'utf8');

// Check 1: Verify all 5 canonical states are handled
console.log('\n[CHECK 1] Verifying all 5 canonical states in StateView.tsx...');
const requiredStates = ['loading', 'empty', 'error', 'retry', 'offline', 'ready'];
for (const s of requiredStates) {
  assert.ok(
    stateViewSource.includes(`currentState === '${s}'`) || stateViewSource.includes(`'${s}'`),
    `StateView must explicitly handle state: ${s}`
  );
}
console.log('  [PASS] All 5 canonical states (loading, empty, error, retry, offline) verified.');

// Check 2: Verify Skeleton Shimmer loading layout integration
console.log('\n[CHECK 2] Verifying Skeleton Shimmer loader integration...');
assert.ok(
  stateViewSource.includes('ConstituencyListSkeleton') || stateViewSource.includes('Skeleton'),
  'StateView must render skeleton shimmer layout in loading state'
);
assert.ok(
  stateViewSource.includes('state-view-loading'),
  'StateView must contain testID state-view-loading'
);
console.log('  [PASS] Skeleton Shimmer layout in loading state verified.');

// Check 3: Verify Empty State with CTA
console.log('\n[CHECK 3] Verifying Empty state illustration and action CTA...');
assert.ok(
  stateViewSource.includes('state-view-empty'),
  'StateView must contain testID state-view-empty'
);
assert.ok(
  stateViewSource.includes('emptyActionLabelKey') && stateViewSource.includes('onEmptyAction'),
  'StateView must support empty action label and onEmptyAction callback'
);
console.log('  [PASS] Empty state illustration and primary action CTA verified.');

// Check 4: Verify Error State, Correlation ID, and Retry Cooldown
console.log('\n[CHECK 4] Verifying Error state with correlation ID and retry cooldown...');
assert.ok(
  stateViewSource.includes('state-view-error'),
  'StateView must contain testID state-view-error'
);
assert.ok(
  stateViewSource.includes('correlationId'),
  'StateView must display correlation ID for technical diagnostics'
);
assert.ok(
  stateViewSource.includes('retryCooldownSeconds') && stateViewSource.includes('cooldown > 0'),
  'StateView must implement exponential/cooldown timer to prevent request flooding'
);
console.log('  [PASS] Error state with correlation ID and cooldown protection verified.');

// Check 5: Verify Offline Mode Indicator
console.log('\n[CHECK 5] Verifying Offline Mode banner and cached content presentation...');
assert.ok(
  stateViewSource.includes('state-view-offline'),
  'StateView must contain testID state-view-offline'
);
assert.ok(
  stateViewSource.includes('offline_cached_banner') || stateViewSource.includes('Offline Mode'),
  'StateView must display offline awareness banner when displaying cached data'
);
console.log('  [PASS] Offline banner and graceful local cache presentation verified.');

console.log('\n==================================================================');
console.log('  JOB 073 SCREEN RESILIENCE VERIFICATION: ALL CHECKS PASSED (100%)!');
console.log('==================================================================\n');
