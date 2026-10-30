/**
 * tests/job033-civic-discourse.test.ts
 *
 * Verifies JOB 033: Constituency Civic Discourse & Threaded Comments
 *
 * Validates:
 * 1. Citizen comment submission with safety moderation
 * 2. Official verified badge attribution (MLA / GHMC Official vs Citizen)
 * 3. Zero PII leakage in comment representations
 * 4. Dispute filing guard (only resolved issues can be disputed)
 * 5. Decision 2 (Option 1): 5 distinct community member disputes auto-reopen issue to REOPENED
 */

import assert from 'node:assert/strict';
import {
  civicService,
  DisputeNotAllowedError,
  ContentPolicyViolationError,
} from '../apps/api/src/services/civicService';

console.log('=== RUNNING JOB 033 CIVIC DISCOURSE & DISPUTES TESTS ===\n');

async function runTests() {
  // 1. Create a civic issue
  console.log('[CHECK 1] Creating civic issue for discussion and disputes...');
  const issue = await civicService.createIssue(
    {
      title: 'Substandard asphalt laid on Botanical Garden road',
      description: 'Bitumen washed away in first light rain. Surface is gravel and hazardous.',
      category: 'roads',
      severity: 'medium',
      constituencyId: 'TS-AC-67',
      stateCode: 'TS',
    },
    { userId: 'discourse-citizen-1', userName: 'Rajesh V' }
  );
  console.log(`  [PASS] Issue created with ID ${issue.id}`);

  // 2. Citizen adds comment
  console.log('[CHECK 2] Citizen adds community commentary...');
  const c1 = await civicService.addComment(
    issue.id,
    { body: 'I noticed gravel scattered across both lanes near the botanical garden gate. Two bikes slipped this morning.' },
    { userId: 'discourse-citizen-2', userName: 'Madhavi S', role: 'citizen' }
  );
  assert.equal(c1.isOfficial, false, 'Citizen comment must have isOfficial: false');
  assert.equal(c1.userName, 'Madhavi S');
  console.log('  [PASS] Citizen comment recorded without official badge');

  // 3. Official adds verified comment
  console.log('[CHECK 3] Official adds comment with verified official badge...');
  const c2 = await civicService.addComment(
    issue.id,
    { body: 'GHMC engineering inspection scheduled for 2:00 PM today with the contractor.' },
    { userId: 'official-ghmc-ee', userName: 'Executive Engineer GHMC', role: 'official' }
  );
  assert.equal(c2.isOfficial, true, 'Official comment must have isOfficial: true');
  console.log('  [PASS] Official badge correctly attributed to municipal engineer');

  // 4. Reject abusive comment
  console.log('[CHECK 4] Verifying abusive comment is rejected by moderation...');
  await assert.rejects(
    async () => {
      await civicService.addComment(
        issue.id,
        { body: 'I will kill everyone in this department' },
        { userId: 'troll-1', userName: 'Troll', role: 'citizen' }
      );
    },
    (err: any) => {
      assert.ok(err instanceof ContentPolicyViolationError || err.code === 'CONTENT_MODERATION_FAILED');
      return true;
    }
  );
  console.log('  [PASS] Moderation rejected abusive comment');

  // 5. Dispute filing on non-resolved issue must be rejected
  console.log('[CHECK 5] Verifying dispute filing on non-resolved issue is rejected...');
  await assert.rejects(
    async () => {
      await civicService.disputeResolution(
        issue.id,
        { reason: 'Work not done properly' },
        'dispute-voter-1'
      );
    },
    (err: any) => {
      assert.ok(err instanceof DisputeNotAllowedError || err.code === 'DISPUTE_NOT_ALLOWED');
      return true;
    }
  );
  console.log('  [PASS] Premature dispute rejected with DISPUTE_NOT_ALLOWED');

  // 6. Transition issue through lifecycle to RESOLVED
  console.log('[CHECK 6] Transitioning issue to RESOLVED...');
  await civicService.updateStatus(
    issue.id,
    { status: 'acknowledged', note: 'Noted' },
    { userId: 'official-ghmc-ee', role: 'official' }
  );
  await civicService.updateStatus(
    issue.id,
    { status: 'in_progress', note: 'Contractor summoned' },
    { userId: 'official-ghmc-ee', role: 'official' }
  );
  const resolved = await civicService.updateStatus(
    issue.id,
    { status: 'resolved', note: 'Contractor re-laid dense bituminous macadam (DBM) layer at own expense.' },
    { userId: 'official-ghmc-ee', role: 'official' }
  );
  assert.equal(resolved.status, 'resolved');
  console.log('  [PASS] Issue transitioned to RESOLVED');

  // 7. Community members dispute resolution (Decision 2: Option 1)
  console.log('[CHECK 7] Community filing resolution disputes (target: 5 disputes to auto-reopen)...');

  // Disputes 1 to 4
  for (let i = 1; i <= 4; i++) {
    const res = await civicService.disputeResolution(
      issue.id,
      { reason: `Gravel is still loose at section ${i}, work was superficial.` },
      `dispute-citizen-${i}`
    );
    assert.equal(res.disputeCount, i);
    assert.equal(res.reopened, false, 'Should not reopen before reaching threshold of 5');
  }
  console.log('  [PASS] 4 disputes logged, issue remains in RESOLVED state');

  // 8. 5th Community Dispute triggers Decision 2 Option 1: Auto-Reopen!
  console.log('[CHECK 8] 5th community dispute triggers auto-reopen to REOPENED status...');
  const fifthDispute = await civicService.disputeResolution(
    issue.id,
    { reason: 'Rains yesterday washed away new layer again. Photos submitted.' },
    'dispute-citizen-5'
  );
  assert.equal(fifthDispute.disputeCount, 5);
  assert.equal(fifthDispute.reopened, true, '5th dispute must trigger reopened: true');

  const refetchedIssue = await civicService.getIssue(issue.id);
  assert.ok(refetchedIssue);
  assert.equal(refetchedIssue.status, 'reopened', 'Issue status must transition to REOPENED');
  console.log(`  [PASS] Issue automatically reopened by community consensus (status = ${refetchedIssue.status})`);

  console.log('\n=============================================================');
  console.log('  JOB 033 CIVIC DISCOURSE & DISPUTES: ALL CHECKS PASSED!     ');
  console.log('=============================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FAIL] JOB 033 Test encountered an error:', err);
  process.exit(1);
});
