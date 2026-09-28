import { buildApp } from '../server';

describe('Canonical Spatial Runtime API (W016-C3-R9)', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (url: string, headers?: Record<string, string>) =>
    app.inject({ method: 'GET', url, headers });

  // ─── 1. TILE DELIVERY CONTRACT (Operation A) ──────────────────────────────
  describe('GET /api/v1/geo/tiles/:layer/:z/:x/:y', () => {
    it('returns 200 with vector-tile content-type for valid historical tile', async () => {
      const res = await get('/api/v1/geo/tiles/mandals/8/184/115?regime=historical&as_of=2016-10-11', {
        'accept-encoding': 'gzip',
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/vnd.mapbox-vector-tile');
      expect(res.headers['x-geography-layer']).toBe('mandals');
      expect(res.headers['x-geography-regime']).toBe('historical');
      expect(res.rawPayload.length).toBeGreaterThan(0);
    });

    it('returns 204 No Content for out-of-bounds / empty ocean tile', async () => {
      const res = await get('/api/v1/geo/tiles/mandals/8/10/10?regime=historical');
      expect(res.statusCode).toBe(204);
      expect(res.rawPayload.length).toBe(0);
    });

    it('returns 204 No Content for current regime on historical dataset (fail-closed)', async () => {
      const res = await get('/api/v1/geo/tiles/mandals/8/184/115?regime=current');
      expect(res.statusCode).toBe(204);
    });

    it('returns 400 for out-of-range tile coordinates', async () => {
      const res = await get('/api/v1/geo/tiles/mandals/8/9999/9999');
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('INVALID_TILE_COORDINATES');
    });

    it('returns 404 for unknown layer', async () => {
      const res = await get('/api/v1/geo/tiles/unknown_layer/8/184/115');
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('LAYER_NOT_FOUND');
    });
  });

  // ─── 2. LOCATE POINT-IN-POLYGON (Operation B) ──────────────────────────────
  describe('GET /api/v1/geo/locate', () => {
    it('locates known mandal from valid coordinates (Kuravi / Mahabubabad)', async () => {
      // Centroid coordinates of FID 286 (Kuravi)
      const res = await get('/api/v1/geo/locate?lat=17.487869&lng=79.997883&regime=historical&as_of=2016-10-11');
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('ok');
      expect(body.matched).toBe(true);

      const data = body.data;
      // Level 1: Stable Geographic Entity Identity
      expect(data.entity_id).toBeDefined();
      expect(typeof data.entity_id).toBe('string');
      // Level 2: Temporal Version Identity (UUID)
      expect(data.version_id).toBeDefined();
      expect(data.version_id.length).toBe(36);
      // Level 3: Physical Geometry Row Identity (UUID)
      expect(data.geometry_id).toBeDefined();
      expect(data.geometry_id.length).toBe(36);
      // Non-equation invariant
      expect(data.geometry_id).not.toBe(data.entity_id);
      expect(data.geometry_id).not.toBe(data.version_id);
      // Governed fields
      expect(data.status).toBe('DERIVED');
      expect(data.is_current).toBe(false);
      expect(data.temporal_classification).toBe('historical_statutory_baseline');
      expect(data.source_feature_id).toBe('286');
    });

    it('returns entity_id=null with bypass_adapter=true (proves generic spatial decoupling)', async () => {
      const res = await get('/api/v1/geo/locate?lat=17.487869&lng=79.997883&regime=historical&as_of=2016-10-11&bypass_adapter=true');
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.entity_id).toBeNull();
      expect(body.data.geometry_id).toBeDefined();
    });

    it('returns 404 when coordinates fall outside any known geometry', async () => {
      // Point in the Indian Ocean (lat: 5.0, lng: 80.0)
      const res = await get('/api/v1/geo/locate?lat=5.0&lng=80.0&regime=historical');
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.matched).toBe(false);
      expect(body.code).toBe('SPATIAL_LOCATION_NOT_FOUND');
    });

    it('returns 404 for current regime query on historical-only dataset (fail-closed)', async () => {
      const res = await get('/api/v1/geo/locate?lat=17.487869&lng=79.997883&regime=current');
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.matched).toBe(false);
      expect(body.code).toBe('SPATIAL_LOCATION_NOT_FOUND');
    });

    it('returns 400 for invalid latitude range', async () => {
      const res = await get('/api/v1/geo/locate?lat=95.0&lng=80.0');
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 for invalid longitude range', async () => {
      const res = await get('/api/v1/geo/locate?lat=17.0&lng=200.0');
      expect(res.statusCode).toBe(400);
    });
  });

  // ─── 3. IDENTIFY / DETAIL FEATURE (Operation C) ───────────────────────────
  describe('GET /api/v1/geo/features/:layer/:id', () => {
    it('returns 200 with full 3-tier identity for known source feature ID', async () => {
      const res = await get('/api/v1/geo/features/mandals/286?regime=historical&as_of=2016-10-11');
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('ok');

      const data = body.data;
      expect(data.source_feature_id).toBe('286');
      expect(data.entity_id).toBeDefined();
      expect(data.version_id).toBeDefined();
      expect(data.geometry_id).toBeDefined();
      expect(data.status).toBe('DERIVED');
      expect(data.is_current).toBe(false);
      expect(data.temporal_classification).toBe('historical_statutory_baseline');
    });

    it('returns 404 for nonexistent feature ID', async () => {
      const res = await get('/api/v1/geo/features/mandals/nonexistent_fid_99999');
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('FEATURE_NOT_FOUND');
    });

    it('returns 404 for unknown layer', async () => {
      const res = await get('/api/v1/geo/features/unknown_layer/286');
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('LAYER_NOT_FOUND');
    });
  });
});
