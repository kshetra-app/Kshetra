import Fastify, { FastifyInstance } from 'fastify';
import {
  SpatialRuntimeService,
  spatialRuntimeService,
  MandalMetadataAdapter,
  tile2lon,
  tile2lat,
  getTileBBox,
  bboxIntersects,
  pointInBBox,
  computeGeometryBBox,
  encodeMVTLayer,
} from '../services/spatialRuntimeService';
import { geoRuntimeRoutes } from '../routes/geoRuntime';
import { supabase } from '../lib/supabase';

describe('SpatialRuntimeService & Routes Unit Tests (W016)', () => {
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

  const mockFeatureRow = {
    id: '01900000-0000-0000-0000-000000000099',
    mandal_version_id: '01900000-0000-0000-0000-000000000088',
    source_feature_id: 'TS-MDL-5001',
    entity_type: 'mandal',
    status: 'DERIVED',
    is_current: true,
    temporal_classification: 'CURRENT_LEGAL',
    authority_classification: 'STATUTORY',
    valid_from: '2016-10-11',
    valid_to: null,
    geometry: mockPolygonGeoJson,
  };

  beforeAll(async () => {
    app = Fastify();
    await app.register(geoRuntimeRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'mandal_versions') {
        return {
          select: jest.fn().mockResolvedValue({
            data: [
              {
                id: '01900000-0000-0000-0000-000000000088',
                mandal_id: 'TS-MDL-5001',
                name: 'Kondangal Mandal',
                district_id: 'TS-DST-001',
              },
            ],
            error: null,
          }),
        } as any;
      }
      const mockQueryBuilder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        then: (resolve: any) =>
          Promise.resolve({ data: [mockFeatureRow], error: null }).then(resolve),
      };
      return mockQueryBuilder;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Tile coordinate math and bounding boxes', () => {
    it('converts tile indices to longitude and latitude', () => {
      const lon = tile2lon(0, 0);
      expect(lon).toBe(-180);

      const lat = tile2lat(0, 0);
      expect(lat).toBeCloseTo(85.0511, 2);
    });

    it('computes tile bounding box', () => {
      const bbox = getTileBBox(10, 500, 500);
      expect(bbox.minX).toBeLessThan(bbox.maxX);
      expect(bbox.minY).toBeLessThan(bbox.maxY);
    });

    it('evaluates bounding box intersection and point containment', () => {
      const b1 = { minX: 10, minY: 10, maxX: 20, maxY: 20 };
      const b2 = { minX: 15, minY: 15, maxX: 25, maxY: 25 };
      const b3 = { minX: 30, minY: 30, maxX: 40, maxY: 40 };

      expect(bboxIntersects(b1, b2)).toBe(true);
      expect(bboxIntersects(b1, b3)).toBe(false);

      expect(pointInBBox(15, 15, b1)).toBe(true);
      expect(pointInBBox(25, 25, b1)).toBe(false);
    });

    it('computes bounding box of GeoJSON polygon', () => {
      const bbox = computeGeometryBBox(mockPolygonGeoJson);
      expect(bbox.minX).toBe(78.4);
      expect(bbox.maxX).toBe(78.5);
      expect(bbox.minY).toBe(17.3);
      expect(bbox.maxY).toBe(17.4);
    });
  });

  describe('encodeMVTLayer', () => {
    it('encodes vector tile protobuf buffer', () => {
      const buf = encodeMVTLayer(
        'mandals',
        [
          {
            geometry: mockPolygonGeoJson,
            properties: { name: 'Serilingampally', code: 'TS-MDL-5001' },
          },
        ],
        10,
        500,
        500,
      );

      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBeGreaterThan(0);
    });
  });

  describe('MandalMetadataAdapter', () => {
    it('loads metadata cache and enriches features', async () => {
      const adapter = new MandalMetadataAdapter();

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        expect(table).toBe('mandal_versions');
        return {
          select: jest.fn().mockResolvedValue({
            data: [
              {
                id: '01900000-0000-0000-0000-000000000088',
                mandal_id: 'TS-MDL-5001',
                name: 'Serilingampally',
                district_id: 'TS-DST-001',
              },
            ],
            error: null,
          }),
        };
      }) as any);

      await adapter.ensureLoaded();

      const enriched = adapter.enrichFeatureProperties({
        entity_id: null,
        version_id: '01900000-0000-0000-0000-000000000088',
        geometry_id: 'G1',
        source_feature_id: 'TS-MDL-5001',
        entity_type: 'mandal',
        status: 'DERIVED',
        is_current: true,
        temporal_classification: 'CURRENT_LEGAL',
        authority_classification: 'STATUTORY',
        valid_from: '2016-10-11',
        valid_to: null,
      });

      expect(enriched.entity_id).toBe('TS-MDL-5001');
      expect(enriched.name).toBe('Serilingampally');
      expect(enriched.district_id).toBe('TS-DST-001');
    });

    it('falls back to unknown entity id when version not in cache', () => {
      const adapter = new MandalMetadataAdapter();
      const enriched = adapter.enrichFeatureProperties({
        entity_id: null,
        version_id: 'UNKNOWN_VERSION',
        geometry_id: 'G1',
        source_feature_id: '5099',
        entity_type: 'mandal',
        status: 'DERIVED',
        is_current: true,
        temporal_classification: 'CURRENT_LEGAL',
        authority_classification: 'STATUTORY',
        valid_from: '2016-10-11',
        valid_to: null,
      });

      expect(enriched.entity_id).toBe('TS-MDL-UNKNOWN-5099');
    });
  });

  describe('SpatialRuntimeService repository methods', () => {
    it('selectGenericSpatialFeatures queries PostGIS table in current mode', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        expect(table).toBe('entity_geometries');
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockResolvedValue({ data: [mockFeatureRow], error: null }),
        };
      }) as any);

      const features = await spatialRuntimeService.selectGenericSpatialFeatures({
        entityType: 'mandal',
        regime: 'current',
      });

      expect(features.length).toBe(1);
      expect(features[0].properties.source_feature_id).toBe('TS-MDL-5001');
    });

    it('getTile returns vector tile buffers and feature count', async () => {
      jest.spyOn(spatialRuntimeService, 'selectGenericSpatialFeatures').mockResolvedValue([
        {
          geometry: mockFeatureRow.geometry,
          properties: {
            entity_id: null,
            version_id: mockFeatureRow.mandal_version_id,
            geometry_id: mockFeatureRow.id,
            source_feature_id: mockFeatureRow.source_feature_id,
            entity_type: mockFeatureRow.entity_type,
            status: mockFeatureRow.status,
            is_current: mockFeatureRow.is_current,
            temporal_classification: mockFeatureRow.temporal_classification,
            authority_classification: mockFeatureRow.authority_classification,
            valid_from: mockFeatureRow.valid_from,
            valid_to: mockFeatureRow.valid_to,
          },
        },
      ]);

      const res = await spatialRuntimeService.getTile({
        layer: 'mandals',
        z: 0,
        x: 0,
        y: 0,
        regime: 'current',
      });

      expect(res).not.toBeNull();
      expect(res?.rawBuffer).toBeDefined();
      expect(res?.gzipBuffer).toBeDefined();
      expect(res?.featureCount).toBe(1);
    });

    it('locatePoint finds feature containing coordinates', async () => {
      jest
        .spyOn(spatialRuntimeService, 'selectGenericSpatialFeatures')
        .mockImplementation(async (opts: any) => {
          if (opts.point && opts.point.lat === 17.35) {
            return [
              {
                geometry: mockFeatureRow.geometry,
                properties: {
                  entity_id: null,
                  version_id: mockFeatureRow.mandal_version_id,
                  geometry_id: mockFeatureRow.id,
                  source_feature_id: mockFeatureRow.source_feature_id,
                  entity_type: mockFeatureRow.entity_type,
                  status: mockFeatureRow.status,
                  is_current: mockFeatureRow.is_current,
                  temporal_classification: mockFeatureRow.temporal_classification,
                  authority_classification: mockFeatureRow.authority_classification,
                  valid_from: mockFeatureRow.valid_from,
                  valid_to: mockFeatureRow.valid_to,
                },
              },
            ];
          }
          return [];
        });

      const found = await spatialRuntimeService.locatePoint({
        lat: 17.35,
        lng: 78.45,
        layer: 'mandals',
        regime: 'current',
      });

      expect(found).not.toBeNull();
      expect(found?.source_feature_id).toBe('TS-MDL-5001');

      const notFound = await spatialRuntimeService.locatePoint({
        lat: 25.0,
        lng: 85.0,
        layer: 'mandals',
        regime: 'current',
      });

      expect(notFound).toBeNull();
    });

    it('getFeatureDetail resolves feature by geometry_id or version_id', async () => {
      jest.spyOn(spatialRuntimeService, 'selectGenericSpatialFeatures').mockResolvedValue([
        {
          geometry: mockFeatureRow.geometry,
          properties: {
            entity_id: null,
            version_id: mockFeatureRow.mandal_version_id,
            geometry_id: mockFeatureRow.id,
            source_feature_id: mockFeatureRow.source_feature_id,
            entity_type: mockFeatureRow.entity_type,
            status: mockFeatureRow.status,
            is_current: mockFeatureRow.is_current,
            temporal_classification: mockFeatureRow.temporal_classification,
            authority_classification: mockFeatureRow.authority_classification,
            valid_from: mockFeatureRow.valid_from,
            valid_to: mockFeatureRow.valid_to,
          },
        },
      ]);

      const detail = await spatialRuntimeService.getFeatureDetail({
        id: mockFeatureRow.id,
        layer: 'mandals',
        regime: 'current',
      });

      expect(detail).not.toBeNull();
      expect(detail?.geometry_id).toBe(mockFeatureRow.id);
    });
  });

  describe('GeoRuntime Fastify HTTP Routes', () => {
    it('GET /geo/tiles/:layer/:z/:x/:y rejects invalid tile coordinates', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/geo/tiles/mandals/1/5/5',
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('INVALID_TILE_COORDINATES');
    });

    it('GET /geo/tiles/:layer/:z/:x/:y rejects unknown layer', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/geo/tiles/unknown_layer/0/0/0',
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('LAYER_NOT_FOUND');
    });

    it('GET /geo/tiles/:layer/:z/:x/:y returns 200 with protobuf tile', async () => {
      const rawBuf = Buffer.from('mock-pbf-tile');
      const gzipBuf = Buffer.from('mock-gzip-tile');
      jest.spyOn(spatialRuntimeService, 'getTile').mockResolvedValue({
        rawBuffer: rawBuf,
        gzipBuffer: gzipBuf,
        featureCount: 1,
        features: [],
      });

      const res = await app.inject({
        method: 'GET',
        url: '/geo/tiles/mandals/0/0/0',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/vnd.mapbox-vector-tile');

      // Test with Accept-Encoding: gzip
      const resGzip = await app.inject({
        method: 'GET',
        url: '/geo/tiles/mandals/0/0/0',
        headers: {
          'accept-encoding': 'gzip',
        },
      });
      expect(resGzip.statusCode).toBe(200);
      expect(resGzip.headers['content-encoding']).toBe('gzip');
    });

    it('GET /geo/tiles/:layer/:z/:x/:y returns 204 when no features in tile', async () => {
      jest.spyOn(spatialRuntimeService, 'getTile').mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/geo/tiles/mandals/0/0/0',
      });

      expect(res.statusCode).toBe(204);
    });

    it('GET /geo/locate returns feature properties or 404', async () => {
      jest.spyOn(spatialRuntimeService, 'locatePoint').mockResolvedValue({
        entity_id: 'TS-MDL-5001',
        version_id: mockFeatureRow.mandal_version_id,
        geometry_id: mockFeatureRow.id,
        source_feature_id: 'TS-MDL-5001',
        entity_type: 'mandal',
        status: 'DERIVED',
        is_current: true,
        temporal_classification: 'CURRENT_LEGAL',
        authority_classification: 'STATUTORY',
        valid_from: '2016-10-11',
        valid_to: null,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/geo/locate?lat=17.35&lng=78.45&layer=mandals',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.entity_id).toBe('TS-MDL-5001');

      jest.spyOn(spatialRuntimeService, 'locatePoint').mockResolvedValue(null);
      const res404 = await app.inject({
        method: 'GET',
        url: '/geo/locate?lat=0&lng=0&layer=mandals',
      });
      expect(res404.statusCode).toBe(404);
    });

    it('GET /geo/features/:layer/:id returns feature detail or 404', async () => {
      jest.spyOn(spatialRuntimeService, 'getFeatureDetail').mockResolvedValue({
        entity_id: 'TS-MDL-5001',
        version_id: mockFeatureRow.mandal_version_id,
        geometry_id: mockFeatureRow.id,
        source_feature_id: 'TS-MDL-5001',
        entity_type: 'mandal',
        status: 'DERIVED',
        is_current: true,
        temporal_classification: 'CURRENT_LEGAL',
        authority_classification: 'STATUTORY',
        valid_from: '2016-10-11',
        valid_to: null,
      });

      const res = await app.inject({
        method: 'GET',
        url: `/geo/features/mandals/${mockFeatureRow.id}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.geometry_id).toBe(mockFeatureRow.id);

      jest.spyOn(spatialRuntimeService, 'getFeatureDetail').mockResolvedValue(null);
      const res404 = await app.inject({
        method: 'GET',
        url: '/geo/features/mandals/NONEXISTENT',
      });
      expect(res404.statusCode).toBe(404);
    });
  });

  describe('Exhaustive Branch Coverage & Error Paths', () => {
    it('exercises encodeValue with number, null, and undefined properties, and MultiPolygon geometry', () => {
      const multiPolyGeom = {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [78.4, 17.3],
              [78.5, 17.3],
              [78.5, 17.4],
              [78.4, 17.4],
              [78.4, 17.3], // closed ring
            ],
            // degenerate ring with < 3 points
            [
              [78.4, 17.3],
              [78.5, 17.3],
            ],
          ],
        ],
      };

      const buf = encodeMVTLayer(
        'mandals',
        [
          {
            geometry: multiPolyGeom,
            properties: {
              strProp: 'hello',
              numProp: 12345,
              boolProp: true,
              nullProp: null,
              undefProp: undefined,
            },
          },
        ],
        10,
        500,
        500,
      );
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBeGreaterThan(0);
    });

    it('rejects unsupported regime with INVALID_REGIME', async () => {
      await expect(
        spatialRuntimeService.selectGenericSpatialFeatures({
          entityType: 'mandal',
          regime: 'unsupported_regime' as any,
        }),
      ).rejects.toThrow('INVALID_REGIME');
    });

    it('handles historical regime with asOf and version regime with versionId', async () => {
      const mockQuery: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        then: (resolve: any) =>
          Promise.resolve({ data: [mockFeatureRow], error: null }).then(resolve),
      };
      jest.spyOn(supabase, 'from').mockReturnValue(mockQuery);

      // Historical with asOf
      const histFeatures = await spatialRuntimeService.selectGenericSpatialFeatures({
        entityType: 'mandal',
        regime: 'historical',
        asOf: '2020-01-01',
      });
      expect(histFeatures.length).toBe(1);

      // Version with versionId
      const verFeatures = await spatialRuntimeService.selectGenericSpatialFeatures({
        entityType: 'mandal',
        regime: 'version',
        versionId: '01900000-0000-0000-0000-000000000088',
      });
      expect(verFeatures.length).toBe(1);
    });

    it('handles non-UUID id and tileBBox in selectGenericSpatialFeatures', async () => {
      const mockQuery: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        then: (resolve: any) =>
          Promise.resolve({ data: [mockFeatureRow], error: null }).then(resolve),
      };
      jest.spyOn(supabase, 'from').mockReturnValue(mockQuery);

      const features = await spatialRuntimeService.selectGenericSpatialFeatures({
        entityType: 'mandals',
        id: 'TS-MDL-5001',
        tileBBox: { minX: 78, minY: 17, maxX: 79, maxY: 18 },
        regime: 'current',
      });
      expect(features.length).toBe(1);
    });

    it('handles database error and empty data in selectGenericSpatialFeatures', async () => {
      const mockQueryErr: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        then: (resolve: any) =>
          Promise.resolve({ data: null, error: { message: 'DB crash' } }).then(resolve),
      };
      jest.spyOn(supabase, 'from').mockReturnValue(mockQueryErr);

      await expect(
        spatialRuntimeService.selectGenericSpatialFeatures({
          entityType: 'mandal',
          regime: 'current',
        }),
      ).rejects.toThrow('DATABASE_QUERY_ERROR');

      const mockQueryEmpty: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
      };
      jest.spyOn(supabase, 'from').mockReturnValue(mockQueryEmpty);

      const empty = await spatialRuntimeService.selectGenericSpatialFeatures({
        entityType: 'mandal',
        regime: 'current',
      });
      expect(empty).toEqual([]);
    });

    it('evaluates point queries with PostGIS rpc st_intersects (both match, non-match, and rpc error)', async () => {
      const mockQuery: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        then: (resolve: any) =>
          Promise.resolve({ data: [mockFeatureRow], error: null }).then(resolve),
      };
      jest.spyOn(supabase, 'from').mockReturnValue(mockQuery);

      // Match
      jest.spyOn(supabase, 'rpc').mockResolvedValueOnce({ data: true, error: null } as any);
      const matched = await spatialRuntimeService.selectGenericSpatialFeatures({
        entityType: 'mandal',
        point: { lng: 78.45, lat: 17.35 },
        regime: 'current',
      });
      expect(matched.length).toBe(1);

      // Non-match
      jest.spyOn(supabase, 'rpc').mockResolvedValueOnce({ data: false, error: null } as any);
      const nonMatched = await spatialRuntimeService.selectGenericSpatialFeatures({
        entityType: 'mandal',
        point: { lng: 78.45, lat: 17.35 },
        regime: 'current',
      });
      expect(nonMatched.length).toBe(0);

      // RPC error
      jest
        .spyOn(supabase, 'rpc')
        .mockResolvedValueOnce({ data: null, error: { message: 'RPC failure' } } as any);
      const rpcErrFeatures = await spatialRuntimeService.selectGenericSpatialFeatures({
        entityType: 'mandal',
        point: { lng: 78.45, lat: 17.35 },
        regime: 'current',
      });
      expect(rpcErrFeatures.length).toBe(0);
    });

    it('exercises getTile when genericFeatures is empty and with bypassAdapter', async () => {
      jest.spyOn(spatialRuntimeService, 'selectGenericSpatialFeatures').mockResolvedValueOnce([]);
      const tileEmpty = await spatialRuntimeService.getTile({
        layer: 'mandals',
        z: 0,
        x: 0,
        y: 0,
        regime: 'current',
      });
      expect(tileEmpty).toBeNull();

      jest.spyOn(spatialRuntimeService, 'selectGenericSpatialFeatures').mockResolvedValueOnce([
        {
          geometry: mockPolygonGeoJson,
          properties: {
            entity_id: null,
            version_id: 'v-1',
            geometry_id: 'g-1',
            source_feature_id: 'src-1',
            entity_type: 'mandal',
            status: 'DERIVED',
            is_current: true,
            temporal_classification: 'CURRENT_LEGAL',
            authority_classification: 'STATUTORY',
            valid_from: '2016-10-11',
            valid_to: null,
          },
        },
      ]);
      const tileBypass = await spatialRuntimeService.getTile({
        layer: 'mandals',
        z: 0,
        x: 0,
        y: 0,
        regime: 'current',
        bypassAdapter: true,
      });
      expect(tileBypass).not.toBeNull();
      expect(tileBypass?.features[0].entity_id).toBeNull();
    });

    it('exercises locatePoint invalid coordinates, empty features, and bypassAdapter', async () => {
      // Invalid lat/lng
      await expect(spatialRuntimeService.locatePoint({ lat: 100, lng: 78 })).rejects.toThrow(
        'INVALID_COORDINATES',
      );

      await expect(spatialRuntimeService.locatePoint({ lat: 17, lng: 200 })).rejects.toThrow(
        'INVALID_COORDINATES',
      );

      await expect(spatialRuntimeService.locatePoint({ lat: NaN, lng: 78 })).rejects.toThrow(
        'INVALID_COORDINATES',
      );

      // Empty features
      jest.spyOn(spatialRuntimeService, 'selectGenericSpatialFeatures').mockResolvedValueOnce([]);
      const notFound = await spatialRuntimeService.locatePoint({ lat: 17, lng: 78 });
      expect(notFound).toBeNull();

      // bypassAdapter = true
      jest.spyOn(spatialRuntimeService, 'selectGenericSpatialFeatures').mockResolvedValueOnce([
        {
          geometry: mockPolygonGeoJson,
          properties: {
            entity_id: null,
            version_id: 'v-1',
            geometry_id: 'g-1',
            source_feature_id: 'src-1',
            entity_type: 'mandal',
            status: 'DERIVED',
            is_current: true,
            temporal_classification: 'CURRENT_LEGAL',
            authority_classification: 'STATUTORY',
            valid_from: '2016-10-11',
            valid_to: null,
          },
        },
      ]);
      const bypassed = await spatialRuntimeService.locatePoint({
        lat: 17,
        lng: 78,
        bypassAdapter: true,
      });
      expect(bypassed?.entity_id).toBeNull();
    });

    it('exercises getFeatureDetail empty features and bypassAdapter', async () => {
      jest.spyOn(spatialRuntimeService, 'selectGenericSpatialFeatures').mockResolvedValueOnce([]);
      const notFound = await spatialRuntimeService.getFeatureDetail({ id: 'missing' });
      expect(notFound).toBeNull();

      jest.spyOn(spatialRuntimeService, 'selectGenericSpatialFeatures').mockResolvedValueOnce([
        {
          geometry: mockPolygonGeoJson,
          properties: {
            entity_id: null,
            version_id: 'v-1',
            geometry_id: 'g-1',
            source_feature_id: 'src-1',
            entity_type: 'mandal',
            status: 'DERIVED',
            is_current: true,
            temporal_classification: 'CURRENT_LEGAL',
            authority_classification: 'STATUTORY',
            valid_from: '2016-10-11',
            valid_to: null,
          },
        },
      ]);
      const bypassed = await spatialRuntimeService.getFeatureDetail({
        id: 'g-1',
        bypassAdapter: true,
      });
      expect(bypassed?.entity_id).toBeNull();
    });
  });
});
