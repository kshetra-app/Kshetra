import Fastify, { type FastifyInstance } from 'fastify';
import * as userAuth from '../lib/userAuth';
import { setSupabaseConfiguredForTesting, supabase } from '../lib/supabase';
import { analyticsRoutes } from '../routes/analytics';
import { aspirantRoutes } from '../routes/aspirant';
import { contributorRoutes } from '../routes/contributor';
import { shortsRoutes } from '../routes/shorts';
import { userRoutes } from '../routes/users';

type DbResult = { data: any; error: any };
type AuthMode = 'ok' | 'deny' | 'mismatch';

const ok = (data: any = null): DbResult => ({ data, error: null });
const dbError = (message = 'database unavailable'): DbResult => ({ data: null, error: { message } });

function chain(result: DbResult): any {
  const q: any = {};
  for (const method of ['select', 'insert', 'upsert', 'update', 'delete', 'eq', 'or', 'order', 'limit']) {
    q[method] = jest.fn(() => q);
  }
  q.single = jest.fn(async () => result);
  q.maybeSingle = jest.fn(async () => result);
  q.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return q;
}

describe('Targeted branch coverage for low-coverage mutation routes', () => {
  let app: FastifyInstance;
  let authMode: AuthMode;
  let dbQueue: DbResult[];
  let rpcResult: DbResult;
  let rpcThrows: boolean;
  const originalNodeEnv = process.env.NODE_ENV;

  const post = (url: string, payload: any = {}, headers: Record<string, string> = {}) =>
    app.inject({ method: 'POST', url, payload, headers });
  const remove = (url: string, payload: any = {}, headers: Record<string, string> = {}) =>
    app.inject({ method: 'DELETE', url, payload, headers });

  const authenticatedRequests = () => [
    { method: 'POST', url: '/api/v1/aspirant/modules/m1/complete', payload: { userId: 'user-1', quizScore: 90 } },
    { method: 'POST', url: '/api/v1/aspirant/challenges/c1/join', payload: { userId: 'user-1' } },
    { method: 'POST', url: '/api/v1/aspirant/a1/endorse', payload: { endorserId: 'user-1', message: 'support' } },
    { method: 'POST', url: '/api/v1/contributor/kyc', payload: { userId: 'user-1', fullLegalName: 'User One', phoneNumber: '9876543210' } },
    { method: 'POST', url: '/api/v1/contributor/fingerprint', payload: { userId: 'user-1', actionType: 'view' } },
    { method: 'POST', url: '/api/v1/contributor/devices', payload: { userId: 'user-1', deviceUniqueId: 'device-1' } },
    { method: 'POST', url: '/api/v1/analytics/sessions', payload: { userId: 'user-1', action: 'start', sessionId: 's1' } },
    { method: 'POST', url: '/api/v1/shorts/s1/comments', payload: { userId: 'user-1', content: 'hello' } },
    { method: 'POST', url: '/api/v1/users/u2/follow', payload: { followerId: 'user-1' } },
    { method: 'DELETE', url: '/api/v1/users/u2/follow', payload: { followerId: 'user-1' } },
  ];

  const databaseRequests = () => [
    { method: 'POST', url: '/api/v1/aspirant/modules/m1/complete', payload: { quizScore: 90 } },
    { method: 'POST', url: '/api/v1/aspirant/challenges/c1/join', payload: {} },
    { method: 'POST', url: '/api/v1/aspirant/a1/endorse', payload: { message: 'support' } },
    { method: 'POST', url: '/api/v1/contributor/kyc', payload: { fullLegalName: 'User One', phoneNumber: '9876543210' } },
    { method: 'POST', url: '/api/v1/contributor/fingerprint', payload: { actionType: 'view' }, headers: { 'x-user-id': 'header-user' } },
    { method: 'POST', url: '/api/v1/contributor/devices', payload: { deviceUniqueId: 'device-1' } },
    { method: 'POST', url: '/api/v1/analytics/sessions', payload: { action: 'start', sessionId: 's1' } },
    { method: 'POST', url: '/api/v1/analytics/sessions', payload: { action: 'end', userId: 'user-1', sessionId: 's1', durationSeconds: 10 } },
    { method: 'POST', url: '/api/v1/shorts/s1/view', payload: {} },
    { method: 'POST', url: '/api/v1/shorts/s1/comments', payload: { content: 'hello' } },
    { method: 'POST', url: '/api/v1/users/u2/follow', payload: { followerId: 'user-1' } },
    { method: 'DELETE', url: '/api/v1/users/u2/follow', payload: { followerId: 'user-1' } },
  ];

  beforeEach(async () => {
    jest.restoreAllMocks();
    process.env.NODE_ENV = 'test';
    setSupabaseConfiguredForTesting(true);
    authMode = 'ok';
    dbQueue = [];
    rpcResult = ok();
    rpcThrows = false;

    jest.spyOn(userAuth, 'resolveAuthenticatedUser').mockImplementation(async (_request: any, reply: any) => {
      if (authMode === 'deny') {
        reply.code(401).send({ error: 'unauthorized' });
        return null;
      }
      return { userId: 'user-1' } as any;
    });
    jest.spyOn(userAuth, 'assertActingUserMatch').mockImplementation((reply: any, _request: any, userId: string, requestedId?: string) => {
      if (authMode === 'mismatch' || (requestedId && requestedId !== userId)) {
        reply.code(403).send({ error: 'forbidden' });
        return false;
      }
      return true;
    });
    jest.spyOn(supabase, 'from').mockImplementation(((_table: string) => chain(dbQueue.shift() ?? ok({ id: 'db-id', view_count: 4 }))) as any);
    jest.spyOn(supabase, 'rpc').mockImplementation((async () => {
      if (rpcThrows) throw new Error('rpc unavailable');
      return rpcResult as any;
    }) as any);

    app = Fastify({ logger: false });
    await analyticsRoutes(app);
    await aspirantRoutes(app);
    await contributorRoutes(app);
    await shortsRoutes(app);
    await userRoutes(app);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(true);
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('executes success paths for every low-coverage route', async () => {
    expect((await post('/api/v1/aspirant/modules/m1/complete', { quizScore: 90 })).statusCode).toBe(200);
    expect((await post('/api/v1/aspirant/challenges/c1/join', {})).statusCode).toBe(200);
    expect((await post('/api/v1/aspirant/a1/endorse', { message: 'support' })).statusCode).toBe(201);

    expect((await post('/api/v1/contributor/kyc', { fullLegalName: 'User One', phoneNumber: '9876543210' })).statusCode).toBe(201);
    const fingerprint = await post('/api/v1/contributor/fingerprint', { actionType: 'view' }, { 'x-user-id': 'header-user' });
    expect(fingerprint.statusCode).toBe(201);
    expect(JSON.parse(fingerprint.payload).userId).toBe('header-user');
    expect((await post('/api/v1/contributor/fingerprint', { actionType: 'view' })).statusCode).toBe(201);
    expect((await post('/api/v1/contributor/devices', { deviceUniqueId: 'device-1' })).statusCode).toBe(200);

    expect((await post('/api/v1/analytics/sessions', { action: 'start', sessionId: 's1' })).statusCode).toBe(201);
    expect((await post('/api/v1/analytics/sessions', { action: 'heartbeat' })).statusCode).toBe(200);
    expect((await post('/api/v1/analytics/sessions', { action: 'end', userId: 'user-1', sessionId: 's1', durationSeconds: 10 })).statusCode).toBe(200);

    expect((await post('/api/v1/shorts/s1/view', {})).statusCode).toBe(200);
    expect((await post('/api/v1/shorts/s1/comments', { content: 'hello' })).statusCode).toBe(201);
    expect((await post('/api/v1/users/u2/follow', { followerId: 'user-1' })).statusCode).toBe(201);
    expect((await remove('/api/v1/users/u2/follow', { followerId: 'user-1' })).statusCode).toBe(200);
  });

  it('covers authentication denial and identity-mismatch branches across guarded routes', async () => {
    authMode = 'deny';
    for (const request of authenticatedRequests()) {
      const response = await app.inject(request as any);
      expect(response.statusCode).toBe(401);
    }

    authMode = 'mismatch';
    for (const request of authenticatedRequests()) {
      const response = await app.inject(request as any);
      expect(response.statusCode).toBe(403);
    }
  });

  it('fails closed with 503 for every route when Supabase is unavailable', async () => {
    setSupabaseConfiguredForTesting(false);
    for (const request of databaseRequests()) {
      const response = await app.inject(request as any);
      expect(response.statusCode).toBe(503);
    }
  });

  it('returns database errors for each route when a query reports failure', async () => {
    for (const request of databaseRequests()) {
      authMode = 'ok';
      setSupabaseConfiguredForTesting(true);
      dbQueue = [dbError()];
      if (request.url.endsWith('/view')) rpcResult = dbError('RPC missing');
      const response = await app.inject(request as any);
      expect(response.statusCode).toBe(500);
      rpcResult = ok();
    }
  });

  it('catches thrown database failures and keeps best-effort RPC failures non-fatal', async () => {
    for (const request of databaseRequests()) {
      authMode = 'ok';
      setSupabaseConfiguredForTesting(true);
      dbQueue = [];
      jest.spyOn(supabase, 'from').mockImplementationOnce((() => { throw new Error('database exception'); }) as any);
      if (request.url.endsWith('/view')) rpcResult = dbError('RPC missing');
      const response = await app.inject(request as any);
      expect(response.statusCode).toBe(500);
      rpcResult = ok();
    }

    rpcThrows = true;
    expect((await post('/api/v1/aspirant/modules/m1/complete', { quizScore: 90 })).statusCode).toBe(200);
    rpcThrows = false;
    rpcResult = dbError('RPC missing');
    dbQueue = [ok({ view_count: 5 }), ok()];
    expect((await post('/api/v1/shorts/s1/view', {})).statusCode).toBe(200);
  });
});
