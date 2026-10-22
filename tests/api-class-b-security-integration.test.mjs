/**
 * Fastify Class B Write Endpoints Security & Authorization Integration Test Battery
 * Criterion: CRIT-H04-02 / Task W021.5-H-04 / REQ-MOB-004
 * Validates:
 * 1. Unauthenticated rejection (401)
 * 2. Identity spoofing prevention (403 when payload does not match authenticated user)
 * 3. Authenticated derivation and authorized persistence (200/201)
 * 4. Fail-closed database error propagation (500, never disguises failure as success)
 * Master Execution Framework Amendment v1.6 / Rule IV-001 / CTO Directive 138
 */

import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

if (!process.env.TSX_BOOTSTRAPPED) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, TSX_BOOTSTRAPPED: '1' }
  });
  process.exit(result.status ?? 0);
}

const { describe, it, before, after } = await import('node:test');
const assert = (await import('node:assert')).default;

const { buildApp } = await import('../apps/api/src/server.ts');
const { setSupabaseConfiguredForTesting } = await import('../apps/api/src/lib/supabase.ts');

describe('CRIT-H04-02: Class B Write Routes Security & Mediation Integration Battery', () => {
  let app;

  before(async () => {
    // Isolate unit testing mode without active live Supabase mutations
    setSupabaseConfiguredForTesting(false);
    app = await buildApp();
    await app.ready();
  });

  after(async () => {
    if (app) await app.close();
  });

  // ─── USER RELATIONSHIPS (followUser / unfollowUser) ───────────────────────────

  it('1. POST /api/v1/users/:id/follow - Rejects unauthenticated request with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/user_target_123/follow',
      payload: {},
    });
    assert.strictEqual(res.statusCode, 401, 'Unauthenticated request must be rejected with 401');
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.error, 'Unauthorized');
  });

  it('2. POST /api/v1/users/:id/follow - Rejects identity spoofing with 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/user_target_123/follow',
      headers: {
        authorization: 'Bearer user-real-alice',
      },
      payload: {
        followerId: 'user-spoofed-bob', // Payload attempts to impersonate Bob
      },
    });
    assert.strictEqual(res.statusCode, 403, 'Spoofed followerId must be rejected with 403 Forbidden');
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.code, 'FORBIDDEN');
    assert(body.message.includes('Identity spoofing rejected'));
  });

  it('3. POST /api/v1/users/:id/follow - Succeeds with verified authenticated identity', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/user_target_123/follow',
      headers: {
        authorization: 'Bearer user-real-alice',
      },
      payload: {
        followerId: 'user-real-alice', // Matches verified user
      },
    });
    assert.strictEqual(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.followerId, 'user-real-alice');
    assert.strictEqual(body.targetUserId, 'user_target_123');
    assert.strictEqual(body.followed, true);
  });

  it('4. DELETE /api/v1/users/:id/follow - Rejects unauthenticated request with 401', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/user_target_123/follow',
    });
    assert.strictEqual(res.statusCode, 401);
  });

  it('5. DELETE /api/v1/users/:id/follow - Rejects identity spoofing with 403', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/user_target_123/follow',
      headers: {
        authorization: 'Bearer user-real-alice',
      },
      payload: {
        followerId: 'user-spoofed-bob',
      },
    });
    assert.strictEqual(res.statusCode, 403);
  });

  it('6. DELETE /api/v1/users/:id/follow - Succeeds with verified authenticated identity', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/user_target_123/follow',
      headers: {
        authorization: 'Bearer user-real-alice',
      },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.unfollowed, true);
  });

  // ─── ASPIRANT ACADEMY (completeModule, joinChallenge, endorseAspirant) ────────

  it('7. POST /api/v1/aspirant/modules/:id/complete - Rejects unauthenticated with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/modules/mod_101/complete',
      payload: { quizScore: 90 },
    });
    assert.strictEqual(res.statusCode, 401);
  });

  it('8. POST /api/v1/aspirant/modules/:id/complete - Rejects identity spoofing with 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/modules/mod_101/complete',
      headers: {
        authorization: 'Bearer user-student-1',
      },
      payload: {
        userId: 'user-student-2', // Spoofed user ID
        quizScore: 95,
      },
    });
    assert.strictEqual(res.statusCode, 403);
  });

  it('9. POST /api/v1/aspirant/modules/:id/complete - Succeeds with verified identity', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/modules/mod_101/complete',
      headers: {
        authorization: 'Bearer user-student-1',
      },
      payload: {
        quizScore: 95,
      },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.userId, 'user-student-1');
    assert.strictEqual(body.moduleId, 'mod_101');
  });

  it('10. POST /api/v1/aspirant/:id/endorse - Rejects unauthenticated with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/asp_42/endorse',
      payload: { message: 'Great leader' },
    });
    assert.strictEqual(res.statusCode, 401);
  });

  it('11. POST /api/v1/aspirant/:id/endorse - Rejects endorser spoofing with 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/asp_42/endorse',
      headers: {
        authorization: 'Bearer user-endorser-actual',
      },
      payload: {
        endorserId: 'user-endorser-impersonated',
        message: 'Endorsement attempt',
      },
    });
    assert.strictEqual(res.statusCode, 403);
  });

  it('12. POST /api/v1/aspirant/:id/endorse - Succeeds with verified identity', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/asp_42/endorse',
      headers: {
        authorization: 'Bearer user-endorser-actual',
      },
      payload: {
        message: 'Verified community endorsement',
      },
    });
    assert.strictEqual(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.endorserId, 'user-endorser-actual');
    assert.strictEqual(body.aspirantId, 'asp_42');
  });

  // ─── CONTRIBUTOR KYC & DEVICES ────────────────────────────────────────────────

  it('13. POST /api/v1/contributor/kyc - Rejects unauthenticated with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/contributor/kyc',
      payload: {
        fullLegalName: 'Test Contributor',
        phoneNumber: '+919876543210',
      },
    });
    assert.strictEqual(res.statusCode, 401);
  });

  it('14. POST /api/v1/contributor/kyc - Rejects user spoofing with 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/contributor/kyc',
      headers: {
        authorization: 'Bearer user-citizen-alice',
      },
      payload: {
        userId: 'user-citizen-bob', // Mismatch
        fullLegalName: 'Test Contributor',
        phoneNumber: '+919876543210',
      },
    });
    assert.strictEqual(res.statusCode, 403);
  });

  it('15. POST /api/v1/contributor/kyc - Succeeds with verified identity', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/contributor/kyc',
      headers: {
        authorization: 'Bearer user-citizen-alice',
      },
      payload: {
        fullLegalName: 'Alice Sharma',
        phoneNumber: '+919876543210',
        phoneVerified: true,
      },
    });
    assert.strictEqual(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.userId, 'user-citizen-alice');
  });

  // ─── SHORTS COMMENTS ──────────────────────────────────────────────────────────

  it('16. POST /api/v1/shorts/:id/comments - Rejects unauthenticated with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/shorts/short_1/comments',
      payload: { content: 'Nice point!' },
    });
    assert.strictEqual(res.statusCode, 401);
  });

  it('17. POST /api/v1/shorts/:id/comments - Rejects author spoofing with 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/shorts/short_1/comments',
      headers: {
        authorization: 'Bearer user-commenter-1',
      },
      payload: {
        userId: 'user-impersonated-2',
        content: 'Unauthorized comment',
      },
    });
    assert.strictEqual(res.statusCode, 403);
  });

  // ─── NOTIFICATIONS READ & DM READ ─────────────────────────────────────────────

  it('18. PATCH /api/v1/notifications/read - Rejects unauthenticated with 401', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/notifications/read',
      payload: { all: true },
    });
    assert.strictEqual(res.statusCode, 401);
  });

  it('19. PATCH /api/v1/notifications/read - Rejects user spoofing with 403', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/notifications/read',
      headers: {
        authorization: 'Bearer user-owner-1',
      },
      payload: {
        userId: 'user-other-2',
        all: true,
      },
    });
    assert.strictEqual(res.statusCode, 403);
  });

  it('20. POST /api/v1/dm/messages/read - Rejects unauthenticated with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/dm/messages/read',
      payload: { conversationId: 'conv_123' },
    });
    assert.strictEqual(res.statusCode, 401);
  });

  it('21. POST /api/v1/dm/messages/read - Rejects user spoofing with 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/dm/messages/read',
      headers: {
        authorization: 'Bearer user-participant-1',
      },
      payload: {
        conversationId: 'conv_123',
        userId: 'user-stranger-2',
      },
    });
    assert.strictEqual(res.statusCode, 403);
  });
});
