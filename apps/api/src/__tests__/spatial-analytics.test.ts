import { buildApp } from '../server';

describe('Spatial Gateway, Boundary Diff & Analytics API (W017)', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (url: string, body: any, headers: Record<string, string> = {}) =>
    app.inject({
      method: 'POST',
      url,
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer test-token',
        'x-test-role': 'service_role',
        ...headers,
      },
      payload: body,
    });

  const get = (url: string, headers: Record<string, string> = {}) =>
    app.inject({
      method: 'GET',
      url,
      headers: {
        authorization: 'Bearer test-token',
        'x-test-role': 'service_role',
        ...headers,
      },
    });

  // ─── 1. SECURITY & AUTHORIZATION GATES ─────────────────────────────────────
  describe('Security & Authorization Gates', () => {
    it('returns 401 Unauthorized on POST /api/v1/spatial/analytics/overlap when unauthenticated', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/spatial/analytics/overlap',
        payload: {
          baseEntity: { entityId: '286', selection: { mode: 'as_of', asOfDate: '2016-10-11' } },
          comparisonEntity: { entityId: '286', selection: { mode: 'as_of', asOfDate: '2016-10-11' } },
        },
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Unauthorized');
      expect(body.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('returns 401 Unauthorized on GET /api/v1/spatial/quality/anomalies when unauthenticated', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/spatial/quality/anomalies?layer=mandals&bbox=78.0,17.0,78.5,17.5',
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Unauthorized');
      expect(body.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('returns 403 Forbidden on GET /api/v1/spatial/quality/anomalies for non-service_role caller', async () => {
      const res = await get(
        '/api/v1/spatial/quality/anomalies?layer=mandals&bbox=78.0,17.0,78.5,17.5',
        { 'x-test-role': 'authenticated' }
      );
      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Forbidden');
      expect(body.code).toBe('INSUFFICIENT_ROLE_PERMISSIONS');
    });
  });

  // ─── 2. SPATIAL OVERLAP ENDPOINT ───────────────────────────────────────────
  describe('POST /api/v1/spatial/analytics/overlap', () => {
    it('returns 200 and 100% overlap for self-comparison (Identity Invariant)', async () => {
      const res = await post('/api/v1/spatial/analytics/overlap', {
        baseEntity: {
          entityId: '286',
          selection: { mode: 'as_of', asOfDate: '2016-10-11' },
        },
        comparisonEntity: {
          entityId: '286',
          selection: { mode: 'as_of', asOfDate: '2016-10-11' },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();

      const data = body.data;
      expect(data.baseOverlapPercentage).toBeCloseTo(100.0, 1);
      expect(data.comparisonOverlapPercentage).toBeCloseTo(100.0, 1);
      expect(data.isDisjoint).toBe(false);
      expect(data.baseEntityAreaM2).toBeGreaterThan(0);
      expect(data.intersectionAreaM2).toBeGreaterThan(0);
      expect(data.regimeContext.isCrossRegime).toBe(false);
    });

    it('returns 200 and 0% overlap for disjoint entities (Disjoint Invariant)', async () => {
      // FID 286 (Kuravi in Mahabubabad) and FID 1 (Sirpur T in Komaram Bheem Asifabad) are far apart
      const res = await post('/api/v1/spatial/analytics/overlap', {
        baseEntity: {
          entityId: '286',
          selection: { mode: 'as_of', asOfDate: '2016-10-11' },
        },
        comparisonEntity: {
          entityId: '1',
          selection: { mode: 'as_of', asOfDate: '2016-10-11' },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
      const data = body.data;
      expect(data.baseOverlapPercentage).toBe(0);
      expect(data.comparisonOverlapPercentage).toBe(0);
      expect(data.isDisjoint).toBe(true);
      expect(data.intersectionAreaM2).toBe(0);
    });

    it('flags cross-regime comparisons with isCrossRegime=true and warning header', async () => {
      const res = await post('/api/v1/spatial/analytics/overlap', {
        baseEntity: {
          entityId: '286',
          selection: { mode: 'as_of', asOfDate: '2016-10-11' },
        },
        comparisonEntity: {
          entityId: '286',
          selection: { mode: 'as_of', asOfDate: '2020-01-01' },
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-spatial-cross-regime']).toBe('true');
      const body = JSON.parse(res.payload);
      expect(body.data.regimeContext.isCrossRegime).toBe(true);
      expect(body.data.regimeContext.warning).toContain('CROSS_REGIME_COMPARISON');
    });

    it('returns 400 Bad Request when required selection fields are missing', async () => {
      const res = await post('/api/v1/spatial/analytics/overlap', {
        baseEntity: { entityId: '286' }, // missing selection
        comparisonEntity: { entityId: '286', selection: { mode: 'as_of', asOfDate: '2016-10-11' } },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Bad Request');
      expect(body.statusCode).toBe(400);
    });

    it('returns 404 when querying an entity under current regime where only historical baseline exists', async () => {
      const res = await post('/api/v1/spatial/analytics/overlap', {
        baseEntity: {
          entityId: '286',
          selection: { mode: 'current' }, // Historical geometries have is_current = false
        },
        comparisonEntity: {
          entityId: '286',
          selection: { mode: 'as_of', asOfDate: '2016-10-11' },
        },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Not Found');
      expect(body.code).toBe('CURRENT_GEOMETRY_UNAVAILABLE');
    });
  });

  // ─── 3. SPATIAL BOUNDARY DIFF ENDPOINT ─────────────────────────────────────
  describe('POST /api/v1/spatial/analytics/boundary-diff', () => {
    it('returns 200 with similarityIndex=1.0 when diffing identical versions', async () => {
      const res = await post('/api/v1/spatial/analytics/boundary-diff', {
        entityId: '286',
        sourceSelection: { mode: 'as_of', asOfDate: '2016-10-11' },
        targetSelection: { mode: 'as_of', asOfDate: '2016-10-11' },
        options: { includeDiffGeoJson: true },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
      const data = body.data;
      expect(data.similarityIndex).toBeCloseTo(1.0, 2);
      expect(data.netAreaChangeM2).toBeCloseTo(0, 1);
      expect(data.addedAreaM2).toBeCloseTo(0, 1);
      expect(data.removedAreaM2).toBeCloseTo(0, 1);
      expect(data.regimeContext.isCrossRegime).toBe(false);
    });

    it('returns 400 Bad Request for missing body fields', async () => {
      const res = await post('/api/v1/spatial/analytics/boundary-diff', {
        entityId: '286',
        // missing sourceSelection & targetSelection
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Bad Request');
      expect(body.statusCode).toBe(400);
    });
  });

  // ─── 4. TOPOLOGICAL ANOMALY DETECTION (QUALITY GATE) ──────────────────────
  describe('GET /api/v1/spatial/quality/anomalies', () => {
    it('returns 200 with anomaly report for bounded query by service_role', async () => {
      const res = await get('/api/v1/spatial/quality/anomalies?layer=mandals&bbox=79.9,17.4,80.1,17.6');
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
      expect(body.data.layer).toBe('mandals');
      expect(Array.isArray(body.data.anomalies)).toBe(true);
      expect(typeof body.data.scannedFeatureCount).toBe('number');
    });

    it('returns 413 SPATIAL_QUERY_LIMIT_EXCEEDED when bounding box exceeds 2.0x2.0 degrees', async () => {
      // 77.0 to 80.0 is 3.0 degrees > 2.0 limit
      const res = await get('/api/v1/spatial/quality/anomalies?layer=mandals&bbox=77.0,15.0,80.0,18.0');
      expect(res.statusCode).toBe(413);
      const body = JSON.parse(res.payload);
      expect(body.statusCode).toBe(413);
      expect(body.code).toBe('SPATIAL_QUERY_LIMIT_EXCEEDED');
    });

    it('returns 400 Bad Request for invalid bbox query parameter', async () => {
      const res = await get('/api/v1/spatial/quality/anomalies?layer=mandals&bbox=invalid,bbox');
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Bad Request');
      expect(body.statusCode).toBe(400);
    });
  });
});
