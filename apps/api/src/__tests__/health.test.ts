import Fastify, { FastifyInstance } from 'fastify';
import { healthRoutes } from '../routes/health';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

describe('Health Route Semantics (Amendment v1.4 Part 18)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(healthRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(true);
  });

  it('GET /api/health should return LIVENESS status ok without claiming DB connectivity', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);
    expect(body.status).toBe('ok');
    expect(body.semanticType).toBe('LIVENESS');
    expect(body.service).toBe('kshetra-api');
    expect(body.version).toBe('0.1.0');
    expect(body.uptimeSeconds).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  it('GET /api/health/db returns 503 degraded when Supabase is not configured', async () => {
    setSupabaseConfiguredForTesting(false);

    const response = await app.inject({
      method: 'GET',
      url: '/api/health/db',
    });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('degraded');
    expect(body.semanticType).toBe('DATABASE CONNECTIVITY');
    expect(body.connected).toBe(false);
    expect(body.error).toContain('not configured');
  });

  it('GET /api/health/db returns 200 when database probe succeeds', async () => {
    jest.spyOn(supabase, 'from').mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({
          data: [{ code: 'TG' }],
          error: null,
        }),
      }),
    } as any);

    const response = await app.inject({
      method: 'GET',
      url: '/api/health/db',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('ok');
    expect(body.semanticType).toBe('DATABASE CONNECTIVITY');
    expect(body.connected).toBe(true);
    expect(body.rowsReturned).toBe(1);
  });

  it('GET /api/health/db returns 503 when database returns query error', async () => {
    jest.spyOn(supabase, 'from').mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'relation states does not exist' },
        }),
      }),
    } as any);

    const response = await app.inject({
      method: 'GET',
      url: '/api/health/db',
    });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('error');
    expect(body.connected).toBe(false);
    expect(body.error).toContain('relation states does not exist');
  });

  it('GET /api/health/db returns 503 when database query throws exception', async () => {
    jest.spyOn(supabase, 'from').mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockRejectedValue(new Error('Connection timeout to PostgreSQL')),
      }),
    } as any);

    const response = await app.inject({
      method: 'GET',
      url: '/api/health/db',
    });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('error');
    expect(body.connected).toBe(false);
    expect(body.error).toContain('Connection timeout');
  });

  it('GET /api/health/db returns 200 when database probe succeeds with null data', async () => {
    jest.spyOn(supabase, 'from').mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    } as any);

    const response = await app.inject({
      method: 'GET',
      url: '/api/health/db',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.rowsReturned).toBe(0);
  });

  it('GET /api/health/db returns 503 when database query throws non-Error object without message', async () => {
    jest.spyOn(supabase, 'from').mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockRejectedValue({}),
      }),
    } as any);

    const response = await app.inject({
      method: 'GET',
      url: '/api/health/db',
    });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.payload);
    expect(body.error).toBe('Database connection failure');
  });

  it('GET /api/health/ready proxies to /api/health/db', async () => {
    jest.spyOn(supabase, 'from').mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({
          data: [{ code: 'TG' }],
          error: null,
        }),
      }),
    } as any);

    const response = await app.inject({
      method: 'GET',
      url: '/api/health/ready',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('ok');
    expect(body.semanticType).toBe('DATABASE CONNECTIVITY');
  });
});
