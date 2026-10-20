import Fastify, { FastifyInstance } from 'fastify';
import { geoRoutes } from '../routes/geo';
import fs from 'node:fs';
import path from 'node:path';

describe('Geo Routes Unit Tests (Direct Route Injection)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(geoRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /geo/manifest.json returns 200 with manifest content', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/geo/manifest.json',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['cache-control']).toContain('max-age=86400');
    const body = JSON.parse(res.payload);
    expect(body['TS']).toBeDefined();
    expect(body['TS'].file).toBe('telangana-assembly.json');
    expect(body['TS'].count).toBe(119);
  });

  it('GET /geo/:file rejects invalid file name pattern with 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/geo/INVALID_FILE!.json',
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /geo/:file returns 404 for non-existent boundary file', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/geo/nonexistent-state.json',
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).code).toBe('NOT_FOUND');
  });

  it('GET /geo/:file returns 200 plain file when client does not accept gzip', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/geo/india-states.json',
      headers: { 'accept-encoding': 'identity' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-encoding']).toBeUndefined();
    expect(res.headers['cache-control']).toContain('max-age=86400');
    expect(res.payload.length).toBeGreaterThan(100);
  });

  it('GET /geo/:file returns 200 with immutable cache when version param is present', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/geo/india-states.json?v=hash123',
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toContain('immutable');
  });

  it('GET /geo/:file returns 200 gzip stream when client accepts gzip and .gz file exists', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/geo/india-states.json',
      headers: { 'accept-encoding': 'gzip, deflate' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-encoding']).toBe('gzip');
    expect(res.headers['vary']).toBe('Accept-Encoding');
  });

  it('GET /geo/:file falls back to plain stream when gzip accepted but .gz file missing', async () => {
    // Create a temporary plain json file without .gz sibling
    const geoDir = path.resolve(__dirname, '../../public/geo');
    const tempFile = path.join(geoDir, 'test-temp-plain.json');
    fs.writeFileSync(tempFile, JSON.stringify({ type: 'FeatureCollection', features: [] }));

    try {
      const res = await app.inject({
        method: 'GET',
        url: '/geo/test-temp-plain.json',
        headers: { 'accept-encoding': 'gzip' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-encoding']).toBeUndefined();
      expect(JSON.parse(res.payload).type).toBe('FeatureCollection');
    } finally {
      try {
        fs.unlinkSync(tempFile);
      } catch {}
    }
  });

  it('GET /geo/manifest.json returns 404 if manifest file is missing', async () => {
    const origExists = fs.existsSync;
    jest.spyOn(fs, 'existsSync').mockImplementation((p: any) => {
      if (typeof p === 'string' && p.endsWith('manifest.json')) {
        return false;
      }
      return origExists(p);
    });

    try {
      const res = await app.inject({
        method: 'GET',
        url: '/geo/manifest.json',
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.payload).code).toBe('NOT_FOUND');
    } finally {
      jest.restoreAllMocks();
    }
  });
});
