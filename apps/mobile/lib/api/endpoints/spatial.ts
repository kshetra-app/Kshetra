/**
 * Canonical Spatial API Endpoint
 * Master Execution Framework — JOB W016-C3-R10
 *
 * Implements the mobile consumer read path for canonical PostGIS geometry:
 * - Deterministic vector-tile URL and template generation
 * - Programmatic vector-tile fetching (with 204 empty-tile handling)
 * - Remote point-in-polygon locate (/api/v1/geo/locate) eliminating client polygon loops
 * - Canonical feature detail (/api/v1/geo/features/:layer/:id)
 * - Three-level identity preservation (entity_id, version_id, geometry_id)
 * - Explicit fail-safe offline / degraded mode classification
 */

import type { ApiClient } from '../client';
import { ApiError, ApiNetworkError, ApiTimeoutError, ApiValidationError } from '../errors';
import { telemetry } from '../../telemetry';

export type SpatialRegime = 'current' | 'historical' | 'version';

export interface SpatialIdentityMapping {
  source_reference: string;
  geometry_id: string;
  version_id: string;
  entity_id: string | null;
}

export interface GovernedSpatialFeature {
  entity_id: string | null; // Level 1: Stable Geographic Entity Identity (null if unmapped/generic)
  version_id: string; // Level 2: Temporal Version Identity (UUID)
  geometry_id: string; // Level 3: Physical Geometry Row Identity (UUID)
  source_feature_id: string; // Source-Artifact Lookup Reference (NEVER authoritative identity)
  entity_type: string;
  status: string;
  is_current: boolean;
  temporal_classification: string;
  authority_classification: string;
  valid_from: string;
  valid_to: string | null;
  name?: string;
  district_id?: string;
  identity_mapping?: SpatialIdentityMapping;
}

export interface LocateRequestParams {
  lat: number;
  lng: number;
  layer?: string;
  regime?: SpatialRegime;
  asOf?: string;
  versionId?: string;
  bypassAdapter?: boolean;
}

export interface LocateResult {
  matched: boolean;
  feature: GovernedSpatialFeature | null;
  statusCode: number;
  code?: string;
  error?: string;
  isOffline?: boolean;
}

export interface FeatureDetailParams {
  layer: string;
  id: string;
  regime?: SpatialRegime;
  asOf?: string;
  bypassAdapter?: boolean;
}

export interface FeatureDetailResult {
  matched: boolean;
  feature: GovernedSpatialFeature | null;
  statusCode: number;
  code?: string;
  error?: string;
  isOffline?: boolean;
}

export interface TileUrlOptions {
  regime?: SpatialRegime;
  asOf?: string;
  versionId?: string;
  bypassAdapter?: boolean;
}

export interface TileFetchResult {
  status: 'ok' | 'empty' | 'error';
  statusCode: number;
  data?: ArrayBuffer | null;
  layer?: string;
  regime?: string;
  error?: string;
}

export function validateGovernedSpatialFeature(data: unknown, context: string): GovernedSpatialFeature {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ApiValidationError(`Invalid spatial feature at ${context}: expected object`);
  }
  const f = data as Record<string, unknown>;

  if (typeof f.geometry_id !== 'string' || !f.geometry_id.trim()) {
    throw new ApiValidationError(`Invalid spatial feature at ${context}: missing geometry_id`);
  }
  if (typeof f.version_id !== 'string' || !f.version_id.trim()) {
    throw new ApiValidationError(`Invalid spatial feature at ${context}: missing version_id`);
  }
  if (f.source_feature_id === undefined || f.source_feature_id === null || String(f.source_feature_id).trim() === '') {
    throw new ApiValidationError(`Invalid spatial feature at ${context}: missing source_feature_id`);
  }
  if (typeof f.entity_type !== 'string' || !f.entity_type.trim()) {
    throw new ApiValidationError(`Invalid spatial feature at ${context}: missing entity_type`);
  }
  if (typeof f.status !== 'string') {
    throw new ApiValidationError(`Invalid spatial feature at ${context}: missing status`);
  }
  if (typeof f.is_current !== 'boolean') {
    throw new ApiValidationError(`Invalid spatial feature at ${context}: is_current must be boolean`);
  }

  // Identity Invariant: entity_id is Level 1, source_feature_id is source-artifact reference.
  // source_feature_id is NEVER blindly equated to entity_id.
  const entity_id = typeof f.entity_id === 'string' && f.entity_id.trim() ? f.entity_id : null;
  const source_feature_id = String(f.source_feature_id);

  let identity_mapping: SpatialIdentityMapping | undefined = undefined;
  if (f.identity_mapping && typeof f.identity_mapping === 'object' && !Array.isArray(f.identity_mapping)) {
    const im = f.identity_mapping as Record<string, unknown>;
    identity_mapping = {
      source_reference: String(im.source_reference ?? source_feature_id),
      geometry_id: String(im.geometry_id ?? f.geometry_id),
      version_id: String(im.version_id ?? f.version_id),
      entity_id: typeof im.entity_id === 'string' && im.entity_id.trim() ? im.entity_id : null,
    };
  }

  return {
    entity_id,
    version_id: f.version_id,
    geometry_id: f.geometry_id,
    source_feature_id,
    entity_type: f.entity_type,
    status: f.status,
    is_current: f.is_current,
    temporal_classification: String(f.temporal_classification ?? ''),
    authority_classification: String(f.authority_classification ?? ''),
    valid_from: String(f.valid_from ?? ''),
    valid_to: f.valid_to ? String(f.valid_to) : null,
    name: typeof f.name === 'string' ? f.name : undefined,
    district_id: typeof f.district_id === 'string' ? f.district_id : undefined,
    identity_mapping,
  };
}

export class SpatialEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * Generates a fully-qualified canonical vector-tile URL for a specific tile coordinate.
   */
  getTileUrl(layer: string, z: number, x: number, y: number, options: TileUrlOptions = {}): string {
    const { regime = 'historical', asOf, versionId, bypassAdapter } = options;
    const base = `${this.client.baseUrl}/api/v1/geo/tiles/${encodeURIComponent(layer)}/${z}/${x}/${y}`;
    const params = new URLSearchParams();
    if (regime) params.append('regime', regime);
    if (asOf) params.append('as_of', asOf);
    if (versionId) params.append('version_id', versionId);
    if (bypassAdapter !== undefined) params.append('bypass_adapter', String(bypassAdapter));

    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  /**
   * Generates a MapLibre/Mapbox tile URL template with {z}/{x}/{y} placeholders.
   */
  getTileTemplateUrl(layer: string, options: TileUrlOptions = {}): string {
    const { regime = 'historical', asOf, versionId, bypassAdapter } = options;
    const base = `${this.client.baseUrl}/api/v1/geo/tiles/${encodeURIComponent(layer)}/{z}/{x}/{y}`;
    const params = new URLSearchParams();
    if (regime) params.append('regime', regime);
    if (asOf) params.append('as_of', asOf);
    if (versionId) params.append('version_id', versionId);
    if (bypassAdapter !== undefined) params.append('bypass_adapter', String(bypassAdapter));

    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  /**
   * Programmatically fetches a vector tile over HTTP, handling 204 No Content gracefully.
   */
  async fetchTile(layer: string, z: number, x: number, y: number, options: TileUrlOptions = {}): Promise<TileFetchResult> {
    const maxCoord = Math.pow(2, z);
    if (x < 0 || x >= maxCoord || y < 0 || y >= maxCoord) {
      return {
        status: 'error',
        statusCode: 400,
        error: `Tile coordinates (${x}, ${y}) out of bounds for zoom level ${z}`,
      };
    }

    const url = this.getTileUrl(layer, z, x, y, options);
    const tracingHeaders = telemetry.getTracingHeaders();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...tracingHeaders,
          Accept: 'application/vnd.mapbox-vector-tile, application/x-protobuf, */*',
        },
      });

      if (response.status === 204) {
        telemetry.addBreadcrumb({
          category: 'network',
          message: `Tile empty (204): ${layer}/${z}/${x}/${y}`,
        });
        return {
          status: 'empty',
          statusCode: 204,
          data: null,
          layer,
          regime: options.regime || 'historical',
        };
      }

      if (response.status === 404) {
        return {
          status: 'error',
          statusCode: 404,
          error: `Spatial layer or tile not found: ${layer}/${z}/${x}/${y}`,
        };
      }

      if (!response.ok) {
        return {
          status: 'error',
          statusCode: response.status,
          error: `HTTP error ${response.status} fetching tile`,
        };
      }

      const buffer = await response.arrayBuffer();
      telemetry.addBreadcrumb({
        category: 'network',
        message: `Tile fetched (200): ${layer}/${z}/${x}/${y} (${buffer.byteLength} bytes)`,
      });

      return {
        status: 'ok',
        statusCode: 200,
        data: buffer,
        layer,
        regime: options.regime || 'historical',
      };
    } catch (err: unknown) {
      telemetry.warn('Tile fetch failed network error', { error: String(err), layer, z, x, y });
      return {
        status: 'error',
        statusCode: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Delegates point location to PostGIS via the canonical Fastify spatial API.
   * Completely eliminates client-side polygon loops / point-in-polygon math.
   */
  async locate(params: LocateRequestParams): Promise<LocateResult> {
    const { lat, lng, layer = 'mandals', regime = 'historical', asOf, versionId, bypassAdapter } = params;

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return {
        matched: false,
        feature: null,
        statusCode: 400,
        error: 'Invalid coordinates: latitude must be [-90, 90] and longitude [-180, 180]',
      };
    }

    const query: Record<string, string> = {
      lat: String(lat),
      lng: String(lng),
      layer,
      regime,
    };
    if (asOf) query.as_of = asOf;
    if (versionId) query.version_id = versionId;
    if (bypassAdapter !== undefined) query.bypass_adapter = String(bypassAdapter);

    try {
      const res = await this.client.get<{ status: string; matched: boolean; data: unknown }>('/api/v1/geo/locate', {
        authPolicy: 'public',
        query,
      });

      if (res.data && res.data.matched && res.data.data) {
        const validated = validateGovernedSpatialFeature(res.data.data, `locate(${layer}, ${lat}, ${lng})`);
        telemetry.addBreadcrumb({
          category: 'network',
          message: `Locate match: ${layer} at (${lat}, ${lng}) -> ${validated.name || validated.geometry_id}`,
          data: {
            geometry_id: validated.geometry_id,
            version_id: validated.version_id,
            source_feature_id: validated.source_feature_id,
            entity_id: validated.entity_id,
          },
        });
        return {
          matched: true,
          feature: validated,
          statusCode: 200,
        };
      }

      return {
        matched: false,
        feature: null,
        statusCode: res.statusCode,
      };
    } catch (err: unknown) {
      if (err instanceof ApiNetworkError || err instanceof ApiTimeoutError) {
        telemetry.warn('Locate request failed due to client/network error', { error: String(err), isOffline: true });
        return {
          matched: false,
          feature: null,
          statusCode: 0,
          isOffline: true,
          error: err.message,
        };
      }

      if (err instanceof ApiError) {
        const payloadCode =
          err.data && typeof err.data === 'object' && 'code' in err.data
            ? String((err.data as Record<string, unknown>).code)
            : undefined;

        if (err.statusCode === 404) {
          telemetry.addBreadcrumb({
            category: 'network',
            message: `Locate no match (404): ${layer} at (${lat}, ${lng})`,
          });
          return {
            matched: false,
            feature: null,
            statusCode: 404,
            code: payloadCode || 'SPATIAL_LOCATION_NOT_FOUND',
          };
        }
        return {
          matched: false,
          feature: null,
          statusCode: err.statusCode,
          code: payloadCode,
          error: err.message,
        };
      }

      telemetry.warn('Locate request failed due to unknown error', { error: String(err) });
      return {
        matched: false,
        feature: null,
        statusCode: 0,
        isOffline: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Retrieves feature detail by identifier (source_feature_id, geometry_id, or version_id).
   */
  async getFeatureDetail(params: FeatureDetailParams): Promise<FeatureDetailResult> {
    const { layer, id, regime = 'historical', asOf, bypassAdapter } = params;

    const query: Record<string, string> = {
      regime,
    };
    if (asOf) query.as_of = asOf;
    if (bypassAdapter !== undefined) query.bypass_adapter = String(bypassAdapter);

    try {
      const res = await this.client.get<{ status: string; matched: boolean; data: unknown }>(
        `/api/v1/geo/features/${encodeURIComponent(layer)}/${encodeURIComponent(id)}`,
        {
          authPolicy: 'public',
          query,
        }
      );

      if (res.data && res.data.matched && res.data.data) {
        const validated = validateGovernedSpatialFeature(res.data.data, `features/${layer}/${id}`);
        telemetry.addBreadcrumb({
          category: 'network',
          message: `Feature detail found: ${layer}/${id}`,
          data: {
            geometry_id: validated.geometry_id,
            version_id: validated.version_id,
            source_feature_id: validated.source_feature_id,
          },
        });
        return {
          matched: true,
          feature: validated,
          statusCode: 200,
        };
      }

      return {
        matched: false,
        feature: null,
        statusCode: res.statusCode,
      };
    } catch (err: unknown) {
      if (err instanceof ApiNetworkError || err instanceof ApiTimeoutError) {
        telemetry.warn('Feature detail request failed due to client/network error', { error: String(err), isOffline: true });
        return {
          matched: false,
          feature: null,
          statusCode: 0,
          isOffline: true,
          error: err.message,
        };
      }

      if (err instanceof ApiError) {
        const payloadCode =
          err.data && typeof err.data === 'object' && 'code' in err.data
            ? String((err.data as Record<string, unknown>).code)
            : undefined;

        if (err.statusCode === 404) {
          telemetry.addBreadcrumb({
            category: 'network',
            message: `Feature detail not found (404): ${layer}/${id}`,
          });
          return {
            matched: false,
            feature: null,
            statusCode: 404,
            code: payloadCode || 'FEATURE_NOT_FOUND',
          };
        }
        return {
          matched: false,
          feature: null,
          statusCode: err.statusCode,
          code: payloadCode,
          error: err.message,
        };
      }

      telemetry.warn('Feature detail request failed due to unknown error', { error: String(err) });
      return {
        matched: false,
        feature: null,
        statusCode: 0,
        isOffline: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
