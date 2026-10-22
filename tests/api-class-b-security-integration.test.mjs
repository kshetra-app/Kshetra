/**
 * Fastify Class B Write Endpoints Security, Authentication & Mediation Integration Battery
 * Criterion: CRIT-H04-02 / Task W021.5-H-04 / REQ-MOB-004
 * Validates:
 * 1. Unauthenticated rejection (401 for missing/malformed/invalid tokens)
 * 2. Unconfigured Auth Provider Fail-Closed (503 AUTH_PROVIDER_UNAVAILABLE)
 * 3. Production Protection: Test token validator cannot be registered in production
 * 4. Caller Role Spoofing Resistance: x-user-role header is completely ignored
 * 5. Identity Spoofing Prevention: 403 Forbidden when acting user does not match target resource
 * 6. Database Unavailability Fail-Closed: 503 SERVICE_UNAVAILABLE when database is unconfigured
 * 7. Database Error Propagation: 500 DATABASE_ERROR, never disguised as success
 * 8. Authorized Write Success: 200/201 with verified identity mediation
 * Master Execution Framework Amendment v1.6 / Rule IV-001 / CTO Directive 139
 */

import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

if (!process.env.TSX_BOOTSTRAPPED) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, TSX_BOOTSTRAPPED: '1', NODE_ENV: 'test', TEST_HARNESS_ACTIVE: 'true' }
  });
  process.exit(result.status ?? 0);
}

process.env.NODE_ENV = 'test';
process.env.TEST_HARNESS_ACTIVE = 'true';

const { describe, it, before, after, beforeEach } = await import('node:test');
const assert = (await import('node:assert')).default;

const { buildApp } = await import('../apps/api/src/server.ts');
const { setSupabaseConfiguredForTesting, supabase } = await import('../apps/api/src/lib/supabase.ts');
const { setTestTokenValidator } = await import('../apps/api/src/lib/userAuth.ts');

describe('CRIT-H04-02: Authentication Hardening, Fail-Closed Writes & Security Battery (CTO Directive 139)', () => {
  let app;

  before(async () => {
    app = await buildApp();
    await app.ready();
  });

  after(async () => {
    setTestTokenValidator(null);
    setSupabaseConfiguredForTesting(false);
    if (app) await app.close();
  });

  beforeEach(() => {
    // Default each test to isolated test token validator
    setTestTokenValidator((token) => {
      if (token === 'valid-alice-token') return { id: 'user-real-alice', role: 'citizen' };
      if (token === 'valid-mod-token') return { id: 'user-mod-dan', role: 'moderator' };
      if (token === 'valid-student-token') return { id: 'user-student-1', role: 'citizen' };
      if (token === 'valid-endorser-token') return { id: 'user-endorser-actual', role: 'citizen' };
      if (token === 'valid-contributor-token') return { id: 'user-citizen-alice', role: 'contributor' };
      if (token === 'valid-commenter-token') return { id: 'user-commenter-1', role: 'citizen' };
      if (token === 'valid-owner-token') return { id: 'user-owner-1', role: 'citizen' };
      if (token === 'valid-participant-token') return { id: 'user-participant-1', role: 'citizen' };
      return null;
    });
    setSupabaseConfiguredForTesting(true);
  });

  // ─── SUITE 1: AUTHENTICATION HARDENING & FAIL-CLOSED TOKENS ───────────────────

  it('1. Rejects request with missing Authorization header (401)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/user_target_123/follow',
      payload: {},
    });
    assert.strictEqual(res.statusCode, 401);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.error, 'Unauthorized');
    assert.strictEqual(body.code, 'UNAUTHORIZED');
  });

  it('2. Rejects request with non-Bearer Authorization header (401)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/user_target_123/follow',
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
      payload: {},
    });
    assert.strictEqual(res.statusCode, 401);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.code, 'UNAUTHORIZED');
  });

  it('3. Rejects request with invalid or expired Bearer token (401)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/user_target_123/follow',
      headers: { authorization: 'Bearer invalid-token-xyz' },
      payload: {},
    });
    assert.strictEqual(res.statusCode, 401);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.code, 'UNAUTHORIZED');
  });

  it('4. Fails closed with 503 AUTH_PROVIDER_UNAVAILABLE when auth provider is unconfigured in non-mock mode', async () => {
    setTestTokenValidator(null);
    setSupabaseConfiguredForTesting(false);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/user_target_123/follow',
      headers: { authorization: 'Bearer some-arbitrary-token' },
      payload: {},
    });
    assert.strictEqual(res.statusCode, 503);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.code, 'AUTH_PROVIDER_UNAVAILABLE');
  });

  it('5. Production Safety Guard: setTestTokenValidator throws in production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      assert.throws(
        () => setTestTokenValidator(() => ({ id: 'hacker', role: 'admin' })),
        /SECURITY VIOLATION: Test token validator can only be registered when NODE_ENV === "test" and TEST_HARNESS_ACTIVE === "true"/
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('5b. Test Harness Isolation: setTestTokenValidator throws when TEST_HARNESS_ACTIVE is not true', () => {
    const originalHarness = process.env.TEST_HARNESS_ACTIVE;
    try {
      delete process.env.TEST_HARNESS_ACTIVE;
      assert.throws(
        () => setTestTokenValidator(() => ({ id: 'hacker', role: 'admin' })),
        /SECURITY VIOLATION: Test token validator can only be registered when NODE_ENV === "test" and TEST_HARNESS_ACTIVE === "true"/
      );
    } finally {
      process.env.TEST_HARNESS_ACTIVE = originalHarness;
    }
  });

  it('5c. Auth Authority: Honors server-managed app_metadata.role from supabase.auth.getUser', async () => {
    setTestTokenValidator(null);
    setSupabaseConfiguredForTesting(true);

    const originalGetUser = supabase.auth.getUser;
    const originalFrom = supabase.from;

    supabase.auth.getUser = async (token) => {
      if (token === 'bearer-mod-token') {
        return {
          data: {
            user: {
              id: 'user-auth-mod-1',
              app_metadata: { role: 'moderator' },
              user_metadata: { role: 'citizen' }
            }
          },
          error: null
        };
      }
      return { data: { user: null }, error: { message: 'Invalid token' } };
    };

    supabase.from = (table) => {
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: { role: 'moderator' },
                error: null
              })
            })
          })
        };
      }
      if (table === 'reports') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { id: 'rep_test', status: 'pending', post_id: 'post_1' },
                error: null
              })
            })
          }),
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null })
          })
        };
      }
      if (table === 'moderation_actions') {
        return {
          insert: () => Promise.resolve({ data: null, error: null })
        };
      }
      return originalFrom.call(supabase, table);
    };

    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: { authorization: 'Bearer bearer-mod-token' },
        payload: {
          moderatorId: 'user-auth-mod-1',
          reportId: 'rep_test',
          actionType: 'delete_content',
          reason: 'Severe violation'
        }
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.actionType, 'delete_content');
    } finally {
      supabase.auth.getUser = originalGetUser;
      supabase.from = originalFrom;
    }
  });

  it('5d. Auth Authority: Disallows privilege escalation from caller-supplied user_metadata.role', async () => {
    setTestTokenValidator(null);
    setSupabaseConfiguredForTesting(true);

    const originalGetUser = supabase.auth.getUser;
    const originalFrom = supabase.from;

    // Caller supplied role: 'admin' in user_metadata, but app_metadata is empty
    supabase.auth.getUser = async (token) => {
      if (token === 'bearer-attacker-token') {
        return {
          data: {
            user: {
              id: 'user-attacker-1',
              app_metadata: {},
              user_metadata: { role: 'admin' } // SPOOF ATTEMPT
            }
          },
          error: null
        };
      }
      return { data: { user: null }, error: { message: 'Invalid token' } };
    };

    supabase.from = (table) => {
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { role: 'citizen' }, error: null })
            })
          })
        };
      }
      return originalFrom.call(supabase, table);
    };

    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: { authorization: 'Bearer bearer-attacker-token' },
        payload: {
          moderatorId: 'user-attacker-1',
          reportId: 'rep_test',
          actionType: 'delete_content',
          reason: 'Attempted unauthorized moderation'
        }
      });
      // Derived role is 'citizen' because user_metadata is ignored -> 403 Forbidden
      assert.strictEqual(res.statusCode, 403);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.code, 'FORBIDDEN');
    } finally {
      supabase.auth.getUser = originalGetUser;
      supabase.from = originalFrom;
    }
  });

  it('5e. Auth Authority: Unknown app_metadata.role falls closed to citizen', async () => {
    setTestTokenValidator(null);
    setSupabaseConfiguredForTesting(true);

    const originalGetUser = supabase.auth.getUser;
    const originalFrom = supabase.from;

    supabase.auth.getUser = async () => {
      return {
        data: {
          user: {
            id: 'user-weird-role',
            app_metadata: { role: 'super_hacker_unrecognized_role' }
          }
        },
        error: null
      };
    };

    supabase.from = (table) => {
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { role: 'citizen' }, error: null })
            })
          })
        };
      }
      return originalFrom.call(supabase, table);
    };

    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: { authorization: 'Bearer weird-token' },
        payload: {
          moderatorId: 'user-weird-role',
          reportId: 'rep_test',
          actionType: 'delete_content',
          reason: 'Test unrecognized role'
        }
      });
      assert.strictEqual(res.statusCode, 403);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.code, 'FORBIDDEN');
    } finally {
      supabase.auth.getUser = originalGetUser;
      supabase.from = originalFrom;
    }
  });

  it('5f. Auth Failure: Expired or invalid token in supabase.auth.getUser returns 401', async () => {
    setTestTokenValidator(null);
    setSupabaseConfiguredForTesting(true);

    const originalGetUser = supabase.auth.getUser;
    supabase.auth.getUser = async () => {
      return { data: { user: null }, error: { message: 'JWT expired' } };
    };

    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/users/target_u/follow',
        headers: { authorization: 'Bearer token-that-expired' },
        payload: {}
      });
      assert.strictEqual(res.statusCode, 401);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.code, 'UNAUTHORIZED');
    } finally {
      supabase.auth.getUser = originalGetUser;
    }
  });

  it('5g. Auth Exception: Network/runtime error during supabase.auth.getUser returns 500 AUTH_ERROR', async () => {
    setTestTokenValidator(null);
    setSupabaseConfiguredForTesting(true);

    const originalGetUser = supabase.auth.getUser;
    supabase.auth.getUser = async () => {
      throw new Error('Supabase Auth network timeout');
    };

    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/users/target_u/follow',
        headers: { authorization: 'Bearer token-causes-timeout' },
        payload: {}
      });
      assert.strictEqual(res.statusCode, 500);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.code, 'AUTH_ERROR');
    } finally {
      supabase.auth.getUser = originalGetUser;
    }
  });

  it('6. Caller Role Spoofing Resistance: x-user-role header is ignored', async () => {
    const originalFrom = supabase.from;
    supabase.from = (table) => {
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { role: 'citizen' }, error: null }),
            }),
          }),
        };
      }
      return originalFrom.call(supabase, table);
    };

    try {
      // Alice is a 'citizen', caller attempts to spoof 'admin' or 'moderator' via x-user-role header
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: {
          authorization: 'Bearer valid-alice-token',
          'x-user-role': 'admin', // Malicious privilege escalation attempt
        },
        payload: {
          moderatorId: 'user-real-alice',
          reportId: 'rep_1',
          actionType: 'delete_content',
          reason: 'Policy violation',
        },
      });
      // Alice's derived role is 'citizen', delete_content requires moderator/admin -> rejected with 403
      assert.strictEqual(res.statusCode, 403);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.code, 'FORBIDDEN');
    } finally {
      supabase.from = originalFrom;
    }
  });

  // ─── SUITE 2: IDENTITY SPOOFING REJECTION (403 FORBIDDEN) ────────────────────

  it('7. POST /api/v1/users/:id/follow - Rejects followerId mismatch with 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/user_target_123/follow',
      headers: { authorization: 'Bearer valid-alice-token' },
      payload: { followerId: 'user-spoofed-bob' },
    });
    assert.strictEqual(res.statusCode, 403);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.code, 'FORBIDDEN');
    assert(body.message.includes('Identity spoofing rejected'));
  });

  it('8. DELETE /api/v1/users/:id/follow - Rejects followerId mismatch with 403', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/user_target_123/follow',
      headers: { authorization: 'Bearer valid-alice-token' },
      payload: { followerId: 'user-spoofed-bob' },
    });
    assert.strictEqual(res.statusCode, 403);
  });

  it('9. POST /api/v1/aspirant/modules/:id/complete - Rejects userId spoofing with 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/modules/mod_101/complete',
      headers: { authorization: 'Bearer valid-student-token' },
      payload: { userId: 'user-student-2', quizScore: 95 },
    });
    assert.strictEqual(res.statusCode, 403);
  });

  it('10. POST /api/v1/aspirant/:id/endorse - Rejects endorserId spoofing with 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/asp_42/endorse',
      headers: { authorization: 'Bearer valid-endorser-token' },
      payload: { endorserId: 'user-impersonated-3', message: 'Endorse' },
    });
    assert.strictEqual(res.statusCode, 403);
  });

  it('11. POST /api/v1/contributor/kyc - Rejects userId spoofing with 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/contributor/kyc',
      headers: { authorization: 'Bearer valid-contributor-token' },
      payload: {
        userId: 'user-citizen-bob',
        fullLegalName: 'Test Contributor',
        phoneNumber: '+919876543210',
      },
    });
    assert.strictEqual(res.statusCode, 403);
  });

  it('12. POST /api/v1/shorts/:id/comments - Rejects author spoofing with 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/shorts/short_1/comments',
      headers: { authorization: 'Bearer valid-commenter-token' },
      payload: { userId: 'user-impersonated-2', content: 'Unauthorized comment' },
    });
    assert.strictEqual(res.statusCode, 403);
  });

  it('13. PATCH /api/v1/notifications/read - Rejects userId spoofing with 403', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/notifications/read',
      headers: { authorization: 'Bearer valid-owner-token' },
      payload: { userId: 'user-other-2', all: true },
    });
    assert.strictEqual(res.statusCode, 403);
  });

  it('14. POST /api/v1/dm/messages/read - Rejects userId spoofing with 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/dm/messages/read',
      headers: { authorization: 'Bearer valid-participant-token' },
      payload: { conversationId: 'conv_123', userId: 'user-stranger-2' },
    });
    assert.strictEqual(res.statusCode, 403);
  });

  // ─── SUITE 3: DATABASE UNAVAILABILITY FAIL-CLOSED (503 SERVICE_UNAVAILABLE) ──

  it('15. Write routes fail closed with 503 when database is unconfigured', async () => {
    setSupabaseConfiguredForTesting(false);

    // 1. Follow User
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/users/user_target_123/follow',
      headers: { authorization: 'Bearer valid-alice-token' },
      payload: { followerId: 'user-real-alice' },
    });
    assert.strictEqual(res1.statusCode, 503);
    assert.strictEqual(JSON.parse(res1.payload).code, 'SERVICE_UNAVAILABLE');

    // 2. Complete Module
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/modules/mod_101/complete',
      headers: { authorization: 'Bearer valid-student-token' },
      payload: { quizScore: 90 },
    });
    assert.strictEqual(res2.statusCode, 503);

    // 3. Submit KYC
    const res3 = await app.inject({
      method: 'POST',
      url: '/api/v1/contributor/kyc',
      headers: { authorization: 'Bearer valid-contributor-token' },
      payload: { fullLegalName: 'Alice', phoneNumber: '+919876543210' },
    });
    assert.strictEqual(res3.statusCode, 503);

    // 4. Shorts Comment
    const res4 = await app.inject({
      method: 'POST',
      url: '/api/v1/shorts/short_1/comments',
      headers: { authorization: 'Bearer valid-commenter-token' },
      payload: { content: 'Nice video' },
    });
    assert.strictEqual(res4.statusCode, 503);

    // 5. Notifications Read
    const res5 = await app.inject({
      method: 'PATCH',
      url: '/api/v1/notifications/read',
      headers: { authorization: 'Bearer valid-owner-token' },
      payload: { all: true },
    });
    assert.strictEqual(res5.statusCode, 503);

    // 6. DM Read
    const res6 = await app.inject({
      method: 'POST',
      url: '/api/v1/dm/messages/read',
      headers: { authorization: 'Bearer valid-participant-token' },
      payload: { conversationId: 'conv_123' },
    });
    assert.strictEqual(res6.statusCode, 503);

    // 7. LMX Credibility
    const res7 = await app.inject({
      method: 'POST',
      url: '/api/v1/lmx/credibility',
      payload: { reporter_id: 'rep_1', score: 95 },
    });
    assert.strictEqual(res7.statusCode, 503);

    // 8. Moderation Report
    const res8 = await app.inject({
      method: 'POST',
      url: '/api/v1/moderation/report',
      payload: { contentId: 'post_1', contentType: 'post', reason: 'spam' },
    });
    assert.strictEqual(res8.statusCode, 503);
  });

  // ─── SUITE 4: DATABASE ERROR PROPAGATION (500 DATABASE_ERROR) ────────────────

  it('16. Propagates database query errors as 500 DATABASE_ERROR instead of disguised success', async () => {
    const originalFrom = supabase.from;
    supabase.from = (table) => {
      if (table === 'user_follows') {
        return {
          upsert: () => Promise.resolve({ data: null, error: { message: 'Database connection dropped' } }),
        };
      }
      return originalFrom.call(supabase, table);
    };

    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/users/user_target_123/follow',
        headers: { authorization: 'Bearer valid-alice-token' },
        payload: { followerId: 'user-real-alice' },
      });
      assert.strictEqual(res.statusCode, 500, 'Database error must propagate as HTTP 500');
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.code, 'DATABASE_ERROR');
      assert.strictEqual(body.error, 'Internal Server Error');
    } finally {
      supabase.from = originalFrom;
    }
  });

  // ─── SUITE 5: AUTHORIZED PERSISTENCE & DATA MEDIATION (200/201 SUCCESS) ──────

  it('17. POST /api/v1/users/:id/follow - Succeeds with verified authenticated identity and persistence', async () => {
    const originalFrom = supabase.from;
    let upsertedRow = null;
    supabase.from = (table) => {
      if (table === 'user_follows') {
        return {
          upsert: (row) => {
            upsertedRow = row;
            return Promise.resolve({ data: row, error: null });
          },
        };
      }
      return originalFrom.call(supabase, table);
    };

    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/users/user_target_123/follow',
        headers: { authorization: 'Bearer valid-alice-token' },
        payload: { followerId: 'user-real-alice' },
      });
      assert.strictEqual(res.statusCode, 201);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.followerId, 'user-real-alice');
      assert.strictEqual(body.targetUserId, 'user_target_123');
      assert.strictEqual(body.followed, true);
      assert.strictEqual(upsertedRow.follower_id, 'user-real-alice');
      assert.strictEqual(upsertedRow.followed_id, 'user_target_123');
    } finally {
      supabase.from = originalFrom;
    }
  });

  it('18. DELETE /api/v1/users/:id/follow - Succeeds with verified authenticated identity and persistence', async () => {
    const originalFrom = supabase.from;
    let deletedWhere = {};
    supabase.from = (table) => {
      if (table === 'user_follows') {
        return {
          delete: () => ({
            eq: (col1, val1) => ({
              eq: (col2, val2) => {
                deletedWhere[col1] = val1;
                deletedWhere[col2] = val2;
                return Promise.resolve({ error: null });
              },
            }),
          }),
        };
      }
      return originalFrom.call(supabase, table);
    };

    try {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/users/user_target_123/follow',
        headers: { authorization: 'Bearer valid-alice-token' },
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.unfollowed, true);
      assert.strictEqual(deletedWhere.follower_id, 'user-real-alice');
      assert.strictEqual(deletedWhere.followed_id, 'user_target_123');
    } finally {
      supabase.from = originalFrom;
    }
  });

  it('19. POST /api/v1/aspirant/modules/:id/complete - Succeeds with verified identity and persistence', async () => {
    const originalFrom = supabase.from;
    let updatedFields = null;
    let whereFields = {};
    supabase.from = (table) => {
      if (table === 'module_progress') {
        return {
          update: (fields) => {
            updatedFields = fields;
            return {
              eq: (col1, val1) => ({
                eq: (col2, val2) => {
                  whereFields[col1] = val1;
                  whereFields[col2] = val2;
                  return Promise.resolve({ error: null });
                },
              }),
            };
          },
        };
      }
      return originalFrom.call(supabase, table);
    };

    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/aspirant/modules/mod_101/complete',
        headers: { authorization: 'Bearer valid-student-token' },
        payload: { quizScore: 95 },
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.userId, 'user-student-1');
      assert.strictEqual(body.moduleId, 'mod_101');
      assert.strictEqual(updatedFields.completed, true);
      assert.strictEqual(updatedFields.quiz_score, 95);
      assert.strictEqual(whereFields.user_id, 'user-student-1');
      assert.strictEqual(whereFields.module_id, 'mod_101');
    } finally {
      supabase.from = originalFrom;
    }
  });

  it('20. POST /api/v1/contributor/kyc - Succeeds with verified identity and persistence', async () => {
    const originalFrom = supabase.from;
    let insertedRow = null;
    supabase.from = (table) => {
      if (table === 'contributor_kyc') {
        return {
          insert: (row) => {
            insertedRow = row;
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'kyc_generated_123', ...row }, error: null }),
              }),
            };
          },
        };
      }
      return originalFrom.call(supabase, table);
    };

    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/contributor/kyc',
        headers: { authorization: 'Bearer valid-contributor-token' },
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
      assert.strictEqual(insertedRow.user_id, 'user-citizen-alice');
      assert.strictEqual(insertedRow.full_legal_name, 'Alice Sharma');
      assert.strictEqual(insertedRow.phone_number, '+919876543210');
    } finally {
      supabase.from = originalFrom;
    }
  });

  it('21. POST /api/v1/dm/messages/read - Succeeds with verified identity and updates read_at', async () => {
    const originalFrom = supabase.from;
    let updateFields = null;
    supabase.from = (table) => {
      if (table === 'messages') {
        return {
          update: (fields) => {
            updateFields = fields;
            return {
              eq: () => ({
                neq: () => ({
                  is: () => Promise.resolve({ error: null }),
                }),
              }),
            };
          },
        };
      }
      return originalFrom.call(supabase, table);
    };

    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/messages/read',
        headers: { authorization: 'Bearer valid-participant-token' },
        payload: { conversationId: 'conv_123' },
      });
      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.conversationId, 'conv_123');
      assert.strictEqual(body.userId, 'user-participant-1');
      assert(updateFields.read_at !== undefined);
    } finally {
      supabase.from = originalFrom;
    }
  });
});
