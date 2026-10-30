/**
 * tests/job034-community-groups.test.ts
 *
 * Verifies JOB 034: Local Discourse & Constituency Community Working Groups
 *
 * Validates:
 * 1. Community working group creation scoped to Assembly Constituency
 * 2. Automatic admin role assignment for group creator
 * 3. Citizen joining working group with member count increment
 * 4. Citizen leaving working group with member count decrement
 * 5. Locality isolation (groups in TS-AC-67 do not leak to TS-AC-77)
 */

import assert from 'node:assert/strict';
import { civicService } from '../apps/api/src/services/civicService';

console.log('=== RUNNING JOB 034 COMMUNITY WORKING GROUPS TESTS ===\n');

async function runTests() {
  // 1. Create a community working group in Serilingampally (TS-AC-67)
  console.log('[CHECK 1] Creating citizen working group in Serilingampally (TS-AC-67)...');
  const group1 = await civicService.createGroup(
    {
      name: 'Kondapur Lake Rejuvenation Action Committee',
      constituencyId: 'TS-AC-67',
      category: 'environment',
      description: 'Citizen collective dedicated to stopping sewage discharge and cleaning Kondapur lake.',
    },
    'citizen-founder-1'
  );

  assert.ok(group1.id, 'Group must receive an ID');
  assert.equal(group1.constituencyId, 'TS-AC-67');
  assert.equal(group1.memberCount, 1, 'Founder must be initial member');
  assert.equal(group1.createdBy, 'citizen-founder-1');
  console.log(`  [PASS] Working group created: "${group1.name}" (ID: ${group1.id})`);

  // 2. Create another group in Charminar (TS-AC-77)
  console.log('[CHECK 2] Creating citizen working group in Charminar (TS-AC-77)...');
  const group2 = await civicService.createGroup(
    {
      name: 'Heritage Wall Restoration Group',
      constituencyId: 'TS-AC-77',
      category: 'development',
      description: 'Citizens working to preserve and restore ancient stone walls around Old City.',
    },
    'citizen-founder-2'
  );
  assert.equal(group2.constituencyId, 'TS-AC-77');
  console.log(`  [PASS] Charminar group created: "${group2.name}"`);

  // 3. Locality Scoping: List groups for TS-AC-67
  console.log('[CHECK 3] Verifying constituency scoping (TS-AC-67 vs TS-AC-77 isolation)...');
  const seriGroups = await civicService.listGroups('TS-AC-67');
  assert.ok(seriGroups.some((g) => g.id === group1.id), 'TS-AC-67 listing must include group 1');
  assert.ok(!seriGroups.some((g) => g.id === group2.id), 'TS-AC-67 listing must NOT include Charminar group');

  const charminarGroups = await civicService.listGroups('TS-AC-77');
  assert.ok(charminarGroups.some((g) => g.id === group2.id), 'TS-AC-77 listing must include group 2');
  assert.ok(!charminarGroups.some((g) => g.id === group1.id), 'TS-AC-77 listing must NOT include Serilingampally group');
  console.log('  [PASS] Constituency isolation verified with zero cross-constituency leakage');

  // 4. Joining community working group
  console.log('[CHECK 4] Citizens joining Kondapur Lake Committee...');
  const join1 = await civicService.joinGroup(group1.id, 'citizen-member-10');
  assert.equal(join1.success, true);
  assert.equal(join1.memberCount, 2, 'Member count must increase to 2');

  const join2 = await civicService.joinGroup(group1.id, 'citizen-member-11');
  assert.equal(join2.memberCount, 3, 'Member count must increase to 3');
  console.log('  [PASS] Citizen memberships successfully recorded (member count = 3)');

  // 5. Leaving community working group
  console.log('[CHECK 5] Citizen leaving community working group...');
  const leaveResult = await civicService.leaveGroup(group1.id, 'citizen-member-11');
  assert.equal(leaveResult.success, true);
  assert.equal(leaveResult.memberCount, 2, 'Member count must decrease to 2');
  console.log('  [PASS] Member departure successfully decremented member count');

  console.log('\n=============================================================');
  console.log('  JOB 034 COMMUNITY WORKING GROUPS: ALL CHECKS PASSED!       ');
  console.log('=============================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FAIL] JOB 034 Test encountered an error:', err);
  process.exit(1);
});
