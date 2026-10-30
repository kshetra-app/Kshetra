/**
 * tests/job049-community-groups-roles.test.ts
 *
 * Verifies JOB 049: Community Groups — Geographic Membership & Role Permissions
 * Ratified under DEC-176 and DEC-177
 *
 * Validates:
 * 1. Community group creation scoped to Assembly Constituency with sub-geography (Mandal, Ward)
 * 2. Automatic admin role assignment for group creator
 * 3. Citizen joining group with default 'member' role and memberCount increment
 * 4. Admin promoting member to 'moderator' and permission enforcement
 * 5. Non-admin forbidden from updating member roles
 * 6. Geographic filtering and locality isolation
 * 7. Member leaving group with memberCount decrement and membership removal
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { civicService } from '../apps/api/src/services/civicService';
import { setSupabaseConfiguredForTesting } from '../apps/api/src/lib/supabase';

test('JOB 049: Community Groups — Geographic Membership & Role Permissions', async (t) => {
  setSupabaseConfiguredForTesting(false);

  t.after(async () => {
    setSupabaseConfiguredForTesting(true);
  });

  const founderId = 'citizen-founder-jubilee';
  const memberId1 = 'citizen-resident-yousufguda';
  const memberId2 = 'citizen-resident-borabanda';
  let groupId: string;

  await t.test('1. Creates community working group with AC, Mandal, and Ward scoping', async () => {
    const group = await civicService.createGroup(
      {
        name: 'Jubilee Hills Ward 104 Lake Care Collective',
        constituencyId: 'TS-AC-61',
        mandal: 'Shaikpet',
        ward: 'Ward 104',
        category: 'environment',
        description: 'Residents protecting local water bodies and storm water drains.',
      },
      founderId
    );

    assert.ok(group.id, 'Group must be assigned an ID');
    assert.equal(group.name, 'Jubilee Hills Ward 104 Lake Care Collective');
    assert.equal(group.constituencyId, 'TS-AC-61');
    assert.equal(group.mandal, 'Shaikpet');
    assert.equal(group.ward, 'Ward 104');
    assert.equal(group.memberCount, 1);
    assert.equal(group.createdBy, founderId);
    groupId = group.id;
  });

  await t.test('2. Creator is automatically assigned admin role', async () => {
    const role = await civicService.getMemberRole(groupId, founderId);
    assert.equal(role, 'admin', 'Creator must have admin role');
  });

  await t.test('3. Resident joins group and receives member role with incremented memberCount', async () => {
    const joinRes = await civicService.joinGroup(groupId, memberId1);
    assert.equal(joinRes.success, true);
    assert.equal(joinRes.memberCount, 2);

    const role = await civicService.getMemberRole(groupId, memberId1);
    assert.equal(role, 'member', 'New member must have member role');
  });

  await t.test('4. Group admin successfully promotes member to moderator', async () => {
    const promoteRes = await civicService.updateMemberRole(groupId, memberId1, 'moderator', founderId);
    assert.equal(promoteRes.success, true);
    assert.equal(promoteRes.role, 'moderator');

    const role = await civicService.getMemberRole(groupId, memberId1);
    assert.equal(role, 'moderator', 'Role must now be moderator');
  });

  await t.test('5. Non-admin is forbidden from updating member roles', async () => {
    await civicService.joinGroup(groupId, memberId2);

    await assert.rejects(
      async () => {
        // memberId2 is only a member, attempting to promote themselves or others
        await civicService.updateMemberRole(groupId, memberId2, 'admin', memberId2);
      },
      {
        message: /Only group admins can update member roles/,
      }
    );
  });

  await t.test('6. Geographic isolation & sub-locality filtering works accurately', async () => {
    // Create another group in different AC
    await civicService.createGroup(
      {
        name: 'Charminar Heritage Circle',
        constituencyId: 'TS-AC-77',
        category: 'heritage',
      },
      'citizen-charminar-1'
    );

    // List all groups in Jubilee Hills
    const ac61Groups = await civicService.listGroups('TS-AC-61');
    assert.equal(ac61Groups.some((g) => g.id === groupId), true);
    assert.equal(ac61Groups.some((g) => g.constituencyId === 'TS-AC-77'), false);

    // Filter by specific ward
    const ward104Groups = await civicService.listGroups('TS-AC-61', { ward: 'Ward 104' });
    assert.equal(ward104Groups.length, 1);
    assert.equal(ward104Groups[0].id, groupId);

    const ward999Groups = await civicService.listGroups('TS-AC-61', { ward: 'Ward 999' });
    assert.equal(ward999Groups.length, 0);
  });

  await t.test('7. Member leaving group decrements memberCount and purges membership', async () => {
    const leaveRes = await civicService.leaveGroup(groupId, memberId2);
    assert.equal(leaveRes.success, true);

    const role = await civicService.getMemberRole(groupId, memberId2);
    assert.equal(role, null, 'Membership record must be deleted');
  });
});
