import Fastify, { FastifyInstance } from 'fastify';
import {
  SpatialAnalyticsService,
  spatialAnalyticsService,
  geoJsonToWkt,
} from '../services/spatialAnalyticsService';
import { spatialAnalyticsRoutes } from '../routes/spatialAnalytics';
import { supabase } from '../lib/supabase';

describe('SpatialAnalyticsService & Routes Unit Tests (W017)', () => {
  let app: FastifyInstance;

  const mockPolygonGeoJson = {
    type: 'Polygon',
    coordinates: [
      [
        [78.4, 17.3],
        [78.5, 17.3],
        [78.5, 17.4],
        [78.4, 17.4],
        [78.4, 17.3],
      ],
    ],
  };

  const mockMultiPolygonGeoJson = {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [78.4, 17.3],
          [78.5, 17.3],
          [78.5, 17.4],
          [78.4, 17.4],
          [78.4, 17.3],
        ],
      ],
    ],
  };

  const mockGeometryRow = {
    id: '01900000-0000-0000-0000-000000000099',
    mandal_version_id: '01900000-0000-0000-0000-000000000088',
    source_feature_id: 'TS-MDL-5001',
    geometry: mockPolygonGeoJson,
    is_current: true,
    valid_from: '2016-10-11',
    valid_to: null,
    temporal_classification: 'CURRENT_LEGAL',
  };

  beforeAll(async () => {
    app = Fastify();
    await app.register(spatialAnalyticsRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('geoJsonToWkt', () => {
    it('converts Polygon GeoJSON object to WKT', () => {
      const wkt = geoJsonToWkt(mockPolygonGeoJson);
      expect(wkt).toContain('SRID=4326;POLYGON');
      expect(wkt).toContain('78.4 17.3');
    });

    it('converts MultiPolygon GeoJSON object to WKT', () => {
      const wkt = geoJsonToWkt(mockMultiPolygonGeoJson);
      expect(wkt).toContain('SRID=4326;MULTIPOLYGON');
    });

    it('passes through WKT strings untouched', () => {
      const wktInput = 'SRID=4326;POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))';
      expect(geoJsonToWkt(wktInput)).toBe(wktInput);
    });

    it('handles JSON serialized strings', () => {
      const str = JSON.stringify(mockPolygonGeoJson);
      const wkt = geoJsonToWkt(str);
      expect(wkt).toContain('SRID=4326;POLYGON');
    });

    it('returns empty string for invalid geometries', () => {
      expect(geoJsonToWkt(null)).toBe('');
      expect(geoJsonToWkt({ type: 'Point' })).toBe('');
    });
  });

  describe('resolveGeometry', () => {
    it('throws 400 when asOfDate is missing in as_of mode', async () => {
      await expect(
        spatialAnalyticsService.resolveGeometry({
          entityId: 'TS-MDL-5001',
          selection: { mode: 'as_of' },
        })
      ).rejects.toThrow('TEMPORAL_SELECTION_INVALID');
    });

    it('throws 400 when versionId is missing in version mode', async () => {
      await expect(
        spatialAnalyticsService.resolveGeometry({
          entityId: 'TS-MDL-5001',
          selection: { mode: 'version' },
        })
      ).rejects.toThrow('TEMPORAL_SELECTION_INVALID');
    });

    it('resolves geometry in current mode', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        expect(table).toBe('entity_geometries');
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: mockGeometryRow, error: null }),
        };
      }) as any);

      const res = await spatialAnalyticsService.resolveGeometry({
        entityId: 'TS-MDL-5001',
        selection: { mode: 'current' },
      });

      expect(res.geometryId).toBe(mockGeometryRow.id);
      expect(res.isCurrent).toBe(true);
    });

    it('throws 404 CURRENT_GEOMETRY_UNAVAILABLE when current geometry not found', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })) as any);

      await expect(
        spatialAnalyticsService.resolveGeometry({
          entityId: 'TS-MDL-9999',
          selection: { mode: 'current' },
        })
      ).rejects.toThrow('CURRENT_GEOMETRY_UNAVAILABLE');
    });

    it('resolves geometry in version mode', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockGeometryRow, error: null }),
      })) as any);

      const res = await spatialAnalyticsService.resolveGeometry({
        entityId: 'TS-MDL-5001',
        selection: { mode: 'version', versionId: '01900000-0000-0000-0000-000000000088' },
      });

      expect(res.mandalVersionId).toBe('01900000-0000-0000-0000-000000000088');
    });

    it('resolves geometry in as_of mode', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockGeometryRow, error: null }),
      })) as any);

      const res = await spatialAnalyticsService.resolveGeometry({
        entityId: 'TS-MDL-5001',
        selection: { mode: 'as_of', asOfDate: '2020-01-01' },
      });

      expect(res.validFrom).toBe('2016-10-11');
    });

    it('resolves geometry in future/scenario mode', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockGeometryRow, error: null }),
      })) as any);

      const res = await spatialAnalyticsService.resolveGeometry({
        entityId: 'TS-MDL-5001',
        selection: { mode: 'scenario' },
      });

      expect(res.geometryId).toBe(mockGeometryRow.id);
    });
  });

  describe('calculateOverlap', () => {
    it('computes overlap via stored procedure RPC', async () => {
      jest.spyOn(spatialAnalyticsService, 'resolveGeometry').mockResolvedValue({
        geometryId: 'G1',
        mandalVersionId: 'V1',
        sourceFeatureId: 'F1',
        geometry: mockPolygonGeoJson,
        isCurrent: true,
        validFrom: '2016-10-11',
        validTo: null,
        temporalClassification: 'CURRENT_LEGAL',
      });

      jest.spyOn(supabase, 'rpc').mockResolvedValue({
        data: [
          {
            area_a_m2: 1000000,
            area_b_m2: 1000000,
            intersection_area_m2: 500000,
            overlap_pct_a: 50.0,
            overlap_pct_b: 50.0,
            intersection_dimension: 2,
            is_disjoint: false,
          },
        ],
        error: null,
      } as any);

      const res = await spatialAnalyticsService.calculateOverlap(
        { entityId: 'E1', selection: { mode: 'current' } },
        { entityId: 'E2', selection: { mode: 'current' } }
      );

      expect(res.baseEntityAreaM2).toBe(1000000);
      expect(res.intersectionAreaM2).toBe(500000);
      expect(res.baseOverlapPercentage).toBe(50.0);
      expect(res.isDisjoint).toBe(false);
    });

    it('computes fast path for identical geometries when RPC fails', async () => {
      jest.spyOn(spatialAnalyticsService, 'resolveGeometry').mockResolvedValue({
        geometryId: 'G1',
        mandalVersionId: 'V1',
        sourceFeatureId: 'F1',
        geometry: mockPolygonGeoJson,
        isCurrent: true,
        validFrom: '2016-10-11',
        validTo: null,
        temporalClassification: 'CURRENT_LEGAL',
      });

      jest.spyOn(supabase, 'rpc').mockImplementation(((proc: string) => {
        if (proc === 'fn_spatial_calculate_overlap') {
          return Promise.resolve({ data: null, error: { message: 'no fn' } } as any);
        }
        if (proc === 'st_area') {
          return Promise.resolve({ data: 123456.78, error: null } as any);
        }
        return Promise.resolve({ data: null, error: null } as any);
      }) as any);

      const res = await spatialAnalyticsService.calculateOverlap(
        { entityId: 'E1', selection: { mode: 'current' } },
        { entityId: 'E1', selection: { mode: 'current' } }
      );

      expect(res.baseOverlapPercentage).toBe(100.0);
      expect(res.comparisonOverlapPercentage).toBe(100.0);
      expect(res.baseEntityAreaM2).toBe(123456.78);
    });

    it('computes fallback path for distinct geometries when RPC fails', async () => {
      let callCount = 0;
      jest.spyOn(spatialAnalyticsService, 'resolveGeometry').mockImplementation(async () => {
        callCount++;
        return {
          geometryId: `G${callCount}`,
          mandalVersionId: `V${callCount}`,
          sourceFeatureId: `F${callCount}`,
          geometry: {
            type: 'Polygon',
            coordinates: callCount === 1 ? [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] : [[[0.5, 0.5], [0.5, 1.5], [1.5, 1.5], [1.5, 0.5], [0.5, 0.5]]],
          },
          isCurrent: true,
          validFrom: '2016-10-11',
          validTo: null,
          temporalClassification: 'CURRENT_LEGAL',
        };
      });

      jest.spyOn(supabase, 'rpc').mockImplementation(((proc: string) => {
        if (proc === 'fn_spatial_calculate_overlap') {
          return Promise.resolve({ data: null, error: { message: 'no fn' } });
        }
        if (proc === 'st_area') {
          return Promise.resolve({ data: 1000000, error: null });
        }
        if (proc === 'st_intersection') {
          return Promise.resolve({ data: { type: 'Polygon', coordinates: [] }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      }) as any);

      const res = await spatialAnalyticsService.calculateOverlap(
        { entityId: 'E1', selection: { mode: 'current' } },
        { entityId: 'E2', selection: { mode: 'current' } }
      );

      expect(res.baseOverlapPercentage).toBe(100.0);
      expect(res.isDisjoint).toBe(false);
    });
  });

  describe('calculateBoundaryDiff', () => {
    it('computes boundary diff via stored procedure RPC', async () => {
      jest.spyOn(spatialAnalyticsService, 'resolveGeometry').mockResolvedValue({
        geometryId: 'G1',
        mandalVersionId: 'V1',
        sourceFeatureId: 'F1',
        geometry: mockPolygonGeoJson,
        isCurrent: true,
        validFrom: '2016-10-11',
        validTo: null,
        temporalClassification: 'CURRENT_LEGAL',
      });

      jest.spyOn(supabase, 'rpc').mockResolvedValue({
        data: [
          {
            source_area_m2: 2000000,
            target_area_m2: 2200000,
            net_change_m2: 200000,
            added_area_m2: 250000,
            removed_area_m2: 50000,
            unmodified_area_m2: 1950000,
            similarity_index: 0.92,
            added_geom: null,
            removed_geom: null,
          },
        ],
        error: null,
      } as any);

      const res = await spatialAnalyticsService.calculateBoundaryDiff(
        'TS-MDL-5001',
        { mode: 'current' },
        { mode: 'version', versionId: 'V2' }
      );

      expect(res.similarityIndex).toBe(0.92);
      expect(res.netAreaChangeM2).toBe(200000);
      expect(res.regimeContext.isCrossRegime).toBe(true);
    });

    it('computes fallback path for distinct geometries when RPC fails', async () => {
      let callCount = 0;
      jest.spyOn(spatialAnalyticsService, 'resolveGeometry').mockImplementation(async () => {
        callCount++;
        return {
          geometryId: `G${callCount}`,
          mandalVersionId: `V${callCount}`,
          sourceFeatureId: `F${callCount}`,
          geometry: {
            type: 'Polygon',
            coordinates: callCount === 1 ? [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] : [[[1, 1], [1, 2], [2, 2], [2, 1], [1, 1]]],
          },
          isCurrent: true,
          validFrom: '2016-10-11',
          validTo: null,
          temporalClassification: 'CURRENT_LEGAL',
        };
      });

      jest.spyOn(supabase, 'rpc').mockImplementation(((proc: string) => {
        if (proc === 'fn_spatial_calculate_boundary_diff') {
          return Promise.resolve({ data: null, error: { message: 'no fn' } });
        }
        if (proc === 'st_area') {
          return Promise.resolve({ data: 500000, error: null });
        }
        if (proc === 'st_difference') {
          return Promise.resolve({ data: { type: 'Polygon', coordinates: [] }, error: null });
        }
        if (proc === 'st_intersection') {
          return Promise.resolve({ data: { type: 'Polygon', coordinates: [] }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      }) as any);

      const res = await spatialAnalyticsService.calculateBoundaryDiff(
        'TS-MDL-5001',
        { mode: 'current' },
        { mode: 'version', versionId: 'V2' }
      );

      expect(res.sourceAreaM2).toBe(500000);
      expect(res.targetAreaM2).toBe(500000);
    });
  });

  describe('detectAnomalies', () => {
    it('throws 413 when bbox dimensions exceed 2.0 degrees', async () => {
      await expect(
        spatialAnalyticsService.detectAnomalies('mandals', {
          minLng: 70.0,
          minLat: 10.0,
          maxLng: 75.0,
          maxLat: 15.0,
        })
      ).rejects.toThrow('SPATIAL_QUERY_LIMIT_EXCEEDED');
    });

    it('detects topological anomalies for geometry via stored procedure RPC', async () => {
      jest.spyOn(supabase, 'rpc').mockResolvedValue({
        data: [
          {
            anomaly_type: 'OVERLAP',
            entity_a_id: 'E1',
            entity_b_id: 'E2',
            anomaly_area_m2: 1200,
            severity: 'WARNING',
            centroid: { coordinates: [78.45, 17.35] },
            diagnostic_details: {},
          },
        ],
        error: null,
      } as any);

      const res = await spatialAnalyticsService.detectAnomalies('mandals', {
        minLng: 78.4,
        minLat: 17.3,
        maxLng: 78.5,
        maxLat: 17.4,
      });

      expect(res.layer).toBe('mandals');
      expect(res.anomalyCount).toBe(1);
      expect(res.anomalies[0].type).toBe('OVERLAP');
      expect(res.governanceNotice).toContain('NON_JUDICIAL_DIAGNOSTIC');
    });

    it('executes fallback anomaly scan when stored procedure RPC fails', async () => {
      jest.spyOn(supabase, 'rpc').mockImplementation(((proc: string) => {
        if (proc === 'detect_topological_anomalies') {
          return Promise.resolve({ data: null, error: { message: 'no fn' } });
        }
        if (proc === 'st_isvaliddetail') {
          return Promise.resolve({
            data: { valid: false, reason: 'Self-intersection at (17.35, 78.45)', location: null },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }) as any);

      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            {
              id: '01900000-0000-0000-0000-000000000001',
              mandal_version_id: 'V1',
              source_feature_id: 'TS-MDL-1',
              geometry: mockPolygonGeoJson,
            },
          ],
          error: null,
        }),
      })) as any);

      const res = await spatialAnalyticsService.detectAnomalies('mandals', {
        minLng: 78.4,
        minLat: 17.3,
        maxLng: 78.5,
        maxLat: 17.4,
      });

      expect(res.scannedFeatureCount).toBe(1);
      expect(res.anomalyCount).toBe(1);
      expect(res.anomalies[0].type).toBe('INVALID_GEOMETRY');
    });
  });

  describe('Spatial Fastify HTTP Routes', () => {
    it('POST /api/v1/spatial/analytics/overlap returns 401 when unauthenticated', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/spatial/analytics/overlap',
        payload: {
          baseEntity: { entityId: 'E1', selection: { mode: 'current' } },
          comparisonEntity: { entityId: 'E2', selection: { mode: 'current' } },
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('POST /api/v1/spatial/analytics/overlap returns 200 for authenticated caller', async () => {
      jest.spyOn(spatialAnalyticsService, 'calculateOverlap').mockResolvedValue({
        baseEntityAreaM2: 1000000,
        comparisonEntityAreaM2: 1000000,
        intersectionAreaM2: 500000,
        baseOverlapPercentage: 50.0,
        comparisonOverlapPercentage: 50.0,
        intersectionDimension: 2,
        isDisjoint: false,
        regimeContext: { isCrossRegime: false, baseSelection: { mode: 'current' }, comparisonSelection: { mode: 'current' } },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/spatial/analytics/overlap',
        headers: {
          'x-test-role': 'authenticated',
          'x-test-user-id': 'user-123',
        },
        payload: {
          baseEntity: { entityId: 'E1', selection: { mode: 'current' } },
          comparisonEntity: { entityId: 'E2', selection: { mode: 'current' } },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.baseOverlapPercentage).toBe(50.0);
    });

    it('POST /api/v1/spatial/analytics/boundary-diff returns 200 for authenticated caller', async () => {
      jest.spyOn(spatialAnalyticsService, 'calculateBoundaryDiff').mockResolvedValue({
        entityId: 'TS-MDL-5001',
        sourceAreaM2: 1000000,
        targetAreaM2: 1100000,
        netAreaChangeM2: 100000,
        addedAreaM2: 150000,
        removedAreaM2: 50000,
        unmodifiedAreaM2: 950000,
        similarityIndex: 0.95,
        regimeContext: { isCrossRegime: false, baseSelection: { mode: 'current' }, comparisonSelection: { mode: 'version' } },
        addedGeoJson: null,
        removedGeoJson: null,
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/spatial/analytics/boundary-diff',
        headers: {
          'x-test-role': 'authenticated',
        },
        payload: {
          entityId: 'TS-MDL-5001',
          sourceSelection: { mode: 'current' },
          targetSelection: { mode: 'version', versionId: 'V2' },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.similarityIndex).toBe(0.95);
    });

    it('GET /api/v1/spatial/quality/anomalies fails closed 403 on standard user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/spatial/quality/anomalies?layer=mandals&bbox=78.4,17.3,78.5,17.4',
        headers: {
          'x-test-role': 'authenticated',
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('INSUFFICIENT_ROLE_PERMISSIONS');
    });

    it('GET /api/v1/spatial/quality/anomalies returns 200 for service_role', async () => {
      jest.spyOn(spatialAnalyticsService, 'detectAnomalies').mockResolvedValue({
        layer: 'mandals',
        profile: 'v1.0-standard',
        scannedFeatureCount: 1,
        anomalyCount: 0,
        anomalies: [],
        governanceNotice: 'NON_JUDICIAL_DIAGNOSTIC: Heuristic screening only.',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/spatial/quality/anomalies?layer=mandals&bbox=78.4,17.3,78.5,17.4',
        headers: {
          'x-test-role': 'service_role',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.anomalyCount).toBe(0);
      expect(body.data.governanceNotice).toContain('NON_JUDICIAL_DIAGNOSTIC');
    });
  });
});
