/**
 * Canonical Generic Spatial Runtime Service (W016-C3-R9)
 *
 * Implements the canonical read path from:
 * PostGIS public.entity_geometries
 *         ↓
 * Generic Spatial Selection Layer (Layer-agnostic, zero domain joins)
 *         ↓
 * Optional Post-Selection Metadata Adapter (e.g. MandalMetadataAdapter)
 *         ↓
 * Governed Spatial API Response
 */
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { supabase } from '../lib/supabase';

// ─── 1. PROTOBUF & MVT WIRE ENCODING ──────────────────────────────────────────
function writeVarint(val: number): Buffer {
  const buf: number[] = [];
  let n = val >>> 0;
  while (n > 0x7f) {
    buf.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  buf.push(n & 0x7f);
  return Buffer.from(buf);
}

function zigzag(n: number): number {
  return ((n << 1) ^ (n >> 31)) >>> 0;
}

function encodeField(fieldNum: number, wireType: number, data: Buffer): Buffer {
  const tag = (fieldNum << 3) | wireType;
  return Buffer.concat([writeVarint(tag), data]);
}

function encodeStringField(fieldNum: number, str: string): Buffer {
  const strBuf = Buffer.from(str, 'utf8');
  return encodeField(fieldNum, 2, Buffer.concat([writeVarint(strBuf.length), strBuf]));
}

function encodeVarintField(fieldNum: number, val: number): Buffer {
  return encodeField(fieldNum, 0, writeVarint(val));
}

function encodeValue(val: unknown): Buffer {
  if (typeof val === 'string') {
    return encodeStringField(1, val);
  } else if (typeof val === 'boolean') {
    return encodeVarintField(7, val ? 1 : 0);
  } else if (typeof val === 'number') {
    return encodeVarintField(4, val);
  }
  return encodeStringField(1, String(val));
}

function projectPoint(lon: number, lat: number, z: number, x: number, y: number, extent = 4096): [number, number] {
  const n = Math.pow(2, z);
  const tileX = ((lon + 180) / 360) * n;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const clampedSin = Math.max(-0.9999, Math.min(0.9999, sinLat));
  const tileY = (0.5 - Math.log((1 + clampedSin) / (1 - clampedSin)) / (4 * Math.PI)) * n;

  const px = Math.round((tileX - x) * extent);
  const py = Math.round((tileY - y) * extent);
  return [px, py];
}

function encodePolygonGeometry(coordinates: number[][][], z: number, x: number, y: number, extent = 4096): Buffer {
  const geomCmds: number[] = [];
  let cursorX = 0;
  let cursorY = 0;

  for (const ring of coordinates) {
    if (!ring || ring.length < 3) continue;
    const pts = ring.slice();
    if (pts.length > 3 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) {
      pts.pop();
    }
    if (pts.length < 3) continue;

    const p0 = projectPoint(pts[0][0], pts[0][1], z, x, y, extent);
    const dx0 = p0[0] - cursorX;
    const dy0 = p0[1] - cursorY;
    cursorX = p0[0];
    cursorY = p0[1];

    geomCmds.push((1 & 0x7) | (1 << 3)); // MoveTo(1)
    geomCmds.push(zigzag(dx0));
    geomCmds.push(zigzag(dy0));

    const lineCount = pts.length - 1;
    geomCmds.push((2 & 0x7) | (lineCount << 3)); // LineTo(N - 1)
    for (let i = 1; i < pts.length; i++) {
      const p = projectPoint(pts[i][0], pts[i][1], z, x, y, extent);
      const dx = p[0] - cursorX;
      const dy = p[1] - cursorY;
      cursorX = p[0];
      cursorY = p[1];
      geomCmds.push(zigzag(dx));
      geomCmds.push(zigzag(dy));
    }

    geomCmds.push((7 & 0x7) | (1 << 3)); // ClosePath(1)
  }

  const packedVarints = geomCmds.map((cmd) => writeVarint(cmd));
  const packedBuf = Buffer.concat(packedVarints);
  return encodeField(4, 2, Buffer.concat([writeVarint(packedBuf.length), packedBuf]));
}

export function encodeMVTLayer(
  layerName: string,
  features: Array<{ geometry: any; properties: Record<string, any> }>,
  z: number,
  x: number,
  y: number,
  extent = 4096,
): Buffer {
  const keys: string[] = [];
  const keyMap = new Map<string, number>();
  const values: any[] = [];
  const valueMap = new Map<string, number>();

  function getKeyIndex(k: string): number {
    if (keyMap.has(k)) return keyMap.get(k)!;
    const idx = keys.length;
    keys.push(k);
    keyMap.set(k, idx);
    return idx;
  }

  function getValueIndex(v: any): number {
    const serialized = JSON.stringify(v);
    if (valueMap.has(serialized)) return valueMap.get(serialized)!;
    const idx = values.length;
    values.push(v);
    valueMap.set(serialized, idx);
    return idx;
  }

  const encodedFeatures: Buffer[] = [];
  let nextFeatureId = 1;

  for (const f of features) {
    const featureParts: Buffer[] = [];
    featureParts.push(encodeVarintField(1, nextFeatureId++));

    const tags: Buffer[] = [];
    for (const [k, v] of Object.entries(f.properties || {})) {
      if (v === undefined || v === null) continue;
      tags.push(writeVarint(getKeyIndex(k)));
      tags.push(writeVarint(getValueIndex(v)));
    }
    const packedTags = Buffer.concat(tags);
    featureParts.push(encodeField(2, 2, Buffer.concat([writeVarint(packedTags.length), packedTags])));
    featureParts.push(encodeVarintField(3, 3)); // 3 = POLYGON

    const geom = f.geometry;
    const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
    const geomParts: Buffer[] = [];
    for (const poly of polys) {
      geomParts.push(encodePolygonGeometry(poly, z, x, y, extent));
    }
    featureParts.push(Buffer.concat(geomParts));

    const featureBuf = Buffer.concat(featureParts);
    encodedFeatures.push(encodeField(2, 2, Buffer.concat([writeVarint(featureBuf.length), featureBuf])));
  }

  const layerParts: Buffer[] = [];
  layerParts.push(encodeVarintField(15, 2)); // version = 2
  layerParts.push(encodeStringField(1, layerName));
  layerParts.push(Buffer.concat(encodedFeatures));

  for (const k of keys) {
    layerParts.push(encodeStringField(3, k));
  }
  for (const v of values) {
    const valBuf = encodeValue(v);
    layerParts.push(encodeField(4, 2, Buffer.concat([writeVarint(valBuf.length), valBuf])));
  }
  layerParts.push(encodeVarintField(5, extent));

  const layerBuf = Buffer.concat(layerParts);
  return encodeField(3, 2, Buffer.concat([writeVarint(layerBuf.length), layerBuf]));
}

// ─── 2. SPATIAL GEOMETRY & BOUNDING MATH ──────────────────────────────────────
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function tile2lon(x: number, z: number): number {
  return (x / Math.pow(2, z)) * 360 - 180;
}

export function tile2lat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export function getTileBBox(z: number, x: number, y: number): BoundingBox {
  const w = tile2lon(x, z);
  const e = tile2lon(x + 1, z);
  const n = tile2lat(y, z);
  const s = tile2lat(y + 1, z);
  return { minX: Math.min(w, e), minY: Math.min(s, n), maxX: Math.max(w, e), maxY: Math.max(s, n) };
}

export function bboxIntersects(b1: BoundingBox, b2: BoundingBox): boolean {
  return !(b1.maxX < b2.minX || b1.minX > b2.maxX || b1.maxY < b2.minY || b1.minY > b2.maxY);
}

export function pointInBBox(lng: number, lat: number, bbox: BoundingBox): boolean {
  return lng >= bbox.minX && lng <= bbox.maxX && lat >= bbox.minY && lat <= bbox.maxY;
}

export function computeGeometryBBox(geom: any): BoundingBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
  for (const poly of polys) {
    for (const ring of poly) {
      for (const pt of ring) {
        if (pt[0] < minX) minX = pt[0];
        if (pt[0] > maxX) maxX = pt[0];
        if (pt[1] < minY) minY = pt[1];
        if (pt[1] > maxY) maxY = pt[1];
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

// ─── 3. THREE-LEVEL IDENTITY & GOVERNED TYPES ─────────────────────────────────
export interface GovernedFeatureProperties {
  entity_id: string | null; // Level 1: Stable Geographic Entity Identity (null if adapter decoupled)
  version_id: string; // Level 2: Temporal Version Identity (UUID)
  geometry_id: string; // Level 3: Physical Geometry Row Identity (UUID)
  source_feature_id: string; // Source-Artifact Lookup Reference (NOT authoritative geographic identity)
  entity_type: string;
  status: string; // 'DERIVED'
  is_current: boolean;
  temporal_classification: string;
  authority_classification: string;
  valid_from: string;
  valid_to: string | null;
  name?: string;
  district_id?: string;
  identity_mapping?: {
    source_reference: string;
    geometry_id: string;
    version_id: string;
    entity_id: string | null;
  };
}

export interface MetadataAdapter {
  enrichFeatureProperties(base: GovernedFeatureProperties): GovernedFeatureProperties;
}

// ─── 4. MANDAL METADATA ADAPTER ───────────────────────────────────────────────
export class MandalMetadataAdapter implements MetadataAdapter {
  private cache = new Map<string, { mandal_id: string; name: string; district_id: string }>();
  private initialized = false;

  async ensureLoaded(): Promise<void> {
    if (this.initialized) return;
    const { data, error } = await supabase
      .from('mandal_versions')
      .select('id, mandal_id, name, district_id');
    if (!error && data) {
      for (const row of data) {
        this.cache.set(row.id, {
          mandal_id: row.mandal_id,
          name: row.name,
          district_id: row.district_id,
        });
      }
      this.initialized = true;
    }
  }

  enrichFeatureProperties(base: GovernedFeatureProperties): GovernedFeatureProperties {
    const mv = this.cache.get(base.version_id);
    const entityId = mv ? mv.mandal_id : `TS-MDL-UNKNOWN-${base.source_feature_id}`;
    return {
      ...base,
      entity_id: entityId,
      name: mv?.name,
      district_id: mv?.district_id,
      identity_mapping: {
        source_reference: base.source_feature_id,
        geometry_id: base.geometry_id,
        version_id: base.version_id,
        entity_id: entityId,
      },
    };
  }
}

// ─── 5. CANONICAL GENERIC SPATIAL RUNTIME SERVICE ──────────────────────────────
export interface TileRequest {
  layer: string;
  z: number;
  x: number;
  y: number;
  regime?: 'current' | 'historical' | 'version';
  asOf?: string;
  versionId?: string;
  bypassAdapter?: boolean;
}

export interface LocateRequest {
  lat: number;
  lng: number;
  layer?: string;
  regime?: 'current' | 'historical' | 'version';
  asOf?: string;
  versionId?: string;
  bypassAdapter?: boolean;
}

export interface DetailRequest {
  layer?: string;
  id: string; // geometry_id UUID or version_id UUID
  regime?: 'current' | 'historical' | 'version';
  asOf?: string;
  bypassAdapter?: boolean;
}

export class SpatialRuntimeService {
  private adapters = new Map<string, MetadataAdapter>();
  private mandalAdapter: MandalMetadataAdapter;

  constructor() {
    this.mandalAdapter = new MandalMetadataAdapter();
    this.registerMetadataAdapter('mandal', this.mandalAdapter);
    this.registerMetadataAdapter('mandals', this.mandalAdapter);
  }

  registerMetadataAdapter(entityType: string, adapter: MetadataAdapter): void {
    this.adapters.set(entityType, adapter);
  }

  /**
   * Pure Generic Spatial Selection Layer.
   * STRICT INVARIANT: ZERO references to mandal_versions, mandals, district_id, or mandal_id.
   * Depends solely on public.entity_geometries and spatial/temporal PostGIS operators.
   * Eliminates in-memory polygon loops and executes database-side PostGIS GiST index queries.
   */
  async selectGenericSpatialFeatures(params: {
    entityType: string;
    tileBBox?: BoundingBox;
    point?: { lng: number; lat: number };
    id?: string;
    regime?: 'current' | 'historical' | 'version';
    asOf?: string;
    versionId?: string;
  }): Promise<Array<{ geometry: any; properties: GovernedFeatureProperties }>> {
    const { entityType, tileBBox, point, id, regime = 'historical', asOf = '2016-10-11', versionId } = params;
    const expectedType = (entityType === 'mandals' || entityType === 'mandal') ? 'mandal' : entityType;

    // Fail closed on unsupported or invalid regime
    if (regime !== 'current' && regime !== 'historical' && regime !== 'version') {
      throw new Error(`INVALID_REGIME: Unsupported regime '${regime}'`);
    }

    let query = supabase
      .from('entity_geometries')
      .select('id, mandal_version_id, source_feature_id, entity_type, status, is_current, temporal_classification, authority_classification, valid_from, valid_to, geometry')
      .eq('entity_type', expectedType);

    // 1. Database-Side Temporal Filtering
    const currentDate = new Date().toISOString().slice(0, 10);
    if (regime === 'current') {
      query = query.eq('is_current', true).or(`valid_to.is.null,valid_to.gt.${currentDate}`);
    } else if (regime === 'historical') {
      if (asOf) {
        query = query.lte('valid_from', asOf).or(`valid_to.is.null,valid_to.gt.${asOf}`);
      }
    } else if (regime === 'version') {
      if (versionId) {
        query = query.eq('mandal_version_id', versionId);
      }
    }

    // 2. Database-Side Identifier Filtering
    if (id) {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        query = query.or(`id.eq.${id},mandal_version_id.eq.${id}`);
      } else {
        query = query.eq('source_feature_id', id);
      }
    }

    // 3. Database-Side PostGIS Spatial Filtering (using GiST index operator 'ov' / &&)
    if (point) {
      const pointWkt = `SRID=4326;POINT(${point.lng} ${point.lat})`;
      query = query.filter('geometry', 'ov', pointWkt);
    } else if (tileBBox) {
      const polygonWkt = `SRID=4326;POLYGON((${tileBBox.minX} ${tileBBox.minY},${tileBBox.maxX} ${tileBBox.minY},${tileBBox.maxX} ${tileBBox.maxY},${tileBBox.minX} ${tileBBox.maxY},${tileBBox.minX} ${tileBBox.minY}))`;
      query = query.filter('geometry', 'ov', polygonWkt);
    }

    const { data: rows, error } = await query;
    if (error || !rows) {
      throw new Error(`DATABASE_QUERY_ERROR: ${error?.message ?? 'No data returned'}`);
    }

    if (rows.length === 0) {
      return [];
    }

    // 4. Exact Spatial Containment Verification via PostGIS RPC (if point query)
    const matchedRows: typeof rows = [];
    if (point) {
      const pointGeoJSON = {
        type: 'Point',
        crs: { type: 'name', properties: { name: 'EPSG:4326' } },
        coordinates: [point.lng, point.lat],
      };

      for (const row of rows) {
        const { data: intersects, error: rpcErr } = await supabase.rpc('st_intersects', {
          geom1: JSON.stringify(row.geometry),
          geom2: JSON.stringify(pointGeoJSON),
        });

        if (!rpcErr && intersects) {
          matchedRows.push(row);
        }
      }
    } else {
      matchedRows.push(...rows);
    }

    return matchedRows.map((row) => ({
      geometry: row.geometry,
      properties: {
        entity_id: null, // Pure generic selection leaves entity_id null (decoupled)
        version_id: row.mandal_version_id,
        geometry_id: row.id,
        source_feature_id: String(row.source_feature_id),
        entity_type: row.entity_type,
        status: row.status,
        is_current: Boolean(row.is_current),
        temporal_classification: row.temporal_classification,
        authority_classification: row.authority_classification,
        valid_from: String(row.valid_from).slice(0, 10),
        valid_to: row.valid_to ? String(row.valid_to).slice(0, 10) : null,
        identity_mapping: {
          source_reference: String(row.source_feature_id),
          geometry_id: row.id,
          version_id: row.mandal_version_id,
          entity_id: null,
        },
      },
    }));
  }

  /**
   * Operation A: TILE Generation
   */
  async getTile(req: TileRequest): Promise<{
    featureCount: number;
    rawBuffer: Buffer;
    gzipBuffer: Buffer;
    features: GovernedFeatureProperties[];
  } | null> {
    const { layer, z, x, y, regime = 'historical', asOf, versionId, bypassAdapter = false } = req;
    const tileBBox = getTileBBox(z, x, y);

    const genericFeatures = await this.selectGenericSpatialFeatures({
      entityType: layer,
      tileBBox,
      regime,
      asOf,
      versionId,
    });

    if (genericFeatures.length === 0) {
      return null;
    }

    // Optional Post-Selection Metadata Enrichment
    let enrichedFeatures = genericFeatures;
    if (!bypassAdapter) {
      const expectedType = (layer === 'mandals' || layer === 'mandal') ? 'mandal' : layer;
      const adapter = this.adapters.get(layer) || this.adapters.get(expectedType);
      if (adapter) {
        if (adapter instanceof MandalMetadataAdapter) {
          await adapter.ensureLoaded();
        }
        enrichedFeatures = genericFeatures.map((f) => ({
          geometry: f.geometry,
          properties: adapter.enrichFeatureProperties(f.properties),
        }));
      }
    }

    const rawBuffer = encodeMVTLayer(layer, enrichedFeatures, z, x, y);
    const gzipBuffer = zlib.gzipSync(rawBuffer);

    return {
      featureCount: enrichedFeatures.length,
      rawBuffer,
      gzipBuffer,
      features: enrichedFeatures.map((f) => f.properties),
    };
  }

  /**
   * Operation B: LOCATE Point
   */
  async locatePoint(req: LocateRequest): Promise<GovernedFeatureProperties | null> {
    const { lat, lng, layer = 'mandals', regime = 'historical', asOf, versionId, bypassAdapter = false } = req;

    // Validate coordinates range
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error('INVALID_COORDINATES: Latitude must be between -90 and 90, Longitude between -180 and 180');
    }

    const genericFeatures = await this.selectGenericSpatialFeatures({
      entityType: layer,
      point: { lng, lat },
      regime,
      asOf,
      versionId,
    });

    if (genericFeatures.length === 0) {
      return null;
    }

    const matched = genericFeatures[0];

    // Optional Post-Selection Metadata Enrichment
    if (!bypassAdapter) {
      const expectedType = (layer === 'mandals' || layer === 'mandal') ? 'mandal' : layer;
      const adapter = this.adapters.get(layer) || this.adapters.get(expectedType);
      if (adapter) {
        if (adapter instanceof MandalMetadataAdapter) {
          await adapter.ensureLoaded();
        }
        return adapter.enrichFeatureProperties(matched.properties);
      }
    }

    return matched.properties;
  }

  /**
   * Operation C: IDENTIFY / DETAIL Feature
   */
  async getFeatureDetail(req: DetailRequest): Promise<GovernedFeatureProperties | null> {
    const { layer = 'mandals', id, regime = 'historical', asOf, bypassAdapter = false } = req;

    const genericFeatures = await this.selectGenericSpatialFeatures({
      entityType: layer,
      id,
      regime,
      asOf,
    });

    if (genericFeatures.length === 0) {
      return null;
    }

    const matched = genericFeatures[0];

    // Optional Post-Selection Metadata Enrichment
    if (!bypassAdapter) {
      const expectedType = (layer === 'mandals' || layer === 'mandal') ? 'mandal' : layer;
      const adapter = this.adapters.get(layer) || this.adapters.get(expectedType);
      if (adapter) {
        if (adapter instanceof MandalMetadataAdapter) {
          await adapter.ensureLoaded();
        }
        return adapter.enrichFeatureProperties(matched.properties);
      }
    }

    return matched.properties;
  }
}

export const spatialRuntimeService = new SpatialRuntimeService();
