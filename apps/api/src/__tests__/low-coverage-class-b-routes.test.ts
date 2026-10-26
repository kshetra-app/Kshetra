import Fastify, { type FastifyInstance } from 'fastify';
import { analyticsRoutes } from '../routes/analytics';
import { aspirantRoutes } from '../routes/aspirant';
import { contributorRoutes } from '../routes/contributor';
import { setSupabaseConfiguredForTesting, supabase } from '../lib/supabase';

describe('Low-coverage Class B routes: analytics, aspirant and contributor', () => {
  let app: FastifyInstance;
  const originalHarness = process.env.TEST_HARNESS_ACTIVE;
  const originalNodeEnv = process.env.NODE_ENV;
  let fromSpy: jest.SpyInstance;

  beforeAll(async () => {
    process.env.TEST_HARNESS_ACTIVE = 'true';
    process.env.NODE_ENV = 'test';
    app = Fastify();
    await app.register(analyticsRoutes);
    await app.register(aspirantRoutes);
    await app.register(contributorRoutes);
    await app.ready();
  });

  afterAll(async () => {
    if (originalHarness === undefined) delete process.env.TEST_HARNESS_ACTIVE;
    else process.env.TEST_HARNESS_ACTIVE = originalHarness;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    setSupabaseConfiguredForTesting(true);
    await app.close();
  });

  const successfulDb = () => {
    fromSpy = jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      let eqCount = 0;
      const updateBuilder: any = {
        eq: jest.fn(() => {
          eqCount += 1;
          if (table === 'module_progress' && eqCount === 1) return updateBuilder;
          return Promise.resolve({ data: null, error: null });
        }),
      };
      const insert = jest.fn((payload: unknown) => {
        if (table === 'contributor_kyc') {
          return {
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: 'kyc-123' }, error: null }),
          };
        }
        return Promise.resolve({ data: null, error: null });
      });
      return {
        insert,
        update: jest.fn(() => updateBuilder),
        upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as any;
    }) as any);
    jest.spyOn(supabase, 'rpc').mockResolvedValue({ data: null, error: null } as any);
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(true);
    successfulDb();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('covers analytics session start, end, heartbeat and authenticated identity matching', async () => {
    const started = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/sessions',
      payload: { action: 'start', sessionId: 's-1', deviceOs: 'Android', networkType: 'wifi' },
    });
    expect(started.statusCode).toBe(201);
    expect(JSON.parse(started.payload)).toMatchObject({ success: true, sessionId: 's-1', userId: 'anonymous', action: 'start' });

    const ended = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/sessions',
      headers: { 'x-user-id': 'user-1' },
      payload: { userId: 'user-1', sessionId: 's-1', action: 'end', durationSeconds: 30 },
    });
    expect(ended.statusCode).toBe(200);
    expect(JSON.parse(ended.payload)).toMatchObject({ sessionId: 's-1', userId: 'user-1', action: 'end' });

    const heartbeat = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/sessions',
      payload: { action: 'heartbeat', sessionId: 's-1' },
    });
    expect(heartbeat.statusCode).toBe(200);
    expect(JSON.parse(heartbeat.payload).action).toBe('heartbeat');

    const spoofed = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/sessions',
      headers: { 'x-user-id': 'user-1' },
      payload: { userId: 'user-2', action: 'start' },
    });
    expect(spoofed.statusCode).toBe(403);
  });

  it('covers analytics database error and unconfigured service branches', async () => {
    (fromSpy as any).mockImplementationOnce(() => ({
      insert: jest.fn().mockResolvedValue({ error: { message: 'insert failed' } }),
    }));
    const failed = await app.inject({ method: 'POST', url: '/api/v1/analytics/sessions', payload: { action: 'start' } });
    expect(failed.statusCode).toBe(500);

    setSupabaseConfiguredForTesting(false);
    const unavailable = await app.inject({ method: 'POST', url: '/api/v1/analytics/sessions', payload: { action: 'start' } });
    expect(unavailable.statusCode).toBe(503);
  });

  it('covers aspirant module completion, best-effort counter, challenge join and endorsement', async () => {
    jest.spyOn(supabase, 'rpc').mockRejectedValueOnce(new Error('counter unavailable'));
    const completed = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/modules/module-1/complete',
      headers: { 'x-user-id': 'user-1' },
      payload: { userId: 'user-1', quizScore: 95 },
    });
    expect(completed.statusCode).toBe(200);
    expect(JSON.parse(completed.payload)).toMatchObject({ moduleId: 'module-1', userId: 'user-1', quizScore: 95 });

    const joined = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/challenges/challenge-1/join',
      headers: { 'x-user-id': 'user-1' },
      payload: {},
    });
    expect(joined.statusCode).toBe(200);
    expect(JSON.parse(joined.payload)).toMatchObject({ challengeId: 'challenge-1', userId: 'user-1' });

    const endorsed = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/aspirant-1/endorse',
      headers: { 'x-user-id': 'user-1' },
      payload: { endorserId: 'user-1', message: 'I support this candidate' },
    });
    expect(endorsed.statusCode).toBe(201);
    expect(JSON.parse(endorsed.payload)).toMatchObject({ aspirantId: 'aspirant-1', endorserId: 'user-1' });
  });

  it('covers aspirant spoofing, persistence errors and unconfigured service', async () => {
    const spoofed = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/challenges/challenge-1/join',
      headers: { 'x-user-id': 'user-1' },
      payload: { userId: 'user-2' },
    });
    expect(spoofed.statusCode).toBe(403);

    (fromSpy as any).mockImplementationOnce(() => ({
      insert: jest.fn().mockResolvedValue({ error: { message: 'insert failed' } }),
    }));
    const failed = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/challenges/challenge-1/join',
      headers: { 'x-user-id': 'user-1' },
      payload: {},
    });
    expect(failed.statusCode).toBe(500);

    setSupabaseConfiguredForTesting(false);
    const unavailable = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/challenges/challenge-1/join',
      headers: { 'x-user-id': 'user-1' },
      payload: {},
    });
    expect(unavailable.statusCode).toBe(503);
  });

  it('covers contributor KYC success, identity spoofing, and database error', async () => {
    const submitted = await app.inject({
      method: 'POST',
      url: '/api/v1/contributor/kyc',
      headers: { 'x-user-id': 'user-1' },
      payload: { userId: 'user-1', fullLegalName: 'Test Contributor', phoneNumber: '+911234567890' },
    });
    expect(submitted.statusCode).toBe(201);
    expect(JSON.parse(submitted.payload)).toMatchObject({ kycId: 'kyc-123', userId: 'user-1', status: 'submitted' });

    const spoofed = await app.inject({
      method: 'POST',
      url: '/api/v1/contributor/kyc',
      headers: { 'x-user-id': 'user-1' },
      payload: { userId: 'user-2', fullLegalName: 'Test Contributor', phoneNumber: '+911234567890' },
    });
    expect(spoofed.statusCode).toBe(403);

    (fromSpy as any).mockImplementationOnce(() => ({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ error: { message: 'KYC insert failed' }, data: null }),
      }),
    }));
    const failed = await app.inject({
      method: 'POST',
      url: '/api/v1/contributor/kyc',
      headers: { 'x-user-id': 'user-1' },
      payload: { fullLegalName: 'Test Contributor', phoneNumber: '+911234567890' },
    });
    expect(failed.statusCode).toBe(500);
  });

  it('covers fingerprint anonymous and authenticated flows, plus device upsert', async () => {
    const anonymous = await app.inject({
      method: 'POST',
      url: '/api/v1/contributor/fingerprint',
      payload: { actionType: 'view' },
    });
    expect(anonymous.statusCode).toBe(201);
    expect(JSON.parse(anonymous.payload)).toMatchObject({ userId: 'anonymous', actionType: 'view' });

    const authenticated = await app.inject({
      method: 'POST',
      url: '/api/v1/contributor/fingerprint',
      headers: { 'x-user-id': 'user-1' },
      payload: { userId: 'user-1', actionType: 'share', contentId: 'content-1' },
    });
    expect(authenticated.statusCode).toBe(201);
    expect(JSON.parse(authenticated.payload).userId).toBe('user-1');

    const device = await app.inject({
      method: 'POST',
      url: '/api/v1/contributor/devices',
      headers: { 'x-user-id': 'user-1' },
      payload: { deviceUniqueId: 'device-1', deviceBrand: 'TestBrand' },
    });
    expect(device.statusCode).toBe(200);
    expect(JSON.parse(device.payload)).toMatchObject({ userId: 'user-1', deviceUniqueId: 'device-1' });
  });

  it('covers fingerprint/device database errors and missing authentication', async () => {
    (fromSpy as any).mockImplementationOnce(() => ({
      insert: jest.fn().mockResolvedValue({ error: { message: 'fingerprint insert failed' } }),
    }));
    const failedFingerprint = await app.inject({
      method: 'POST',
      url: '/api/v1/contributor/fingerprint',
      payload: { actionType: 'view' },
    });
    expect(failedFingerprint.statusCode).toBe(500);

    (fromSpy as any).mockImplementationOnce(() => ({
      upsert: jest.fn().mockResolvedValue({ error: { message: 'device upsert failed' } }),
    }));
    const failedDevice = await app.inject({
      method: 'POST',
      url: '/api/v1/contributor/devices',
      headers: { 'x-user-id': 'user-1' },
      payload: { deviceUniqueId: 'device-1' },
    });
    expect(failedDevice.statusCode).toBe(500);

    const unauthenticated = await app.inject({
      method: 'POST',
      url: '/api/v1/contributor/devices',
      payload: { deviceUniqueId: 'device-1' },
    });
    expect(unauthenticated.statusCode).toBe(401);
  });
});
