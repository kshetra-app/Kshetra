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
  // ─── 2. LOCATE POINT-IN-POLYGON (Operation B) ──────────────────────────────
  describe('GET /api/v1/geo/locate', () => {
    // Case 1: Known point inside FID 286 (Kuravi / Mahabubabad)
    it('Case 1: locates known mandal from valid coordinates (Kuravi / Mahabubabad)', async () => {
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
      // Source Reference
      expect(data.source_feature_id).toBe('286');

      // Non-equation invariants
      expect(data.geometry_id).not.toBe(data.entity_id);
      expect(data.geometry_id).not.toBe(data.version_id);
      expect(data.source_feature_id).not.toBe(data.geometry_id);
      expect(data.source_feature_id).not.toBe(data.version_id);
      expect(data.source_feature_id).not.toBe(data.entity_id);

      // Governed metadata
      expect(data.status).toBe('DERIVED');
      expect(data.is_current).toBe(false);
      expect(data.temporal_classification).toBe('historical_statutory_baseline');
    });

    // Case 2: Same point with regime=current -> fail-closed (404)
    it('Case 2: returns 404 for current regime query on historical-only dataset (fail-closed)', async () => {
      const res = await get('/api/v1/geo/locate?lat=17.487869&lng=79.997883&regime=current');
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.matched).toBe(false);
      expect(body.code).toBe('SPATIAL_LOCATION_NOT_FOUND');
    });

    // Case 3: Ocean point -> no match (404)
    it('Case 3: returns 404 when coordinates fall outside any known geometry (ocean point)', async () => {
      const res = await get('/api/v1/geo/locate?lat=5.0&lng=80.0&regime=historical');
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.matched).toBe(false);
      expect(body.code).toBe('SPATIAL_LOCATION_NOT_FOUND');
    });

    // Case 4: Invalid latitude -> 400
    it('Case 4: returns 400 for invalid latitude range', async () => {
      const res = await get('/api/v1/geo/locate?lat=95.0&lng=80.0');
      expect(res.statusCode).toBe(400);
    });

    // Case 5: Invalid longitude -> 400
    it('Case 5: returns 400 for invalid longitude range', async () => {
      const res = await get('/api/v1/geo/locate?lat=17.0&lng=200.0');
      expect(res.statusCode).toBe(400);
    });

    // Case 6: Historical as_of=2016-10-11 -> expected historical match
    it('Case 6: returns expected historical match for as_of=2016-10-11', async () => {
      const res = await get('/api/v1/geo/locate?lat=17.487869&lng=79.997883&regime=historical&as_of=2016-10-11');
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.matched).toBe(true);
      expect(body.data.source_feature_id).toBe('286');
      expect(body.data.valid_from).toBe('2016-10-11');
    });

    // Case 7: Explicit version lookup (version_id=...) -> expected version match
    it('Case 7: returns expected version match for explicit version_id lookup', async () => {
      const res = await get('/api/v1/geo/locate?lat=17.487869&lng=79.997883&version_id=9c1ebb72-2a15-5aae-ab7d-d3ef8806d28b');
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.matched).toBe(true);
      expect(body.data.version_id).toBe('9c1ebb72-2a15-5aae-ab7d-d3ef8806d28b');
      expect(body.data.source_feature_id).toBe('286');
    });

    // Generic Decoupling check
    it('returns entity_id=null with bypass_adapter=true (proves generic spatial decoupling)', async () => {
      const res = await get('/api/v1/geo/locate?lat=17.487869&lng=79.997883&regime=historical&as_of=2016-10-11&bypass_adapter=true');
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.entity_id).toBeNull();
      expect(body.data.geometry_id).toBeDefined();
      expect(body.data.identity_mapping.entity_id).toBeNull();
    });
  });

  // ─── 3. IDENTIFY / DETAIL FEATURE (Operation C) ───────────────────────────
  describe('GET /api/v1/geo/features/:layer/:id', () => {
    it('returns 200 with full 3-tier identity and mapping for source reference FID 286', async () => {
      const res = await get('/api/v1/geo/features/mandals/286?regime=historical&as_of=2016-10-11');
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('ok');

      const data = body.data;
      // Source reference
      expect(data.source_feature_id).toBe('286');
      // Level 1: Stable Geographic Entity Identity
      expect(data.entity_id).toBeDefined();
      expect(typeof data.entity_id).toBe('string');
      // Level 2: Temporal Version Identity (UUID)
      expect(data.version_id).toBeDefined();
      expect(data.version_id.length).toBe(36);
      // Level 3: Physical Geometry Row Identity (UUID)
      expect(data.geometry_id).toBeDefined();
      expect(data.geometry_id.length).toBe(36);

      // Proven non-equation invariants:
      expect(data.source_feature_id).not.toBe(data.geometry_id);
      expect(data.source_feature_id).not.toBe(data.version_id);
      expect(data.source_feature_id).not.toBe(data.entity_id);
      expect(data.geometry_id).not.toBe(data.version_id);
      expect(data.geometry_id).not.toBe(data.entity_id);

      // Proven identity mapping
      expect(data.identity_mapping).toBeDefined();
      expect(data.identity_mapping).toEqual({
        source_reference: '286',
        geometry_id: data.geometry_id,
        version_id: data.version_id,
        entity_id: data.entity_id,
      });

      // Governed fields
      expect(data.status).toBe('DERIVED');
      expect(data.is_current).toBe(false);
      expect(data.temporal_classification).toBe('historical_statutory_baseline');
    });

    it('returns 200 when querying by physical geometry_id UUID', async () => {
      // First get FID 286 to get its geometry_id
      const initial = await get('/api/v1/geo/features/mandals/286');
      const geomId = JSON.parse(initial.payload).data.geometry_id;

      const res = await get(`/api/v1/geo/features/mandals/${geomId}`);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.geometry_id).toBe(geomId);
      expect(body.data.source_feature_id).toBe('286');
    });

    it('returns 200 when querying by temporal version_id UUID', async () => {
      const verId = '9c1ebb72-2a15-5aae-ab7d-d3ef8806d28b';
      const res = await get(`/api/v1/geo/features/mandals/${verId}`);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.version_id).toBe(verId);
      expect(body.data.source_feature_id).toBe('286');
    });

    it('returns entity_id=null with bypass_adapter=true (pure generic identity)', async () => {
      const res = await get('/api/v1/geo/features/mandals/286?bypass_adapter=true');
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.entity_id).toBeNull();
      expect(body.data.identity_mapping.entity_id).toBeNull();
      expect(body.data.source_feature_id).toBe('286');
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
