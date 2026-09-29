/**
 * apps/api/src/services/spatialAnalyticsService.ts
 *
 * Milestone W017 — Spatial Gateway, Boundary Diff & Spatial Query Engine
 *
 * Server-side spatial query engine mediating analytical operations over PostGIS:
 * - Typed spatial selection (current, as_of, version, future, scenario)
 * - Geodesic area calculation on WGS 84 ellipsoid (ST_Area(geom::geography))
 * - Quantitative overlap percentage calculation
 * - Boundary diffing (added, removed, unmodified, similarity index)
 * - Read-only governed topological anomaly detection
 */
import { supabase } from '../lib/supabase';
import type {
  SpatialSelectionCriteria,
  SpatialEntityReference,
  SpatialOverlapOptions,
  SpatialOverlapResult,
  SpatialBoundaryDiffOptions,
  SpatialBoundaryDiffResult,
  SpatialAnomalyReport,
  RegimeContext,
} from '@kshetra/shared';

export interface ResolvedGeometry {
  geometryId: string;
  mandalVersionId: string;
  entityId?: string;
  sourceFeatureId: string;
  geometry: any;
  isCurrent: boolean;
  validFrom: string;
  validTo: string | null;
  temporalClassification: string;
}

export function geoJsonToWkt(geom: any): string {
  if (typeof geom === 'string') {
    if (geom.startsWith('SRID=') || geom.startsWith('POLYGON') || geom.startsWith('MULTIPOLYGON')) {
      return geom;
    }
    try {
      geom = JSON.parse(geom);
    } catch {
      return geom;
    }
  }
  if (!geom || !geom.type) return '';
  const type = String(geom.type).toUpperCase();
  if (type === 'POLYGON' && Array.isArray(geom.coordinates)) {
    const rings = geom.coordinates.map((ring: number[][]) =>
      `(${ring.map(([lng, lat]: number[]) => `${lng} ${lat}`).join(', ')})`
    );
    return `SRID=4326;POLYGON(${rings.join(', ')})`;
  }
  if (type === 'MULTIPOLYGON' && Array.isArray(geom.coordinates)) {
    const polys = geom.coordinates.map((poly: number[][][]) => {
      const rings = poly.map((ring: number[][]) =>
        `(${ring.map(([lng, lat]: number[]) => `${lng} ${lat}`).join(', ')})`
      );
      return `(${rings.join(', ')})`;
    });
    return `SRID=4326;MULTIPOLYGON(${polys.join(', ')})`;
  }
  return '';
}

export class SpatialAnalyticsService {
  /**
   * Resolves an entity reference to its specific PostGIS geometry row based on selection criteria.
   * Fails closed if the geometry or version is missing or invalid.
   */
  async resolveGeometry(ref: SpatialEntityReference): Promise<ResolvedGeometry> {
    const { entityId, selection } = ref;
    const { mode, asOfDate, versionId } = selection;

    // Fail closed on missing required parameters
    if (mode === 'as_of' && !asOfDate) {
      const err = new Error('TEMPORAL_SELECTION_INVALID: asOfDate (YYYY-MM-DD) is required for as_of mode.');
      (err as any).statusCode = 400;
      (err as any).code = 'INVALID_SELECTION_PARAMETERS';
      throw err;
    }

    if (mode === 'version' && !versionId) {
      const err = new Error('TEMPORAL_SELECTION_INVALID: versionId (UUID) is required for version mode.');
      (err as any).statusCode = 400;
      (err as any).code = 'INVALID_SELECTION_PARAMETERS';
      throw err;
    }

    // 1. Version mode: direct resolution by mandal_version_id or geometry_id
    if (mode === 'version' && versionId) {
      const { data, error } = await supabase
        .from('entity_geometries')
        .select('id, mandal_version_id, source_feature_id, geometry, is_current, valid_from, valid_to, temporal_classification')
        .or(`mandal_version_id.eq.${versionId},id.eq.${versionId}`)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        const err = new Error(`SPATIAL_GEOMETRY_NOT_FOUND: Version ${versionId} geometry not found in database.`);
        (err as any).statusCode = 404;
        (err as any).code = 'ENTITY_GEOMETRY_MISSING';
        throw err;
      }

      return {
        geometryId: data.id,
        mandalVersionId: data.mandal_version_id,
        entityId,
        sourceFeatureId: String(data.source_feature_id),
        geometry: data.geometry,
        isCurrent: Boolean(data.is_current),
        validFrom: String(data.valid_from),
        validTo: data.valid_to ? String(data.valid_to) : null,
        temporalClassification: data.temporal_classification,
      };
    }

    // 2. Current mode: resolve active legal version
    if (mode === 'current') {
      // First check if an is_current = true row exists directly in entity_geometries
      let query = supabase
        .from('entity_geometries')
        .select('id, mandal_version_id, source_feature_id, geometry, is_current, valid_from, valid_to, temporal_classification')
        .eq('is_current', true);

      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entityId)) {
        query = query.or(`id.eq.${entityId},mandal_version_id.eq.${entityId}`);
      } else {
        query = query.eq('source_feature_id', entityId);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error || !data) {
        // Fail closed: historical 2016 baseline geometries have is_current = false and MUST NOT masquerade as current
        const err = new Error(`SPATIAL_CURRENT_GEOMETRY_UNAVAILABLE: Active legal geometry not available for entity '${entityId}'. Historical baseline cannot masquerade as current.`);
        (err as any).statusCode = 404;
        (err as any).code = 'CURRENT_GEOMETRY_UNAVAILABLE';
        throw err;
      }

      return {
        geometryId: data.id,
        mandalVersionId: data.mandal_version_id,
        entityId,
        sourceFeatureId: String(data.source_feature_id),
        geometry: data.geometry,
        isCurrent: true,
        validFrom: String(data.valid_from),
        validTo: null,
        temporalClassification: data.temporal_classification,
      };
    }

    // 3. As_Of mode: historical point-in-time selection
    if (mode === 'as_of' && asOfDate) {
      let query = supabase
        .from('entity_geometries')
        .select('id, mandal_version_id, source_feature_id, geometry, is_current, valid_from, valid_to, temporal_classification')
        .lte('valid_from', asOfDate)
        .or(`valid_to.is.null,valid_to.gt.${asOfDate}`);

      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entityId)) {
        query = query.or(`id.eq.${entityId},mandal_version_id.eq.${entityId}`);
      } else {
        query = query.eq('source_feature_id', entityId);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error || !data) {
        const err = new Error(`SPATIAL_GEOMETRY_NOT_FOUND: Entity '${entityId}' not found for statutory snapshot as_of '${asOfDate}'.`);
        (err as any).statusCode = 404;
        (err as any).code = 'ENTITY_GEOMETRY_MISSING';
        throw err;
      }

      return {
        geometryId: data.id,
        mandalVersionId: data.mandal_version_id,
        entityId,
        sourceFeatureId: String(data.source_feature_id),
        geometry: data.geometry,
        isCurrent: Boolean(data.is_current),
        validFrom: String(data.valid_from),
        validTo: data.valid_to ? String(data.valid_to) : null,
        temporalClassification: data.temporal_classification,
      };
    }

    // 4. Future / Scenario mode
    let fallbackQuery = supabase
      .from('entity_geometries')
      .select('id, mandal_version_id, source_feature_id, geometry, is_current, valid_from, valid_to, temporal_classification');

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entityId)) {
      fallbackQuery = fallbackQuery.or(`id.eq.${entityId},mandal_version_id.eq.${entityId}`);
    } else {
      fallbackQuery = fallbackQuery.eq('source_feature_id', entityId);
    }

    const { data: fbData, error: fbErr } = await fallbackQuery.limit(1).maybeSingle();
    if (fbErr || !fbData) {
      const err = new Error(`SPATIAL_GEOMETRY_NOT_FOUND: Entity '${entityId}' not found for regime '${mode}'.`);
      (err as any).statusCode = 404;
      (err as any).code = 'ENTITY_GEOMETRY_MISSING';
      throw err;
    }

    return {
      geometryId: fbData.id,
      mandalVersionId: fbData.mandal_version_id,
      entityId,
      sourceFeatureId: String(fbData.source_feature_id),
      geometry: fbData.geometry,
      isCurrent: Boolean(fbData.is_current),
      validFrom: String(fbData.valid_from),
      validTo: fbData.valid_to ? String(fbData.valid_to) : null,
      temporalClassification: fbData.temporal_classification,
    };
  }

  /**
   * Computes spatial overlap metrics between two entity references.
   * Uses spheroidal geography ST_Area(geom::geography) as the primary cross-boundary standard.
   */
  async calculateOverlap(
    baseRef: SpatialEntityReference,
    compRef: SpatialEntityReference,
    options: SpatialOverlapOptions = {}
  ): Promise<SpatialOverlapResult> {
    const [baseGeom, compGeom] = await Promise.all([
      this.resolveGeometry(baseRef),
      this.resolveGeometry(compRef),
    ]);

    // Determine cross-regime context
    const isCrossRegime =
      baseRef.selection.mode !== compRef.selection.mode ||
      baseRef.selection.asOfDate !== compRef.selection.asOfDate ||
      baseRef.selection.versionId !== compRef.selection.versionId;

    const regimeContext: RegimeContext = {
      isCrossRegime,
      baseSelection: baseRef.selection,
      comparisonSelection: compRef.selection,
      warning: isCrossRegime
        ? `CROSS_REGIME_COMPARISON: Base selection (${baseRef.selection.mode}) differs from comparison selection (${compRef.selection.mode}). Result does not represent a unified legal boundary.`
        : undefined,
    };

    const geomA = geoJsonToWkt(baseGeom.geometry);
    const geomB = geoJsonToWkt(compGeom.geometry);
    const usePlanar = options.projection === 'PLANAR_UTM44N';
    const planarSrid = options.planarSrid ?? 32644;

    // 1. Attempt invocation via stored procedure fn_spatial_calculate_overlap
    const { data: rpcRows, error: rpcErr } = await supabase.rpc('fn_spatial_calculate_overlap', {
      p_geom_a: geomA,
      p_geom_b: geomB,
      p_use_planar: usePlanar,
      p_planar_srid: planarSrid,
    });

    if (!rpcErr && rpcRows && rpcRows.length > 0) {
      const res = rpcRows[0];
      return {
        baseEntityAreaM2: Number(res.area_a_m2),
        comparisonEntityAreaM2: Number(res.area_b_m2),
        intersectionAreaM2: Number(res.intersection_area_m2),
        baseOverlapPercentage: Number(res.overlap_pct_a),
        comparisonOverlapPercentage: Number(res.overlap_pct_b),
        intersectionDimension: Number(res.intersection_dimension),
        isDisjoint: Boolean(res.is_disjoint),
        regimeContext,
      };
    }

    // 2. Direct PostGIS fallback mediation via PostgREST RPC primitives
    if (baseGeom.geometryId === compGeom.geometryId || geomA === geomB) {
      const { data: areaAVal } = await supabase.rpc('st_area', { geog: geomA });
      const area = typeof areaAVal === 'number' ? Math.round(areaAVal * 100) / 100 : 0.0;
      return {
        baseEntityAreaM2: area,
        comparisonEntityAreaM2: area,
        intersectionAreaM2: area,
        baseOverlapPercentage: 100.0,
        comparisonOverlapPercentage: 100.0,
        intersectionDimension: 2,
        isDisjoint: false,
        regimeContext,
      };
    }

    const { data: areaA } = await supabase.rpc('st_area', { geog: geomA });
    const { data: areaB } = await supabase.rpc('st_area', { geog: geomB });
    const { data: intersectionGeom, error: interErr } = await supabase.rpc('st_intersection', {
      geom1: geomA,
      geom2: geomB,
    });

    let intersectionArea = 0.0;
    let isDisjoint = true;
    let dimension = 0;

    if (!interErr && intersectionGeom) {
      const { data: interArea } = await supabase.rpc('st_area', { geog: JSON.stringify(intersectionGeom) });
      if (typeof interArea === 'number' && interArea > 0) {
        intersectionArea = interArea;
        isDisjoint = false;
        dimension = 2;
      }
    }

    const aArea = typeof areaA === 'number' ? areaA : 0.0;
    const bArea = typeof areaB === 'number' ? areaB : 0.0;
    const basePct = aArea > 0 ? (intersectionArea / aArea) * 100.0 : 0.0;
    const compPct = bArea > 0 ? (intersectionArea / bArea) * 100.0 : 0.0;

    return {
      baseEntityAreaM2: Math.round(aArea * 100) / 100,
      comparisonEntityAreaM2: Math.round(bArea * 100) / 100,
      intersectionAreaM2: Math.round(intersectionArea * 100) / 100,
      baseOverlapPercentage: Math.round(basePct * 10000) / 10000,
      comparisonOverlapPercentage: Math.round(compPct * 10000) / 10000,
      intersectionDimension: dimension,
      isDisjoint,
      regimeContext,
    };
  }

  /**
   * Computes spatial difference (boundary diff) between two versions of an entity.
   */
  async calculateBoundaryDiff(
    entityId: string,
    sourceSelection: SpatialSelectionCriteria,
    targetSelection: SpatialSelectionCriteria,
    options: SpatialBoundaryDiffOptions = {}
  ): Promise<SpatialBoundaryDiffResult> {
    const [sourceGeom, targetGeom] = await Promise.all([
      this.resolveGeometry({ entityId, selection: sourceSelection }),
      this.resolveGeometry({ entityId, selection: targetSelection }),
    ]);

    const isCrossRegime =
      sourceSelection.mode !== targetSelection.mode ||
      sourceSelection.asOfDate !== targetSelection.asOfDate ||
      sourceSelection.versionId !== targetSelection.versionId;

    const regimeContext: RegimeContext = {
      isCrossRegime,
      baseSelection: sourceSelection,
      comparisonSelection: targetSelection,
      warning: isCrossRegime
        ? 'CROSS_REGIME_COMPARISON: Source and target selections operate under distinct temporal contexts.'
        : undefined,
    };

    const geomSrc = geoJsonToWkt(sourceGeom.geometry);
    const geomTgt = geoJsonToWkt(targetGeom.geometry);
    const toleranceM = options.toleranceMeters ?? 1.0;

    // 1. Attempt stored procedure fn_spatial_boundary_diff
    const { data: diffRows, error: diffErr } = await supabase.rpc('fn_spatial_boundary_diff', {
      p_source_geom: geomSrc,
      p_target_geom: geomTgt,
      p_tolerance_m: toleranceM,
    });

    if (!diffErr && diffRows && diffRows.length > 0) {
      const r = diffRows[0];
      return {
        entityId,
        sourceAreaM2: Number(r.source_area_m2),
        targetAreaM2: Number(r.target_area_m2),
        netAreaChangeM2: Number(r.net_change_m2),
        addedAreaM2: Number(r.added_area_m2),
        removedAreaM2: Number(r.removed_area_m2),
        unmodifiedAreaM2: Number(r.unmodified_area_m2),
        similarityIndex: Number(r.similarity_index),
        regimeContext,
        addedGeoJson: options.includeDiffGeoJson ? r.added_geom : null,
        removedGeoJson: options.includeDiffGeoJson ? r.removed_geom : null,
      };
    }

    // 2. Direct PostGIS fallback mediation
    if (sourceGeom.geometryId === targetGeom.geometryId || geomSrc === geomTgt) {
      const { data: areaVal } = await supabase.rpc('st_area', { geog: geomSrc });
      const area = typeof areaVal === 'number' ? Math.round(areaVal * 100) / 100 : 0.0;
      return {
        entityId,
        sourceAreaM2: area,
        targetAreaM2: area,
        netAreaChangeM2: 0.0,
        addedAreaM2: 0.0,
        removedAreaM2: 0.0,
        unmodifiedAreaM2: area,
        similarityIndex: 1.0,
        regimeContext,
        addedGeoJson: null,
        removedGeoJson: null,
      };
    }

    const { data: srcAreaVal } = await supabase.rpc('st_area', { geog: geomSrc });
    const { data: tgtAreaVal } = await supabase.rpc('st_area', { geog: geomTgt });
    const { data: diffAdded } = await supabase.rpc('st_difference', { geom1: geomTgt, geom2: geomSrc });
    const { data: diffRemoved } = await supabase.rpc('st_difference', { geom1: geomSrc, geom2: geomTgt });
    const { data: interGeom } = await supabase.rpc('st_intersection', { geom1: geomSrc, geom2: geomTgt });

    const srcArea = typeof srcAreaVal === 'number' ? srcAreaVal : 0.0;
    const tgtArea = typeof tgtAreaVal === 'number' ? tgtAreaVal : 0.0;

    let addedArea = 0.0;
    let removedArea = 0.0;
    let unmodArea = 0.0;

    if (diffAdded) {
      const { data: a } = await supabase.rpc('st_area', { geog: JSON.stringify(diffAdded) });
      if (typeof a === 'number') addedArea = a;
    }
    if (diffRemoved) {
      const { data: r } = await supabase.rpc('st_area', { geog: JSON.stringify(diffRemoved) });
      if (typeof r === 'number') removedArea = r;
    }
    if (interGeom) {
      const { data: u } = await supabase.rpc('st_area', { geog: JSON.stringify(interGeom) });
      if (typeof u === 'number') unmodArea = u;
    }

    const unionArea = srcArea + tgtArea - unmodArea;
    const simIndex = unionArea > 0 ? unmodArea / unionArea : 1.0;

    return {
      entityId,
      sourceAreaM2: Math.round(srcArea * 100) / 100,
      targetAreaM2: Math.round(tgtArea * 100) / 100,
      netAreaChangeM2: Math.round((tgtArea - srcArea) * 100) / 100,
      addedAreaM2: Math.round(addedArea * 100) / 100,
      removedAreaM2: Math.round(removedArea * 100) / 100,
      unmodifiedAreaM2: Math.round(unmodArea * 100) / 100,
      similarityIndex: Math.round(simIndex * 10000) / 10000,
      regimeContext,
      addedGeoJson: options.includeDiffGeoJson ? diffAdded : null,
      removedGeoJson: options.includeDiffGeoJson ? diffRemoved : null,
    };
  }

  /**
   * Scans a geographic bounding box for topological anomalies using governed heuristics.
   * Access is strictly restricted to service_role.
   */
  async detectAnomalies(
    layer: string,
    bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number },
    profile = 'v1.0-standard'
  ): Promise<SpatialAnomalyReport> {
    const width = bbox.maxLng - bbox.minLng;
    const height = bbox.maxLat - bbox.minLat;

    // Enforce complexity ceiling
    if (width > 2.01 || height > 2.01) {
      const err = new Error(`SPATIAL_QUERY_LIMIT_EXCEEDED: Bounding box exceeds maximum allowed dimensions of 2.0 x 2.0 degrees (width: ${width}, height: ${height}).`);
      (err as any).statusCode = 413;
      (err as any).code = 'SPATIAL_QUERY_LIMIT_EXCEEDED';
      throw err;
    }

    const bboxPolygon = `POLYGON((${bbox.minLng} ${bbox.minLat},${bbox.maxLng} ${bbox.minLat},${bbox.maxLng} ${bbox.maxLat},${bbox.minLng} ${bbox.maxLat},${bbox.minLng} ${bbox.minLat}))`;

    // 1. Attempt stored procedure fn_spatial_detect_anomalies
    const { data: anomRows, error: anomErr } = await supabase.rpc('fn_spatial_detect_anomalies', {
      p_layer: layer,
      p_bbox: bboxPolygon,
      p_profile_version: profile,
    });

    if (!anomErr && anomRows) {
      return {
        layer,
        profile,
        scannedFeatureCount: anomRows.length,
        anomalyCount: anomRows.length,
        anomalies: anomRows.map((r: any) => ({
          type: r.anomaly_type,
          entityAId: r.entity_a_id,
          entityBId: r.entity_b_id,
          anomalyAreaM2: Number(r.anomaly_area_m2),
          severity: r.severity,
          centroid: r.centroid?.coordinates || null,
          diagnosticDetails: r.diagnostic_details || {},
          actionRequired: 'HUMAN_CARTOGRAPHIC_REVIEW',
        })),
        governanceNotice: 'NON_JUDICIAL_DIAGNOSTIC: Heuristic screening only. Does not modify canonical boundaries.',
      };
    }

    // 2. Direct fallback anomaly scan over candidate geometries in bbox
    const { data: candidateRows } = await supabase
      .from('entity_geometries')
      .select('id, mandal_version_id, source_feature_id, geometry')
      .filter('geometry', 'ov', `SRID=4326;${bboxPolygon}`)
      .limit(100);

    const candidates = candidateRows || [];
    const anomalies: any[] = [];

    // Check for invalid geometries using PostGIS st_isvaliddetail
    for (const item of candidates) {
      const { data: detail } = await supabase.rpc('st_isvaliddetail', { geom: JSON.stringify(item.geometry) });
      if (detail && detail.valid === false) {
        anomalies.push({
          type: 'INVALID_GEOMETRY',
          entityAId: item.id,
          entityBId: null,
          anomalyAreaM2: 0.0,
          severity: 'HIGH',
          centroid: null,
          diagnosticDetails: { reason: detail.reason, location: detail.location },
          actionRequired: 'HUMAN_CARTOGRAPHIC_REVIEW',
        });
      }
    }

    return {
      layer,
      profile,
      scannedFeatureCount: candidates.length,
      anomalyCount: anomalies.length,
      anomalies,
      governanceNotice: 'NON_JUDICIAL_DIAGNOSTIC: Heuristic screening only. Does not modify canonical boundaries.',
    };
  }
}

export const spatialAnalyticsService = new SpatialAnalyticsService();
