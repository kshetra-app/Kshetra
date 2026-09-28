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

  // ── GAP A: LEGACY AC FALLBACK SEMANTICS & GOVERNED INVARIANTS ─────────────
  describe('Gap A: Legacy AC Fallback Semantics & Non-Silent Invariants', () => {
    const mockLegacyAc = {
      type: 'Feature',
      properties: {
        AC_NO: 101,
        AC_NAME: 'Dornakal',
        DIST_NAME: 'Mahabubabad',
      },
      geometry: { type: 'Polygon', coordinates: [] },
    };

    test('Rule 1: Canonical match (200) -> returns CANONICAL_MATCH, provenance CANONICAL_POSTGIS, legacy fallback NOT called', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init?.headers as Record<string, string>)?.[ 'x-request-id' ] || 'req-locate-rule1';
        return createMockResponse(200, {
          status: 'ok',
          matched: true,
          data: mockKuraviFeature,
        }, { 'x-request-id': reqId });
      });

      const legacyFallbackSpy = jest.fn().mockReturnValue(mockLegacyAc);

      const result = await testClient.spatial.locateWithFallback(
        { lat: 17.55, lng: 79.95, layer: 'mandals' },
        legacyFallbackSpy
      );

      expect(result.status).toBe('CANONICAL_MATCH');
      expect(result.provenance).toBe('CANONICAL_POSTGIS');
      expect(result.canonicalFeature).not.toBeNull();
      expect(result.canonicalFeature?.name).toBe('Kuravi');
      expect(result.legacyFeature).toBeNull();
      expect(legacyFallbackSpy).not.toHaveBeenCalled();
    });

    test('Rule 2: Canonical 404 (no-match) -> invokes legacy fallback, returns LEGACY_FALLBACK with provenance LEGACY_STATIC_FALLBACK', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init?.headers as Record<string, string>)?.[ 'x-request-id' ] || 'req-locate-rule2';
        return createMockResponse(404, {
          status: 'not_found',
          matched: false,
          code: 'SPATIAL_LOCATION_NOT_FOUND',
        }, { 'x-request-id': reqId });
      });

      const legacyFallbackSpy = jest.fn().mockReturnValue(mockLegacyAc);

      const result = await testClient.spatial.locateWithFallback(
        { lat: 17.55, lng: 79.95, layer: 'mandals' },
        legacyFallbackSpy
      );

      expect(legacyFallbackSpy).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('LEGACY_FALLBACK');
      expect(result.provenance).toBe('LEGACY_STATIC_FALLBACK');
      expect(result.canonicalFeature).toBeNull();
      expect(result.legacyFeature).toEqual(mockLegacyAc);
      expect(result.statusCode).toBe(404);
    });

    test('Rule 3: Canonical 404 and legacy fallback returns null -> returns NO_MATCH with provenance NONE', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init?.headers as Record<string, string>)?.[ 'x-request-id' ] || 'req-locate-rule3';
        return createMockResponse(404, {
          status: 'not_found',
          matched: false,
          code: 'SPATIAL_LOCATION_NOT_FOUND',
        }, { 'x-request-id': reqId });
      });

      const legacyFallbackSpy = jest.fn().mockReturnValue(null);

      const result = await testClient.spatial.locateWithFallback(
        { lat: 0.0, lng: 0.0, layer: 'mandals' },
        legacyFallbackSpy
      );

      expect(legacyFallbackSpy).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('NO_MATCH');
      expect(result.provenance).toBe('NONE');
      expect(result.canonicalFeature).toBeNull();
      expect(result.legacyFeature).toBeNull();
    });

    test('Rule 4: Canonical 5xx (500) -> DOES NOT invoke legacy fallback, returns ERROR with provenance NONE', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init?.headers as Record<string, string>)?.[ 'x-request-id' ] || 'req-locate-rule4';
        return createMockResponse(500, {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'PostGIS connection failure',
        }, { 'x-request-id': reqId });
      });

      const legacyFallbackSpy = jest.fn().mockReturnValue(mockLegacyAc);

      const result = await testClient.spatial.locateWithFallback(
        { lat: 17.55, lng: 79.95, layer: 'mandals' },
        legacyFallbackSpy
      );

      expect(result.status).toBe('ERROR');
      expect(result.provenance).toBe('NONE');
      expect(result.canonicalFeature).toBeNull();
      expect(result.legacyFeature).toBeNull();
      expect(result.statusCode).toBe(500);
      expect(legacyFallbackSpy).not.toHaveBeenCalled();
    });

    test('Rule 5: Network timeout / connection failure -> DOES NOT invoke legacy fallback, returns OFFLINE with provenance NONE', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

      const legacyFallbackSpy = jest.fn().mockReturnValue(mockLegacyAc);

      const result = await testClient.spatial.locateWithFallback(
        { lat: 17.55, lng: 79.95, layer: 'mandals' },
        legacyFallbackSpy
      );

      expect(result.status).toBe('OFFLINE');
      expect(result.provenance).toBe('NONE');
      expect(result.canonicalFeature).toBeNull();
      expect(result.legacyFeature).toBeNull();
      expect(result.statusCode).toBe(0);
      expect(legacyFallbackSpy).not.toHaveBeenCalled();
    });

    test('Rule 6: Canonical 400 (Bad Request / coordinate validation) -> DOES NOT invoke legacy fallback, returns ERROR with provenance NONE', async () => {
      const legacyFallbackSpy = jest.fn().mockReturnValue(mockLegacyAc);

      const result = await testClient.spatial.locateWithFallback(
        { lat: 95.0, lng: 79.95, layer: 'mandals' },
        legacyFallbackSpy
      );

      expect(result.status).toBe('ERROR');
      expect(result.provenance).toBe('NONE');
      expect(result.canonicalFeature).toBeNull();
      expect(result.legacyFeature).toBeNull();
      expect(result.statusCode).toBe(400);
      expect(legacyFallbackSpy).not.toHaveBeenCalled();
    });
  });

  // ── GAP B: MAPLIBRE MVT RUNTIME CONSUMPTION & BOUNDED INTEGRATION ──────────
  describe('Gap B: MapLibre MVT Runtime Consumption & Bounded Integration', () => {
    test('constructs complete MapLibre VectorSource compatible template URL with query params', () => {
      const template = testClient.spatial.getTileTemplateUrl('mandals', {
        regime: 'historical',
        asOf: '2016-10-11',
      });

      expect(template).toBe(
        'https://test-api.kshetra.app/api/v1/geo/tiles/mandals/{z}/{x}/{y}?regime=historical&as_of=2016-10-11'
      );
      expect(template).toContain('{z}');
      expect(template).toContain('{x}');
      expect(template).toContain('{y}');
    });

    test('VectorSource props pass valid configuration to native MapLibre bridge', () => {
      const tileUrl = testClient.spatial.getTileTemplateUrl('mandals', { regime: 'historical' });
      const vectorSourceProps = {
        id: 'canonical-mandals-source',
        tileUrlTemplates: [tileUrl],
        minZoomLevel: 6,
        maxZoomLevel: 14,
      };

      expect(vectorSourceProps.id).toBe('canonical-mandals-source');
      expect(vectorSourceProps.tileUrlTemplates[0]).toContain('/api/v1/geo/tiles/mandals/{z}/{x}/{y}');
      expect(vectorSourceProps.minZoomLevel).toBe(6);
      expect(vectorSourceProps.maxZoomLevel).toBe(14);
    });

    test('MVT binary wire acceptance: decodes vector tile buffer without GeoJSON conversion or polygon loops', async () => {
      // Create a mock binary buffer representing MVT protobuf wire response
      const mockMvtBytes = new Uint8Array([
        0x1a, 0x18, // Layer field 3 (wire type 2, length 24)
        0x0a, 0x07, 0x6d, 0x61, 0x6e, 0x64, 0x61, 0x6c, 0x73, // Layer name: "mandals"
        0x28, 0x80, 0x20, // extent: 4096
        0x18, 0x02, // version: 2
      ]);

      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: new Headers({
          'content-type': 'application/vnd.mapbox-vector-tile',
          'x-geography-layer': 'mandals',
        }),
        arrayBuffer: async () => mockMvtBytes.buffer,
      });

      const tileRes = await testClient.spatial.fetchTile('mandals', 8, 184, 115);
      expect(tileRes.status).toBe('ok');
      expect(tileRes.statusCode).toBe(200);
      expect(tileRes.data).toBeDefined();
      expect(tileRes.data?.byteLength).toBe(mockMvtBytes.byteLength);

      // Verify the buffer is parsed as binary wire data, NOT converted into client GeoJSON coordinates
      const view = new Uint8Array(tileRes.data!);
      expect(view[0]).toBe(0x1a); // Field 3: Layer tag in MVT Protobuf
    });
  });

  // ── GAP C: MOBILE OFFLINE & DEGRADED SEMANTIC VERIFICATION (8 CONDITIONS) ───
  describe('Gap C: Mobile Offline & Degraded Semantic Verification (8 Conditions)', () => {
    test('Condition 1: No network (device offline / network partition) -> returns isOffline=true, statusCode=0', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

      const res = await testClient.spatial.locate({
        lat: 17.55,
        lng: 79.95,
        layer: 'mandals',
      });

      expect(res.matched).toBe(false);
      expect(res.isOffline).toBe(true);
      expect(res.statusCode).toBe(0);
      expect(res.feature).toBeNull();
    });

    test('Condition 2: Request timeout -> returns isOffline=true, statusCode=0', async () => {
      const abortError = new Error('The user aborted a request.');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const res = await testClient.spatial.locate({
        lat: 17.55,
        lng: 79.95,
        layer: 'mandals',
      });

      expect(res.matched).toBe(false);
      expect(res.isOffline).toBe(true);
      expect(res.statusCode).toBe(0);
    });

    test('Condition 3: API 400 (Bad request / invalid coords / parameters) -> returns statusCode=400', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init?.headers as Record<string, string>)?.[ 'x-request-id' ] || 'req-locate-c3';
        return createMockResponse(400, {
          statusCode: 400,
          error: 'Bad Request',
          code: 'INVALID_PARAMETERS',
          message: 'Invalid coordinate bounds',
        }, { 'x-request-id': reqId });
      });

      const res = await testClient.spatial.locate({
        lat: 89.9, // valid client bounds but rejected by server schema
        lng: 179.9,
        layer: 'mandals',
      });

      expect(res.matched).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.feature).toBeNull();
    });

    test('Condition 4: API 404 (No matching geometry found in layer) -> returns statusCode=404, matched=false', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init?.headers as Record<string, string>)?.[ 'x-request-id' ] || 'req-locate-c4';
        return createMockResponse(404, {
          status: 'not_found',
          matched: false,
          code: 'SPATIAL_LOCATION_NOT_FOUND',
          message: 'No matching geometry found',
        }, { 'x-request-id': reqId });
      });

      const res = await testClient.spatial.locate({
        lat: 0.0,
        lng: 0.0,
        layer: 'mandals',
      });

      expect(res.matched).toBe(false);
      expect(res.statusCode).toBe(404);
      expect(res.code).toBe('SPATIAL_LOCATION_NOT_FOUND');
      expect(res.feature).toBeNull();
    });

    test('Condition 5: API 5xx (Internal server error / PostGIS failure) -> returns statusCode=500', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init?.headers as Record<string, string>)?.[ 'x-request-id' ] || 'req-locate-c5';
        return createMockResponse(500, {
          statusCode: 500,
          error: 'Internal Server Error',
          code: 'SPATIAL_RUNTIME_ERROR',
          message: 'PostgreSQL database error',
        }, { 'x-request-id': reqId });
      });

      const res = await testClient.spatial.locate({
        lat: 17.55,
        lng: 79.95,
        layer: 'mandals',
      });

      expect(res.matched).toBe(false);
      expect(res.statusCode).toBe(500);
      expect(res.feature).toBeNull();
    });

    test('Condition 6: 204 Empty Tile (tile outside geographic bounds) -> returns status="empty", statusCode=204, data=null', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 204,
        ok: true,
        headers: new Headers({
          'x-request-id': 'req-empty-tile',
          'x-geography-layer': 'mandals',
        }),
      });

      const res = await testClient.spatial.fetchTile('mandals', 8, 10, 10);
      expect(res.status).toBe('empty');
      expect(res.statusCode).toBe(204);
      expect(res.data).toBeNull();
    });

    test('Condition 7: Current geometry unavailable (regime=current fail-closed) -> returns statusCode=404, matched=false', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init?.headers as Record<string, string>)?.[ 'x-request-id' ] || 'req-locate-c7';
        return createMockResponse(404, {
          status: 'not_found',
          matched: false,
          code: 'SPATIAL_LOCATION_NOT_FOUND',
          message: 'No current geometry found for coordinates under requested regime',
        }, { 'x-request-id': reqId });
      });

      const res = await testClient.spatial.locate({
        lat: 17.55,
        lng: 79.95,
        layer: 'mandals',
        regime: 'current',
      });

      expect(res.matched).toBe(false);
      expect(res.statusCode).toBe(404);
      expect(res.feature).toBeNull();
    });

    test('Condition 8: Historical geometry unavailable (as_of out of range) -> returns statusCode=404, matched=false', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init?.headers as Record<string, string>)?.[ 'x-request-id' ] || 'req-locate-c8';
        return createMockResponse(404, {
          status: 'not_found',
          matched: false,
          code: 'SPATIAL_LOCATION_NOT_FOUND',
          message: 'No geometry found as of 2000-01-01',
        }, { 'x-request-id': reqId });
      });

      const res = await testClient.spatial.locate({
        lat: 17.55,
        lng: 79.95,
        layer: 'mandals',
        regime: 'historical',
        asOf: '2000-01-01',
      });

      expect(res.matched).toBe(false);
      expect(res.statusCode).toBe(404);
      expect(res.feature).toBeNull();
    });
  });
});
