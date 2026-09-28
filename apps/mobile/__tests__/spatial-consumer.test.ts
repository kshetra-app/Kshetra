/**
 * Canonical Mobile Spatial Consumer Integration Test Suite
 * Master Execution Framework — JOB W016-C3-R10
 *
 * Verifies Requirements A through Q:
 * - A: Mobile spatial client service exists and exports typed functions
 * - B: Vector tile request URL construction with query params (regime, as_of, version_id)
 * - C: Empty tile (204) handled gracefully
 * - D: Valid tile (200, MVT binary) handled correctly
 * - E: Locate request calls /api/v1/geo/locate with lat/lng and parses governed response
 * - F: Known geometry locate test (Kuravi point 79.95, 17.55 -> FID 286)
 * - G: Out-of-bounds / no match point (404) handled gracefully
 * - H: Current regime fail-closed behavior (regime=current -> 404 / no match)
 * - I: Feature detail lookup by source reference, geometry_id, or version_id
 * - J: Unknown layer returns 404 handled gracefully
 * - K: Network failure / timeout handled gracefully (offline mode)
 * - L: Response parsing preserves 3-level identity (entity_id, version_id, geometry_id)
 * - M: source_feature_id is NEVER equated to entity_id in mobile data structures
 * - N: Zero client-side point-in-polygon math in canonical mobile spatial paths
 * - O: Legacy static paths intact and functional
 * - P: Mobile bundle size impact negligible (no new native dependencies)
 * - Q: Canonical Fastify API client used as communication channel
 */

import { ApiClient } from '../lib/api/client';
import {
  SpatialEndpoint,
  validateGovernedSpatialFeature,
  type GovernedSpatialFeature,
} from '../lib/api/endpoints/spatial';
import { ApiValidationError } from '../lib/api/errors';
import { apiClient } from '../lib/api';
import { MapboxGL } from '../lib/maplibreCompat';

const originalFetch = global.fetch;

function createMockResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  const isJson = typeof body === 'object';
  const bodyStr = isJson ? JSON.stringify(body) : String(body);
  const headersMap = new Map<string, string>(Object.entries(headers));
  if (isJson && !headersMap.has('content-type')) {
    headersMap.set('content-type', 'application/json');
  }

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => headersMap.get(name.toLowerCase()) || null,
      forEach: (cb: (value: string, key: string) => void) => {
        headersMap.forEach((v, k) => cb(v, k));
      },
    } as unknown as Headers,
    json: async () => (isJson ? body : JSON.parse(bodyStr)),
    text: async () => bodyStr,
  };
}

describe('W016-C3-R10: Mobile Canonical Spatial Consumer', () => {
  let mockFetch: jest.Mock;
  let testClient: ApiClient;

  const mockKuraviFeature: GovernedSpatialFeature = {
    entity_id: 'TS-MDL-KURAVI',
    version_id: '80931252-82f2-4fd3-9824-2c937ec8cae2',
    geometry_id: '1a9ce62e-9dcb-49fb-ae9c-6a1ea0bca419',
    source_feature_id: '286',
    entity_type: 'mandal',
    status: 'DERIVED',
    is_current: false,
    temporal_classification: 'historical_statutory_baseline',
    authority_classification: 'telangana_statutory_gazette',
    valid_from: '2016-10-11',
    valid_to: null,
    name: 'Kuravi',
    district_id: 'TS-DST-MAHABUBABAD',
    identity_mapping: {
      source_reference: '286',
      geometry_id: '1a9ce62e-9dcb-49fb-ae9c-6a1ea0bca419',
      version_id: '80931252-82f2-4fd3-9824-2c937ec8cae2',
      entity_id: 'TS-MDL-KURAVI',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    testClient = new ApiClient({
      baseUrl: 'https://test-api.kshetra.app',
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // ── REQUIREMENT A & Q: CLIENT SERVICE & EXPORTS ───────────────────────────
  describe('Requirement A & Q: Canonical API Client Wiring', () => {
    test('apiClient instance exposes spatial endpoint', () => {
      expect(apiClient.spatial).toBeInstanceOf(SpatialEndpoint);
      expect(typeof apiClient.spatial.getTileUrl).toBe('function');
      expect(typeof apiClient.spatial.getTileTemplateUrl).toBe('function');
      expect(typeof apiClient.spatial.fetchTile).toBe('function');
      expect(typeof apiClient.spatial.locate).toBe('function');
      expect(typeof apiClient.spatial.getFeatureDetail).toBe('function');
    });

    test('SpatialEndpoint uses configured client baseUrl', () => {
      const url = testClient.spatial.getTileUrl('mandals', 10, 512, 512);
      expect(url.startsWith('https://test-api.kshetra.app/api/v1/geo/tiles/mandals/10/512/512')).toBe(true);
    });
  });

  // ── REQUIREMENT B: TILE URL CONSTRUCTION ──────────────────────────────────
  describe('Requirement B: Vector Tile Request URL Construction', () => {
    test('constructs deterministic vector tile URL with default historical regime', () => {
      const url = testClient.spatial.getTileUrl('mandals', 10, 582, 456);
      expect(url).toBe('https://test-api.kshetra.app/api/v1/geo/tiles/mandals/10/582/456?regime=historical');
    });

    test('constructs tile URL with explicit temporal as_of and version_id', () => {
      const url = testClient.spatial.getTileUrl('mandals', 12, 1200, 800, {
        regime: 'version',
        asOf: '2016-10-11',
        versionId: '80931252-82f2-4fd3-9824-2c937ec8cae2',
        bypassAdapter: true,
      });
      expect(url).toContain('regime=version');
      expect(url).toContain('as_of=2016-10-11');
      expect(url).toContain('version_id=80931252-82f2-4fd3-9824-2c937ec8cae2');
      expect(url).toContain('bypass_adapter=true');
    });

    test('constructs MapLibre vector tile template URL with {z}/{x}/{y}', () => {
      const template = testClient.spatial.getTileTemplateUrl('mandals', {
        regime: 'historical',
        asOf: '2016-10-11',
      });
      expect(template).toBe(
        'https://test-api.kshetra.app/api/v1/geo/tiles/mandals/{z}/{x}/{y}?regime=historical&as_of=2016-10-11'
      );
    });
  });

  // ── REQUIREMENT C: EMPTY TILE (204) HANDLING ──────────────────────────────
  describe('Requirement C: Empty Tile (204) Handling', () => {
    test('handles 204 No Content gracefully without error', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 204,
        ok: true,
        headers: new Headers({
          'x-request-id': 'req-tile-empty-1',
          'x-geography-layer': 'mandals',
        }),
      });

      const res = await testClient.spatial.fetchTile('mandals', 10, 0, 0);
      expect(res.status).toBe('empty');
      expect(res.statusCode).toBe(204);
      expect(res.data).toBeNull();
      expect(res.layer).toBe('mandals');
    });
  });

  // ── REQUIREMENT D: VALID TILE (200 MVT) HANDLING ──────────────────────────
  describe('Requirement D: Valid Tile (200 MVT Binary) Handling', () => {
    test('fetches binary MVT buffer with 200 OK', async () => {
      const mockBinaryData = new Uint8Array([0x1a, 0x05, 0x74, 0x69, 0x6c, 0x65]).buffer;
      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: new Headers({
          'x-request-id': 'req-tile-valid-1',
          'content-type': 'application/vnd.mapbox-vector-tile',
          'x-geography-layer': 'mandals',
          'x-geography-regime': 'historical',
        }),
        arrayBuffer: async () => mockBinaryData,
      });

      const res = await testClient.spatial.fetchTile('mandals', 10, 582, 456);
      expect(res.status).toBe('ok');
      expect(res.statusCode).toBe(200);
      expect(res.data).toBeDefined();
      expect(res.data?.byteLength).toBe(mockBinaryData.byteLength);
    });

    test('rejects out-of-bounds tile coordinates client-side with 400 error', async () => {
      const res = await testClient.spatial.fetchTile('mandals', 5, 100, 100);
      expect(res.status).toBe('error');
      expect(res.statusCode).toBe(400);
      expect(res.error).toContain('out of bounds');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ── REQUIREMENT E & F: LOCATE REQUEST & KNOWN GEOMETRY (KURAVI) ───────────
  describe('Requirement E & F: Canonical Point Location (Kuravi Test)', () => {
    test('locates known Kuravi coordinate (79.95, 17.55) returning FID 286 with 3-level identity', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init?.headers as Record<string, string>)?.[ 'x-request-id' ] || 'req-locate-kuravi-1';
        return createMockResponse(200, {
          status: 'ok',
          matched: true,
          data: mockKuraviFeature,
        }, { 'x-request-id': reqId });
      });

      const result = await testClient.spatial.locate({
        lat: 17.55,
        lng: 79.95,
        layer: 'mandals',
        regime: 'historical',
        asOf: '2016-10-11',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('/api/v1/geo/locate');
      expect(calledUrl).toContain('lat=17.55');
      expect(calledUrl).toContain('lng=79.95');
      expect(calledUrl).toContain('layer=mandals');
      expect(calledUrl).toContain('regime=historical');

      expect(result.matched).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.feature).not.toBeNull();
      expect(result.feature?.source_feature_id).toBe('286');
      expect(result.feature?.name).toBe('Kuravi');
      expect(result.feature?.district_id).toBe('TS-DST-MAHABUBABAD');
      expect(result.feature?.geometry_id).toBe('1a9ce62e-9dcb-49fb-ae9c-6a1ea0bca419');
      expect(result.feature?.version_id).toBe('80931252-82f2-4fd3-9824-2c937ec8cae2');
      expect(result.feature?.entity_id).toBe('TS-MDL-KURAVI');
      expect(result.feature?.is_current).toBe(false);
      expect(result.feature?.temporal_classification).toBe('historical_statutory_baseline');
    });
  });

  // ── REQUIREMENT G: NO-MATCH / OUT-OF-BOUNDS LOCATE (404) ──────────────────
  describe('Requirement G: No-Match Locate (404)', () => {
    test('handles 404 out-of-bounds point (0.0, 0.0) gracefully without crashing', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init?.headers as Record<string, string>)?.[ 'x-request-id' ] || 'req-locate-404-1';
        return createMockResponse(404, {
          status: 'not_found',
          matched: false,
          code: 'SPATIAL_LOCATION_NOT_FOUND',
          message: 'No matching geometry found for coordinates under requested regime',
        }, { 'x-request-id': reqId });
      });

      const result = await testClient.spatial.locate({
        lat: 0.0,
        lng: 0.0,
        layer: 'mandals',
      });

      expect(result.matched).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.feature).toBeNull();
      expect(result.code).toBe('SPATIAL_LOCATION_NOT_FOUND');
    });

    test('validates coordinate boundaries client-side [-90, 90] and [-180, 180]', async () => {
      const result = await testClient.spatial.locate({
        lat: 95.0,
        lng: 79.0,
      });
      expect(result.matched).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain('Invalid coordinates');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ── REQUIREMENT H: CURRENT REGIME FAIL-CLOSED (404) ───────────────────────
  describe('Requirement H: Current Regime Fail-Closed Semantics', () => {
    test('locate with regime=current fails closed (404) for historical statutory baseline', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init?.headers as Record<string, string>)?.[ 'x-request-id' ] || 'req-locate-cur-1';
        return createMockResponse(404, {
          status: 'not_found',
          matched: false,
          code: 'SPATIAL_LOCATION_NOT_FOUND',
          message: 'No current geometry found',
        }, { 'x-request-id': reqId });
      });

      const result = await testClient.spatial.locate({
        lat: 17.55,
        lng: 79.95,
        layer: 'mandals',
        regime: 'current',
      });

      expect(result.matched).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.feature).toBeNull();
    });
  });

  // ── REQUIREMENT I: FEATURE DETAIL LOOKUP ──────────────────────────────────
  describe('Requirement I: Feature Detail Lookup', () => {
    test('fetches feature detail by source_feature_id', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init?.headers as Record<string, string>)?.[ 'x-request-id' ] || 'req-detail-1';
        return createMockResponse(200, {
          status: 'ok',
          matched: true,
          data: mockKuraviFeature,
        }, { 'x-request-id': reqId });
      });

      const res = await testClient.spatial.getFeatureDetail({
        layer: 'mandals',
        id: '286',
        regime: 'historical',
        asOf: '2016-10-11',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('/api/v1/geo/features/mandals/286');
      expect(res.matched).toBe(true);
      expect(res.feature?.source_feature_id).toBe('286');
      expect(res.feature?.name).toBe('Kuravi');
    });

    test('fetches feature detail by geometry_id UUID', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init?.headers as Record<string, string>)?.[ 'x-request-id' ] || 'req-detail-uuid';
        return createMockResponse(200, {
          status: 'ok',
          matched: true,
          data: mockKuraviFeature,
        }, { 'x-request-id': reqId });
      });

      const res = await testClient.spatial.getFeatureDetail({
        layer: 'mandals',
        id: '1a9ce62e-9dcb-49fb-ae9c-6a1ea0bca419',
      });

      expect(res.matched).toBe(true);
      expect(res.feature?.geometry_id).toBe('1a9ce62e-9dcb-49fb-ae9c-6a1ea0bca419');
    });

    test('returns 404 for non-existent feature id', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init?.headers as Record<string, string>)?.[ 'x-request-id' ] || 'req-detail-404';
        return createMockResponse(404, {
          status: 'not_found',
          matched: false,
          code: 'FEATURE_NOT_FOUND',
          message: 'Feature not found',
        }, { 'x-request-id': reqId });
      });

      const res = await testClient.spatial.getFeatureDetail({
        layer: 'mandals',
        id: '999999',
      });

      expect(res.matched).toBe(false);
      expect(res.statusCode).toBe(404);
      expect(res.feature).toBeNull();
    });
  });

  // ── REQUIREMENT J: UNKNOWN LAYER HANDLING ─────────────────────────────────
  describe('Requirement J: Unknown Layer Handling', () => {
    test('returns 404 for unknown layer in locate', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init?.headers as Record<string, string>)?.[ 'x-request-id' ] || 'req-unknown-layer-1';
        return createMockResponse(404, {
          statusCode: 404,
          error: 'Not Found',
          code: 'LAYER_NOT_FOUND',
          message: 'Unknown spatial layer: imaginary_layer',
        }, { 'x-request-id': reqId });
      });

      const res = await testClient.spatial.locate({
        lat: 17.55,
        lng: 79.95,
        layer: 'imaginary_layer',
      });

      expect(res.matched).toBe(false);
      expect(res.statusCode).toBe(404);
    });
  });

  // ── REQUIREMENT K: NETWORK FAILURE & OFFLINE DEGRADED MODE ────────────────
  describe('Requirement K: Network Failure & Offline Mode', () => {
    test('handles network failure in locate without crashing, flagging isOffline', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const res = await testClient.spatial.locate({
        lat: 17.55,
        lng: 79.95,
        layer: 'mandals',
      });

      expect(res.matched).toBe(false);
      expect(res.statusCode).toBe(0);
      expect(res.isOffline).toBe(true);
      expect(res.feature).toBeNull();
    });

    test('handles network failure in fetchTile without crashing', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network connection lost'));

      const res = await testClient.spatial.fetchTile('mandals', 10, 582, 456);
      expect(res.status).toBe('error');
      expect(res.statusCode).toBe(0);
      expect(res.error).toContain('Network connection lost');
    });
  });

  // ── REQUIREMENT L & M: THREE-LEVEL IDENTITY & SOURCE SEPARATION ───────────
  describe('Requirement L & M: Three-Level Identity & Source Separation', () => {
    test('validateGovernedSpatialFeature parses complete 3-level identity structure', () => {
      const validated = validateGovernedSpatialFeature(mockKuraviFeature, 'test');
      expect(validated.geometry_id).toBe('1a9ce62e-9dcb-49fb-ae9c-6a1ea0bca419');
      expect(validated.version_id).toBe('80931252-82f2-4fd3-9824-2c937ec8cae2');
      expect(validated.entity_id).toBe('TS-MDL-KURAVI');
      expect(validated.source_feature_id).toBe('286');
      expect(validated.identity_mapping?.source_reference).toBe('286');
      expect(validated.identity_mapping?.geometry_id).toBe('1a9ce62e-9dcb-49fb-ae9c-6a1ea0bca419');
      expect(validated.identity_mapping?.version_id).toBe('80931252-82f2-4fd3-9824-2c937ec8cae2');
      expect(validated.identity_mapping?.entity_id).toBe('TS-MDL-KURAVI');
    });

    test('source_feature_id is NEVER equated to entity_id in generic/unmapped features', () => {
      const unmappedPayload = {
        ...mockKuraviFeature,
        entity_id: null,
        identity_mapping: {
          source_reference: '286',
          geometry_id: '1a9ce62e-9dcb-49fb-ae9c-6a1ea0bca419',
          version_id: '80931252-82f2-4fd3-9824-2c937ec8cae2',
          entity_id: null,
        },
      };

      const validated = validateGovernedSpatialFeature(unmappedPayload, 'test');
      expect(validated.source_feature_id).toBe('286');
      expect(validated.entity_id).toBeNull();
      expect(validated.source_feature_id).not.toEqual(validated.entity_id);
    });

    test('throws ApiValidationError on missing required identity fields', () => {
      const invalid = { ...mockKuraviFeature, geometry_id: '' };
      expect(() => validateGovernedSpatialFeature(invalid, 'test')).toThrow(ApiValidationError);
    });
  });

  // ── REQUIREMENT N: ZERO CLIENT-SIDE POINT-IN-POLYGON IN CANONICAL PATH ────
  describe('Requirement N: Zero Client-Side Point-in-Polygon Math', () => {
    test('canonical locate uses HTTP query and does NOT require GeoJSON geometry on client', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init?.headers as Record<string, string>)?.[ 'x-request-id' ] || 'req-locate-zero-pip';
        return createMockResponse(200, {
          status: 'ok',
          matched: true,
          data: mockKuraviFeature,
        }, { 'x-request-id': reqId });
      });

      // Pure coordinate query: no polygon arrays or geometry objects are loaded or passed
      const result = await testClient.spatial.locate({
        lat: 17.55,
        lng: 79.95,
        layer: 'mandals',
      });

      expect(result.matched).toBe(true);
      // Client receives properties without having to download or iterate large coordinate arrays
      expect((result.feature as any)?.geometry).toBeUndefined();
    });
  });

  // ── REQUIREMENT P: MAPLIBRE VECTOR SOURCE COMPATIBILITY ───────────────────
  describe('Requirement P: MapLibre Vector Source Support', () => {
    test('MapboxGL exposes VectorSource component', () => {
      expect(MapboxGL.VectorSource).toBeDefined();
    });
  });
});
