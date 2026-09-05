import { buildApp } from '../server';
import type { FastifyInstance } from 'fastify';

describe('FIX-3: Server-side Live Gating Authentication & Role Checks', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests even if body claims admin and verified', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/lmx/live',
      payload: {
        title: 'Unauthorized Live Stream',
        role: 'admin',
        creator_role: 'admin',
        verification_status: 'verified',
      },
    });

    expect(res.statusCode).toBe(401);
    const data = JSON.parse(res.payload);
    expect(data.code).toBe('UNAUTHORIZED');
  });

  it('rejects spoofed body roles if database profile does not exist or has citizen role', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/lmx/live',
      headers: {
        'x-user-id': '00000000-0000-0000-0000-000000000999',
      },
      payload: {
        title: 'Spoofed Stream',
        role: 'admin',
        creator_role: 'admin',
        verification_status: 'verified',
      },
    });

    // Must return 403 because real DB profile is not verified admin
    expect(res.statusCode).toBe(403);
    const data = JSON.parse(res.payload);
    expect(['PROFILE_NOT_FOUND', 'INELIGIBLE_ROLE', 'UNVERIFIED']).toContain(data.code);
  });
});
