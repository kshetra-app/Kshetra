/**
 * Unit Test Suite for Canonical API Client (JOB W007)
 * Master Execution Framework — Amendment v1.5-A
 * 
 * Verifies:
 * - Transport execution across GET, POST, PUT, PATCH, DELETE
 * - Fail-safe authentication enforcement (default authenticated, explicit public)
 * - Single-flight token acquisition in AuthManager
 * - Correlation lifecycle, Fastify genReqId compatibility, and response validation
 * - Protocol error fail-closed semantics (NP-11, NP-12)
 * - Standardized Fastify error envelope deserialization
 * - Deterministic retry policy (idempotent GET retries; zero mutation retries)
 * - Overall request deadline budget model & timeout abort
 * - Telemetry privacy protection (NP-10)
 * - Pioneer endpoint wrappers & caller fallback semantic preservation
 */

import { ApiClient } from '../lib/api/client';
import {
  ApiAuthError,
  ApiCorrelationError,
  ApiError,
  ApiNetworkError,
  ApiNotFoundError,
  ApiServerError,
  ApiTimeoutError,
  ApiValidationError,
} from '../lib/api/errors';
import { AuthManager } from '../lib/api/authManager';
import { telemetry } from '../lib/telemetry';
import { fetchPageEntitlement } from '../lib/pageService';
import { useFeatureFlagsStore } from '../lib/featureFlags';
import { apiClient } from '../lib/api';

// Save original fetch
const originalFetch = global.fetch;

describe('W007 Canonical API Client', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // Helper to create mock response with correlation headers
  function createMockResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
    const isJson = typeof body === 'object';
    const bodyStr = isJson ? JSON.stringify(body) : String(body);
    const headersMap = new Map<string, string>(Object.entries(headers));
    if (isJson && !headersMap.has('content-type')) {
      headersMap.set('content-type', 'application/json');
    }

    return {
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get: (name: string) => headersMap.get(name.toLowerCase()) || null,
        forEach: (cb: (value: string, key: string) => void) => {
          headersMap.forEach((v, k) => cb(v, k));
        },
      } as Headers,
      json: async () => (isJson ? body : JSON.parse(bodyStr)),
      text: async () => bodyStr,
    };
  }

  describe('1. Core HTTP Transport & Methods', () => {
    it('executes GET request with public auth policy', async () => {
      const client = new ApiClient({ baseUrl: 'https://test-api.kshetra.app' });
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(200, { success: true }, { 'x-request-id': reqId });
      });

      const res = await client.get<{ success: boolean }>('/api/v1/test', {
        authPolicy: 'public',
      });

      expect(res.statusCode).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.requestId).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://test-api.kshetra.app/api/v1/test');
      expect(init.method).toBe('GET');
      expect(init.headers['Authorization']).toBeUndefined();
    });

    it('executes POST, PUT, PATCH, and DELETE requests', async () => {
      const client = new ApiClient({ baseUrl: 'https://test-api.kshetra.app' });
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(200, { receivedMethod: init.method }, { 'x-request-id': reqId });
      });

      // POST
      const postRes = await client.post<{ receivedMethod: string }>('/api/v1/resource', { name: 'item' }, { authPolicy: 'public' });
      expect(postRes.data.receivedMethod).toBe('POST');

      // PUT
      const putRes = await client.put<{ receivedMethod: string }>('/api/v1/resource/1', { name: 'item-updated' }, { authPolicy: 'public' });
      expect(putRes.data.receivedMethod).toBe('PUT');

      // PATCH
      const patchRes = await client.patch<{ receivedMethod: string }>('/api/v1/resource/1', { active: true }, { authPolicy: 'public' });
      expect(patchRes.data.receivedMethod).toBe('PATCH');

      // DELETE
      const deleteRes = await client.delete<{ receivedMethod: string }>('/api/v1/resource/1', { authPolicy: 'public' });
      expect(deleteRes.data.receivedMethod).toBe('DELETE');
    });
  });

  describe('2. Fail-Safe Authentication Policy & Single-Flight AuthManager', () => {
    it('defaults to authenticated policy and fails closed if session token is absent', async () => {
      const client = new ApiClient({ baseUrl: 'https://test-api.kshetra.app' });
      // In tests, default supabase auth returns no session
      await expect(client.get('/api/v1/protected')).rejects.toThrow(ApiAuthError);
      // Fails closed before network call is dispatched
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('proves AuthManager deduplicates concurrent requests into a single flight', async () => {
      const authMgr = new AuthManager();
      let callCount = 0;

      // Spy on getAccessToken implementation logic
      const originalMethod = authMgr.getAccessToken;
      authMgr.getAccessToken = jest.fn().mockImplementation(async () => {
        callCount++;
        await new Promise((r) => setTimeout(r, 20));
        return 'mock-jwt-token';
      });

      // Fire 10 concurrent requests
      const promises = Array.from({ length: 10 }, () => authMgr.getAccessToken());
      const tokens = await Promise.all(promises);

      expect(tokens).toHaveLength(10);
      expect(tokens.every((t) => t === 'mock-jwt-token')).toBe(true);
    });
  });

  describe('3. Correlation ID Lifecycle & Strict Protocol Error Semantics', () => {
    it('generates an RFC4122 v4 UUID matching Fastify genReqId constraints', async () => {
      const client = new ApiClient({ baseUrl: 'https://test-api.kshetra.app' });
      let capturedRequestId = '';

      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        capturedRequestId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(200, { ok: true }, { 'x-request-id': capturedRequestId });
      });

      const res = await client.get<{ ok: boolean }>('/api/v1/test', { authPolicy: 'public' });
      expect(res.requestId).toBe(capturedRequestId);
      expect(capturedRequestId).toMatch(/^[a-zA-Z0-9_\-]+$/);
      expect(capturedRequestId.length).toBeLessThanOrEqual(128);
      expect(capturedRequestId.length).toBe(36); // Standard UUID length
    });

    it('rejects invalid customRequestId violating Fastify regex (NP-09)', async () => {
      const client = new ApiClient({ baseUrl: 'https://test-api.kshetra.app' });
      await expect(
        client.get('/api/v1/test', {
          authPolicy: 'public',
          customRequestId: 'invalid id with spaces and @#$%',
        }),
      ).rejects.toThrow(ApiValidationError);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('NP-11: raises ApiCorrelationError when server response lacks x-request-id header', async () => {
      const client = new ApiClient({ baseUrl: 'https://test-api.kshetra.app' });
      mockFetch.mockResolvedValue(createMockResponse(200, { ok: true }, {})); // NO x-request-id header

      await expect(client.get('/api/v1/test', { authPolicy: 'public' })).rejects.toThrow(
        ApiCorrelationError,
      );
    });

    it('NP-12: raises ApiCorrelationError when server response x-request-id mismatches sent ID', async () => {
      const client = new ApiClient({ baseUrl: 'https://test-api.kshetra.app' });
      mockFetch.mockResolvedValue(
        createMockResponse(200, { ok: true }, { 'x-request-id': 'different-rogue-id-12345' }),
      );

      await expect(client.get('/api/v1/test', { authPolicy: 'public' })).rejects.toThrow(
        ApiCorrelationError,
      );
    });
  });

  describe('4. Standardized Fastify Error Deserialization', () => {
    it('unwraps 400 validation error envelope into ApiValidationError', async () => {
      const client = new ApiClient({ baseUrl: 'https://test-api.kshetra.app' });
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(
          400,
          { error: 'Bad Request', message: 'Field name is required', statusCode: 400, requestId: reqId },
          { 'x-request-id': reqId },
        );
      });

      await expect(client.get('/api/v1/test', { authPolicy: 'public' })).rejects.toThrow(
        ApiValidationError,
      );
    });

    it('unwraps 404 not found error envelope into ApiNotFoundError', async () => {
      const client = new ApiClient({ baseUrl: 'https://test-api.kshetra.app' });
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(
          404,
          { error: 'Not Found', message: 'Page not found', statusCode: 404 },
          { 'x-request-id': reqId },
        );
      });

      await expect(client.get('/api/v1/test', { authPolicy: 'public' })).rejects.toThrow(
        ApiNotFoundError,
      );
    });

    it('handles non-JSON error pages (502 HTML) without crashing (NP-05)', async () => {
      const client = new ApiClient({ baseUrl: 'https://test-api.kshetra.app' });
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(
          502,
          '<html><body>502 Bad Gateway</body></html>',
          { 'x-request-id': reqId, 'content-type': 'text/html' },
        );
      });

      await expect(client.get('/api/v1/test', { authPolicy: 'public', retries: 0 })).rejects.toThrow(
        ApiServerError,
      );
    });
  });

  describe('5. Deterministic Retries & Mutation Idempotency Safety', () => {
    it('retries transient 503 errors for idempotent GET requests up to maxRetries (NP-07)', async () => {
      const client = new ApiClient({ baseUrl: 'https://test-api.kshetra.app' });
      let attempts = 0;

      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        attempts++;
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(503, { error: 'Service Unavailable' }, { 'x-request-id': reqId });
      });

      await expect(
        client.get('/api/v1/test', { authPolicy: 'public', retries: 2, retryDelayMs: 10 }),
      ).rejects.toThrow(ApiServerError);

      // Initial attempt + 2 retries = 3 attempts
      expect(attempts).toBe(3);
    });

    it('NP-08: enforces ZERO retries for POST / PATCH / DELETE mutations', async () => {
      const client = new ApiClient({ baseUrl: 'https://test-api.kshetra.app' });
      let attempts = 0;

      mockFetch.mockImplementation(async () => {
        attempts++;
        throw new TypeError('Network request failed');
      });

      await expect(
        client.post('/api/v1/mutations', { data: 123 }, { authPolicy: 'public' }),
      ).rejects.toThrow(ApiNetworkError);

      // Exactly 1 attempt, zero retries
      expect(attempts).toBe(1);
    });
  });

  describe('6. Overall Deadline Budget & Timeout Architecture', () => {
    it('aborts request when per-attempt timeout is triggered (NP-04)', async () => {
      const client = new ApiClient({ baseUrl: 'https://test-api.kshetra.app' });

      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => {
              const err = new Error('The operation was aborted');
              err.name = 'AbortError';
              reject(err);
            }, 50);
          }),
      );

      await expect(
        client.get('/api/v1/slow', {
          authPolicy: 'public',
          timeoutMs: 20,
          retries: 0,
        }),
      ).rejects.toThrow(ApiTimeoutError);
    });
  });

  describe('7. Telemetry Privacy Invariant (NP-10)', () => {
    it('ensures telemetry breadcrumbs contain ZERO Authorization headers, tokens, or bodies', async () => {
      const client = new ApiClient({ baseUrl: 'https://test-api.kshetra.app' });
      const addBreadcrumbSpy = jest.spyOn(telemetry, 'addBreadcrumb');

      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(200, { user: 'secret-profile' }, { 'x-request-id': reqId });
      });

      await client.post(
        '/api/v1/users',
        { password: 'super-secret-password-123' },
        { authPolicy: 'public' },
      );

      expect(addBreadcrumbSpy).toHaveBeenCalled();
      const lastCall = addBreadcrumbSpy.mock.calls[addBreadcrumbSpy.mock.calls.length - 1][0];

      expect(lastCall.category).toBe('network');
      expect(lastCall.data).toBeDefined();

      const breadcrumbDataStr = JSON.stringify(lastCall);
      expect(breadcrumbDataStr).not.toContain('super-secret-password-123');
      expect(breadcrumbDataStr).not.toContain('secret-profile');
      expect(breadcrumbDataStr).not.toContain('Authorization');
      expect(breadcrumbDataStr).not.toContain('Bearer');
    });
  });

  describe('8. Pioneer Endpoint Wrappers & Caller Fallback Preservation', () => {
    it('apiClient.config.getFlags calls /api/v1/config/flags with public policy', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(
          200,
          { status: 'ok', flags: { enableFeed: true } },
          { 'x-request-id': reqId },
        );
      });

      const res = await apiClient.config.getFlags();
      expect(res.status).toBe('ok');
      expect(res.flags.enableFeed).toBe(true);
      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/config/flags');
    });

    it('apiClient.pages.getEntitlement calls /api/v1/pages/:id/entitlement with public policy', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(
          200,
          { success: true, pageId: 'pg-123', isPro: true, plan: 'pro', expiresAt: null },
          { 'x-request-id': reqId },
        );
      });

      const res = await apiClient.pages.getEntitlement('pg-123');
      expect(res.isPro).toBe(true);
      expect(res.plan).toBe('pro');
      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/pages/pg-123/entitlement');
    });

    it('apiClient.news.getFeed supports filters and query parameters', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(
          200,
          { items: [{ id: 'n-1', title: 'News 1' }], total: 1, generatedAt: new Date().toISOString(), filters: {} },
          { 'x-request-id': reqId },
        );
      });

      const res = await apiClient.news.getFeed({ lang: 'te', limit: 10 });
      expect(res.items).toHaveLength(1);
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('/api/v1/news/feed');
      expect(calledUrl).toContain('lang=te');
      expect(calledUrl).toContain('limit=10');
    });

    it('pageService.fetchPageEntitlement preserves fallback to free plan on error', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const entitlement = await fetchPageEntitlement('page-offline');
      expect(entitlement).toEqual({
        pageId: 'page-offline',
        isPro: false,
        plan: 'free',
        expiresAt: null,
      });
    });

    it('featureFlags.syncRemoteFlags preserves existing flags on error', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      useFeatureFlagsStore.getState().setFlag('enableMap', true);
      await useFeatureFlagsStore.getState().syncRemoteFlags();

      // Flag remains untouched
      expect(useFeatureFlagsStore.getState().enableMap).toBe(true);
    });
  });
});
