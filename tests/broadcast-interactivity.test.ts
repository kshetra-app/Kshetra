/**
 * Professional Broadcast Interactivity Test Suite (Job W052)
 * Authority: Master Product Blueprint, Amendment v1.2, Plan PLAN-W052-REV-1.0
 *
 * Verifies:
 * 1. Live audience polling lifecycle (Create, Fetch Active, Close).
 * 2. Cryptographic Anti-Sybil duplicate voting protection (Daily salted HMAC, DPDP Act 2023 zero-PII).
 * 3. Percentage calculation and option distribution.
 * 4. Audience Q&A submission with automated fail-closed DPDP Act 2023 content moderation:
 *    - Rejection of email addresses
 *    - Rejection of phone numbers
 * 5. Upvoting and host moderation (Pinning, Answering).
 * 6. Fastify API route endpoints for polling and Q&A via mock inject.
 */

import assert from 'node:assert/strict';
import { buildApp } from '../apps/api/src/server';
import { 
  broadcastInteractivityService, 
  DuplicateVoteError, 
  PollClosedError, 
  ContentModerationError 
} from '../apps/api/src/services/broadcastInteractivityService';

async function main() {
  console.log('=== RUNNING JOB W052 BROADCAST INTERACTIVITY TEST SUITE ===\n');

  const streamId = 'stream_test_w052_interactivity';

  // ─── PART 1: LIVE POLLING LIFECYCLE & ANTI-SYBIL DUPLICATE PROTECTION ─────────
  console.log('[CHECK 1] Creating live audience poll...');
  const poll = await broadcastInteractivityService.createPoll(streamId, {
    question: 'Should youth skill development centers be prioritized in this constituency?',
    options: ['Strongly Agree', 'Somewhat Agree', 'Neutral', 'Disagree'],
    durationSeconds: 120,
  });

  assert.ok(poll.id);
  assert.strictEqual(poll.options.length, 4);
  assert.strictEqual(poll.status, 'ACTIVE');
  assert.strictEqual(poll.totalVotes, 0);
  console.log('  [PASS] Live poll created with 4 options.');

  // 1.1 Cast First Vote (Voter A)
  console.log('\n[CHECK 2] Casting anonymous ballots with anti-sybil voter tokens...');
  const voteResA = await broadcastInteractivityService.castVote(poll.id, {
    optionId: poll.options[0].id,
    voterToken: 'voter_device_tok_alice_123',
  });
  assert.strictEqual(voteResA.success, true);
  assert.strictEqual(voteResA.totalVotes, 1);
  assert.strictEqual(voteResA.options[0].percentage, 100);
  console.log('  [PASS] Voter A cast ballot successfully (Option 1 = 100%).');

  // 1.2 Cast Second Vote (Voter B on Option 1)
  const voteResB = await broadcastInteractivityService.castVote(poll.id, {
    optionId: poll.options[0].id,
    voterToken: 'voter_device_tok_bob_456',
  });
  assert.strictEqual(voteResB.totalVotes, 2);

  // 1.3 Cast Third Vote (Voter C on Option 2)
  const voteResC = await broadcastInteractivityService.castVote(poll.id, {
    optionId: poll.options[1].id,
    voterToken: 'voter_device_tok_charlie_789',
  });
  assert.strictEqual(voteResC.totalVotes, 3);
  assert.strictEqual(voteResC.options[0].percentage, 67); // 2/3 = 67%
  assert.strictEqual(voteResC.options[1].percentage, 33); // 1/3 = 33%
  console.log('  [PASS] Voter distribution verified (Option 0: 67%, Option 1: 33%).');

  // 1.4 Adversarial Probe: Duplicate Vote from Voter A (Anti-Sybil Rejection)
  console.log('\n[CHECK 3] Testing Anti-Sybil duplicate voting rejection (Fail-Closed)...');
  await assert.rejects(
    async () => {
      await broadcastInteractivityService.castVote(poll.id, {
        optionId: poll.options[2].id,
        voterToken: 'voter_device_tok_alice_123', // duplicate token
      });
    },
    (err: any) => {
      assert.ok(err instanceof DuplicateVoteError);
      assert.ok(err.message.includes('Citizen has already cast a vote in this poll'));
      return true;
    }
  );
  console.log('  [PASS] Duplicate vote from Voter A rejected fail-closed with DuplicateVoteError.');

  // 1.5 Close Poll & Verify Subsequent Votes Blocked
  console.log('\n[CHECK 4] Closing poll and verifying subsequent votes rejected...');
  const closed = await broadcastInteractivityService.closePoll(poll.id);
  assert.strictEqual(closed.status, 'CLOSED');

  await assert.rejects(
    async () => {
      await broadcastInteractivityService.castVote(poll.id, {
        optionId: poll.options[0].id,
        voterToken: 'voter_device_tok_david_999',
      });
    },
    (err: any) => {
      assert.ok(err instanceof PollClosedError);
      assert.ok(err.message.includes('Poll is closed for voting'));
      return true;
    }
  );
  console.log('  [PASS] Vote on closed poll rejected fail-closed with PollClosedError.');

  // ─── PART 2: AUDIENCE Q&A & DPDP ACT 2023 CONTENT MODERATION ─────────────────
  console.log('\n[CHECK 5] Testing audience Q&A with DPDP Act 2023 content moderation...');

  // 2.1 Adversarial Probe: Question with embedded email address (DPDP PII leak)
  await assert.rejects(
    async () => {
      await broadcastInteractivityService.submitQuestion(streamId, {
        authorDisplayName: 'Ramesh',
        authorToken: 'tok_voter_1',
        questionText: 'Sir please email me the manifesto details at ramesh.kumar@example.com immediately.',
      });
    },
    (err: any) => {
      assert.ok(err instanceof ContentModerationError);
      assert.ok(err.message.includes('email addresses (DPDP Act 2023)'));
      return true;
    }
  );
  console.log('  [PASS] Question with email address rejected fail-closed (DPDP Act 2023 compliant).');

  // 2.2 Adversarial Probe: Question with embedded Indian phone number (DPDP PII leak)
  await assert.rejects(
    async () => {
      await broadcastInteractivityService.submitQuestion(streamId, {
        authorDisplayName: 'Pooja',
        authorToken: 'tok_voter_2',
        questionText: 'Call me on 9876543210 regarding the road repair issue in Ward 4.',
      });
    },
    (err: any) => {
      assert.ok(err instanceof ContentModerationError);
      assert.ok(err.message.includes('phone numbers (DPDP Act 2023)'));
      return true;
    }
  );
  console.log('  [PASS] Question with phone number rejected fail-closed (DPDP Act 2023 compliant).');

  // 2.3 Valid Citizen Question
  const q1 = await broadcastInteractivityService.submitQuestion(streamId, {
    authorDisplayName: 'Sneha',
    authorToken: 'tok_voter_3',
    questionText: 'What is the implementation timeline for the proposed agro-processing park in Kodangal?',
  });
  assert.ok(q1.id);
  assert.strictEqual(q1.status, 'APPROVED');
  assert.strictEqual(q1.upvotes, 0);
  console.log('  [PASS] Clean citizen question submitted and approved.');

  // 2.4 Question Upvoting
  console.log('\n[CHECK 6] Testing audience question upvoting and host pinning...');
  const upvoteRes = await broadcastInteractivityService.upvoteQuestion(q1.id, 'tok_voter_4');
  assert.strictEqual(upvoteRes.success, true);
  assert.strictEqual(upvoteRes.upvotes, 1);

  // Idempotent second upvote from same voter
  const upvoteRes2 = await broadcastInteractivityService.upvoteQuestion(q1.id, 'tok_voter_4');
  assert.strictEqual(upvoteRes2.success, false);
  assert.strictEqual(upvoteRes2.upvotes, 1);
  console.log('  [PASS] Upvoting verified with idempotent duplicate handling.');

  // 2.5 Host Pins Question & Marks Answered
  const pinnedQ = await broadcastInteractivityService.moderateQuestion(q1.id, {
    status: 'ANSWERED',
    isPinned: true,
  });
  assert.strictEqual(pinnedQ.isPinned, true);
  assert.strictEqual(pinnedQ.status, 'ANSWERED');
  assert.ok(pinnedQ.answeredAt);
  console.log('  [PASS] Host question pinning and answered status verified.');

  // ─── PART 3: FASTIFY API ENDPOINT PROBES ──────────────────────────────────────
  console.log('\n[CHECK 7] Verifying Fastify API endpoints for polls and Q&A...');
  const app = await buildApp();

  // Create poll via API
  const apiPollRes = await app.inject({
    method: 'POST',
    url: `/api/v1/broadcast/streams/${streamId}/polls`,
    payload: {
      question: 'Rate the road connectivity improvements in your mandal',
      options: ['Good', 'Average', 'Poor'],
    },
  });
  assert.strictEqual(apiPollRes.statusCode, 201);
  const apiPollData = JSON.parse(apiPollRes.payload);
  assert.ok(apiPollData.poll.id);

  // Cast vote via API
  const apiVoteRes = await app.inject({
    method: 'POST',
    url: `/api/v1/broadcast/streams/${streamId}/polls/${apiPollData.poll.id}/vote`,
    payload: {
      optionId: apiPollData.poll.options[0].id,
      voterToken: 'api_voter_1',
    },
  });
  assert.strictEqual(apiVoteRes.statusCode, 200);

  // Duplicate vote via API -> 409 Conflict
  const apiDupVoteRes = await app.inject({
    method: 'POST',
    url: `/api/v1/broadcast/streams/${streamId}/polls/${apiPollData.poll.id}/vote`,
    payload: {
      optionId: apiPollData.poll.options[1].id,
      voterToken: 'api_voter_1',
    },
  });
  assert.strictEqual(apiDupVoteRes.statusCode, 409);
  console.log('  [PASS] Duplicate vote via Fastify returned 409 Conflict.');

  // Submit Q&A with PII via API -> 422 Unprocessable Entity
  const apiPiiRes = await app.inject({
    method: 'POST',
    url: `/api/v1/broadcast/streams/${streamId}/questions`,
    payload: {
      questionText: 'Contact me at pooja.sharma@example.com for civic feedback.',
      authorToken: 'api_voter_1',
    },
  });
  assert.strictEqual(apiPiiRes.statusCode, 422);
  console.log('  [PASS] PII leakage in question via Fastify returned 422 Unprocessable Entity.');

  await app.close();
  console.log('\n=============================================================');
  console.log('  JOB W052 BROADCAST INTERACTIVITY: ALL CHECKS PASSED!       ');
  console.log('=============================================================\n');
}

main().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
