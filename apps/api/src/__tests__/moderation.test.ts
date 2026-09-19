import { buildApp } from '../server';

/**
 * Trust & Safety route tests — exercises role-based authorization,
 * content flagging and the public config endpoints.
 */
describe('Moderation Routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/moderation/action', () => {
    const body = { moderatorId: 'm1', actionType: 'warn', reason: 'spam' };

    it('rejects non-moderators (403)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: {
          'x-user-id': 'm1',
          'x-test-role': 'citizen',
        },
        payload: body,
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows an admin to warn (200)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: {
          'x-user-id': 'm1',
          'x-test-role': 'admin',
        },
        payload: body,
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).success).toBe(true);
    });

    it('forbids a moderator from banning (403)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: {
          'x-user-id': 'm1',
          'x-test-role': 'moderator',
        },
        payload: { moderatorId: 'm1', actionType: 'ban', reason: 'x' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /api/v1/moderation/check-content', () => {
    it('flags violent content', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/check-content',
        payload: { content: 'I will attack you' },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).data.flagged).toBe(true);
    });

    it('passes clean content', async () => {
      const { setMockModerationProvider } = await import('../services/contentModeration');
      setMockModerationProvider(async () => ({
        flagged: false,
        reasons: [],
        provider: 'openai',
      }));
      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/moderation/check-content',
          payload: { content: 'The election results were announced today.' },
        });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.payload).data.flagged).toBe(false);
      } finally {
        setMockModerationProvider(null);
      }
    });
  });

  describe('DEF-004: Moderation Fail-Closed & Unavailable Semantics (W009-B3)', () => {
    it('TEST-W009-B3-01: Compliant content returns 200 with flagged: false when provider is available', async () => {
      const { setMockModerationProvider } = await import('../services/contentModeration');
      setMockModerationProvider(async () => ({
        flagged: false,
        reasons: [],
        provider: 'openai',
      }));

      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/moderation/check-content',
          payload: { content: 'This is completely benign, policy-compliant community news.' },
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.success).toBe(true);
        expect(body.data.flagged).toBe(false);
        expect(body.data.reasons).toEqual([]);
        expect(body.data.provider).toBe('openai');
      } finally {
        setMockModerationProvider(null);
      }
    });

    it('TEST-W009-B3-08: Required moderation provider absent/unconfigured returns HTTP 503 MODERATION_UNAVAILABLE', async () => {
      // Ensure no mock provider and no external provider API key configured
      const { setMockModerationProvider, moderateContent } = await import('../services/contentModeration');
      setMockModerationProvider(null);
      const originalApiKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/moderation/check-content',
          payload: { content: 'Benign content submitted when no external moderation provider is configured.' },
        });

        // 1. Moderation does NOT return flagged: false (silent compliance prevented)
        // 2. Moderation does NOT return HTTP 200
        expect(res.statusCode).toBe(503);
        const body = JSON.parse(res.payload);
        expect(body.data).toBeUndefined();

        // 3. MODERATION_UNAVAILABLE is produced
        expect(body.code).toBe('MODERATION_UNAVAILABLE');

        // 4. HTTP status is 503
        expect(body.statusCode).toBe(503);
        expect(body.error).toBe('Service Unavailable');

        // 5. The content is NOT treated as a content violation merely because provider is unavailable
        expect(body.message).toContain('Content moderation provider is not configured or unavailable');

        // 6. Publication is not permitted when required moderation cannot be performed
        let publicationAllowed = false;
        try {
          const modResult = await moderateContent('Benign user post content');
          if (!modResult.flagged) {
            publicationAllowed = true;
          }
        } catch (err: any) {
          publicationAllowed = false;
        }
        expect(publicationAllowed).toBe(false);
      } finally {
        if (originalApiKey !== undefined) {
          process.env.OPENAI_API_KEY = originalApiKey;
        }
        setMockModerationProvider(null);
      }
    });

    it('TEST-W009-B3-02: Prohibited / policy-violating content returns 200 with flagged: true', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/check-content',
        payload: { content: 'I will murder you tonight' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.flagged).toBe(true);
      expect(body.data.reasons.length).toBeGreaterThan(0);
    });

    it('TEST-W009-B3-03: Provider failure / network outage returns HTTP 503 MODERATION_UNAVAILABLE', async () => {
      // Simulate provider failure via test mock hook
      const { setMockModerationProvider } = await import('../services/contentModeration');
      setMockModerationProvider(async () => {
        throw new Error('EAI_AGAIN: DNS resolution failed for api.openai.com');
      });

      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/moderation/check-content',
          payload: { content: 'Benign query during external provider network partition' },
        });

        expect(res.statusCode).toBe(503);
        const body = JSON.parse(res.payload);
        expect(body.statusCode).toBe(503);
        expect(body.error).toBe('Service Unavailable');
        expect(body.code).toBe('MODERATION_UNAVAILABLE');
        expect(body.message).toContain('Content moderation service is temporarily unavailable');
        expect(body.requestId).toBeDefined();
        expect(body.timestamp).toBeDefined();
      } finally {
        setMockModerationProvider(null);
      }
    });

    it('TEST-W009-B3-04: Provider timeout returns HTTP 503 MODERATION_UNAVAILABLE', async () => {
      const { setMockModerationProvider, ModerationUnavailableError } = await import('../services/contentModeration');
      setMockModerationProvider(async () => {
        throw new ModerationUnavailableError('Content moderation request timed out after 5000ms');
      });

      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/moderation/check-content',
          payload: { content: 'Benign query during upstream timeout' },
        });

        expect(res.statusCode).toBe(503);
        const body = JSON.parse(res.payload);
        expect(body.statusCode).toBe(503);
        expect(body.code).toBe('MODERATION_UNAVAILABLE');
      } finally {
        setMockModerationProvider(null);
      }
    });

    it('TEST-W009-B3-05: Network/provider failure != content violation (no false accusation)', async () => {
      const { setMockModerationProvider } = await import('../services/contentModeration');
      setMockModerationProvider(async () => {
        throw new Error('Upstream provider 500 Internal Error');
      });

      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/moderation/check-content',
          payload: { content: 'Valid user submission' },
        });

        // Must NOT return 200 with flagged: true (which would falsely accuse the user)
        // Must NOT return 400 or 403 policy violation
        expect(res.statusCode).toBe(503);
        const body = JSON.parse(res.payload);
        expect(body.data).toBeUndefined();
        expect(body.code).toBe('MODERATION_UNAVAILABLE');
      } finally {
        setMockModerationProvider(null);
      }
    });

    it('TEST-W009-B3-06: Local rule violations are caught immediately before external provider call', async () => {
      const { setMockModerationProvider } = await import('../services/contentModeration');
      let providerCalled = false;
      setMockModerationProvider(async () => {
        providerCalled = true;
        return { flagged: false, reasons: [], provider: 'openai' };
      });

      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/moderation/check-content',
          payload: { content: 'You should assault that person' },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.data.flagged).toBe(true);
        expect(body.data.provider).toBe('rule_engine');
        expect(providerCalled).toBe(false);
      } finally {
        setMockModerationProvider(null);
      }
    });

    it('TEST-W009-B3-07: Publication safety - fail closed when moderation unavailable', async () => {
      // Simulates an application flow that checks content before publishing
      const { moderateContent, setMockModerationProvider } = await import('../services/contentModeration');
      setMockModerationProvider(async () => {
        throw new Error('Connection refused to moderation service');
      });

      try {
        let publicationAllowed = false;
        try {
          const modResult = await moderateContent('New post submission text');
          if (!modResult.flagged) {
            publicationAllowed = true;
          }
        } catch (err: any) {
          // Fail closed: if moderation fails, publication cannot proceed
          publicationAllowed = false;
        }

        expect(publicationAllowed).toBe(false);
      } finally {
        setMockModerationProvider(null);
      }
    });
  });

  describe('authorization guards', () => {
    it('queue requires moderator', async () => {
      expect((await app.inject({ method: 'GET', url: '/api/v1/moderation/queue' })).statusCode).toBe(401);
      const forbidden = await app.inject({
        method: 'GET',
        url: '/api/v1/moderation/queue',
        headers: {
          'x-user-id': 'citizen-1',
          'x-test-role': 'citizen',
        },
      });
      expect(forbidden.statusCode).toBe(403);

      const ok = await app.inject({
        method: 'GET',
        url: '/api/v1/moderation/queue',
        headers: {
          'x-user-id': 'mod-1',
          'x-test-role': 'moderator',
        },
      });
      expect(ok.statusCode).toBe(200);
    });

    it('audit-log requires admin', async () => {
      expect(
        (await app.inject({
          method: 'GET',
          url: '/api/v1/moderation/audit-log',
          headers: {
            'x-user-id': 'mod-1',
            'x-test-role': 'moderator',
          },
        })).statusCode,
      ).toBe(403);
      expect(
        (await app.inject({
          method: 'GET',
          url: '/api/v1/moderation/audit-log',
          headers: {
            'x-user-id': 'admin-1',
            'x-test-role': 'admin',
          },
        })).statusCode,
      ).toBe(200);
    });

    it('verify-request and block require authentication', async () => {
      expect((await app.inject({ method: 'POST', url: '/api/v1/moderation/verify-request', payload: { verificationType: 'identity' } })).statusCode).toBe(401);
      expect((await app.inject({ method: 'POST', url: '/api/v1/moderation/block', payload: { blockedUserId: 'u2' } })).statusCode).toBe(401);
    });

    it('blocks another user but not oneself', async () => {
      const self = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/block',
        headers: { 'x-user-id': 'u1' },
        payload: { blockedUserId: 'u1' },
      });
      expect(self.statusCode).toBe(400);

      const other = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/block',
        headers: { 'x-user-id': 'u1' },
        payload: { blockedUserId: 'u2' },
      });
      expect(other.statusCode).toBe(200);
    });

    it('unblock requires authentication', async () => {
      expect((await app.inject({ method: 'DELETE', url: '/api/v1/moderation/block/u2' })).statusCode).toBe(401);
      const ok = await app.inject({
        method: 'DELETE',
        url: '/api/v1/moderation/block/u2',
        headers: { 'x-user-id': 'u1' },
      });
      expect(ok.statusCode).toBe(200);
    });

    it('verify-request succeeds when authenticated', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/verify-request',
        headers: { 'x-user-id': 'u1' },
        payload: { verificationType: 'journalist' },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('public config endpoints', () => {
    it('lists actions and reputation rules', async () => {
      expect((await app.inject({ method: 'GET', url: '/api/v1/moderation/actions' })).statusCode).toBe(200);
      expect((await app.inject({ method: 'GET', url: '/api/v1/moderation/reputation-rules' })).statusCode).toBe(200);
    });
  });
});
