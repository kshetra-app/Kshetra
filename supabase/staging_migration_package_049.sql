-- ==============================================================================
-- Migration 049: Spatial Gateway, Boundary Diff & Spatial Query Engine
-- Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- Production: STRICTLY AIR-GAPPED & UNTOUCHED
-- Authority: CTO Implementation Authorization W017 (PLAN-W017-REV-1.1)
-- Operating Rule: Zero new tables, zero column modifications, zero geometry mutations.
-- Security Model: 100% SECURITY INVOKER across all analytical procedures.
-- ==============================================================================

BEGIN;

-- ─── 1. EXTENSIONS ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── 2. FUNCTION: fn_spatial_calculate_overlap ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_spatial_calculate_overlap(
  p_geom_a GEOMETRY,
  p_geom_b GEOMETRY,
  p_use_planar BOOLEAN DEFAULT false,
  p_planar_srid INTEGER DEFAULT 32644
) RETURNS TABLE(
  area_a_m2 DOUBLE PRECISION,
  area_b_m2 DOUBLE PRECISION,
  intersection_area_m2 DOUBLE PRECISION,
  overlap_pct_a DOUBLE PRECISION,
  overlap_pct_b DOUBLE PRECISION,
  intersection_dimension INTEGER,
  is_disjoint BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_geom_a GEOMETRY;
  v_geom_b GEOMETRY;
  v_intersection GEOMETRY;
  v_dim INTEGER;
  v_area_a DOUBLE PRECISION;
  v_area_b DOUBLE PRECISION;
  v_area_inter DOUBLE PRECISION;
BEGIN
  -- Resource limit: 5000ms statement timeout
  SET LOCAL statement_timeout = '5000ms';

  IF p_geom_a IS NULL OR p_geom_b IS NULL THEN
    RETURN;
  END IF;

  IF ST_IsEmpty(p_geom_a) OR ST_IsEmpty(p_geom_b) THEN
    RETURN QUERY SELECT 0.0::float8, 0.0::float8, 0.0::float8, 0.0::float8, 0.0::float8, -1, true;
    RETURN;
  END IF;

  IF NOT ST_IsValid(p_geom_a) THEN
    RAISE EXCEPTION 'INVALID_GEOMETRY: Geometry A is not geometrically valid' USING ERRCODE = '22023';
  END IF;
  IF NOT ST_IsValid(p_geom_b) THEN
    RAISE EXCEPTION 'INVALID_GEOMETRY: Geometry B is not geometrically valid' USING ERRCODE = '22023';
  END IF;

  -- Mandatory bounding box pre-filtering (&&)
  IF NOT (p_geom_a && p_geom_b) THEN
    IF p_use_planar THEN
      v_area_a := ST_Area(ST_Transform(p_geom_a, p_planar_srid));
      v_area_b := ST_Area(ST_Transform(p_geom_b, p_planar_srid));
    ELSE
      v_area_a := ST_Area(p_geom_a::geography);
      v_area_b := ST_Area(p_geom_b::geography);
    END IF;

    RETURN QUERY SELECT 
      ROUND(v_area_a::numeric, 2)::float8,
      ROUND(v_area_b::numeric, 2)::float8,
      0.0::float8,
      0.0000::float8,
      0.0000::float8,
      -1,
      true;
    RETURN;
  END IF;

  -- Compute individual areas
  IF p_use_planar THEN
    v_geom_a := ST_Transform(p_geom_a, p_planar_srid);
    v_geom_b := ST_Transform(p_geom_b, p_planar_srid);
    v_area_a := ST_Area(v_geom_a);
    v_area_b := ST_Area(v_geom_b);
    v_intersection := ST_Intersection(v_geom_a, v_geom_b);
  ELSE
    v_area_a := ST_Area(p_geom_a::geography);
    v_area_b := ST_Area(p_geom_b::geography);
    v_intersection := ST_Intersection(p_geom_a, p_geom_b);
  END IF;

  -- Dimensionality guard
  IF v_intersection IS NULL OR ST_IsEmpty(v_intersection) THEN
    RETURN QUERY SELECT 
      ROUND(v_area_a::numeric, 2)::float8,
      ROUND(v_area_b::numeric, 2)::float8,
      0.0::float8,
      0.0000::float8,
      0.0000::float8,
      -1,
      true;
    RETURN;
  END IF;

  v_dim := ST_Dimension(v_intersection);

  -- Dimension < 2 means point or linestring intersection: 0.0 area
  IF v_dim < 2 THEN
    RETURN QUERY SELECT 
      ROUND(v_area_a::numeric, 2)::float8,
      ROUND(v_area_b::numeric, 2)::float8,
      0.0::float8,
      0.0000::float8,
      0.0000::float8,
      v_dim,
      false;
    RETURN;
  END IF;

  -- 2D intersection area
  IF p_use_planar THEN
    v_area_inter := ST_Area(v_intersection);
  ELSE
    v_area_inter := ST_Area(v_intersection::geography);
  END IF;

  RETURN QUERY SELECT 
    ROUND(v_area_a::numeric, 2)::float8,
    ROUND(v_area_b::numeric, 2)::float8,
    ROUND(v_area_inter::numeric, 2)::float8,
    CASE WHEN v_area_a > 0 THEN ROUND(((v_area_inter / v_area_a) * 100.0)::numeric, 4)::float8 ELSE 0.0000::float8 END,
    CASE WHEN v_area_b > 0 THEN ROUND(((v_area_inter / v_area_b) * 100.0)::numeric, 4)::float8 ELSE 0.0000::float8 END,
    v_dim,
    false;
END;
$$;

-- ─── 3. FUNCTION: fn_spatial_boundary_diff ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_spatial_boundary_diff(
  p_source_geom GEOMETRY,
  p_target_geom GEOMETRY,
  p_tolerance_m DOUBLE PRECISION DEFAULT 1.0
) RETURNS TABLE(
  source_area_m2 DOUBLE PRECISION,
  target_area_m2 DOUBLE PRECISION,
  net_change_m2 DOUBLE PRECISION,
  added_area_m2 DOUBLE PRECISION,
  removed_area_m2 DOUBLE PRECISION,
  unmodified_area_m2 DOUBLE PRECISION,
  similarity_index DOUBLE PRECISION,
  added_geom GEOMETRY,
  removed_geom GEOMETRY
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_source_area DOUBLE PRECISION;
  v_target_area DOUBLE PRECISION;
  v_added_geom GEOMETRY;
  v_removed_geom GEOMETRY;
  v_added_area DOUBLE PRECISION := 0.0;
  v_removed_area DOUBLE PRECISION := 0.0;
  v_unmodified_area DOUBLE PRECISION := 0.0;
  v_union_area DOUBLE PRECISION;
  v_npoints_src INTEGER;
  v_npoints_tgt INTEGER;
BEGIN
  -- Resource limit: 5000ms statement timeout
  SET LOCAL statement_timeout = '5000ms';

  IF p_source_geom IS NULL OR p_target_geom IS NULL THEN
    RETURN;
  END IF;

  -- Vertex complexity guard: cap at 50,000 vertices
  v_npoints_src := ST_NPoints(p_source_geom);
  v_npoints_tgt := ST_NPoints(p_target_geom);
  IF v_npoints_src > 50000 OR v_npoints_tgt > 50000 THEN
    RAISE EXCEPTION 'SPATIAL_GEOMETRY_COMPLEXITY_EXCEEDED: Vertex count exceeds 50000 limit (source: %, target: %)',
      v_npoints_src, v_npoints_tgt
      USING ERRCODE = '54000';
  END IF;

  IF NOT ST_IsValid(p_source_geom) THEN
    RAISE EXCEPTION 'INVALID_GEOMETRY: Source geometry is not geometrically valid' USING ERRCODE = '22023';
  END IF;
  IF NOT ST_IsValid(p_target_geom) THEN
    RAISE EXCEPTION 'INVALID_GEOMETRY: Target geometry is not geometrically valid' USING ERRCODE = '22023';
  END IF;

  -- Primary area standard: spheroidal geography
  v_source_area := ST_Area(p_source_geom::geography);
  v_target_area := ST_Area(p_target_geom::geography);

  -- Added area = target - source
  v_added_geom := ST_Difference(p_target_geom, p_source_geom);
  IF v_added_geom IS NOT NULL AND NOT ST_IsEmpty(v_added_geom) AND ST_Dimension(v_added_geom) = 2 THEN
    v_added_area := ST_Area(v_added_geom::geography);
  ELSE
    v_added_geom := NULL;
    v_added_area := 0.0;
  END IF;

  -- Removed area = source - target
  v_removed_geom := ST_Difference(p_source_geom, p_target_geom);
  IF v_removed_geom IS NOT NULL AND NOT ST_IsEmpty(v_removed_geom) AND ST_Dimension(v_removed_geom) = 2 THEN
    v_removed_area := ST_Area(v_removed_geom::geography);
  ELSE
    v_removed_geom := NULL;
    v_removed_area := 0.0;
  END IF;

  -- Unmodified area = source ∩ target
  IF (p_source_geom && p_target_geom) THEN
    DECLARE
      v_inter GEOMETRY := ST_Intersection(p_source_geom, p_target_geom);
    BEGIN
      IF v_inter IS NOT NULL AND NOT ST_IsEmpty(v_inter) AND ST_Dimension(v_inter) = 2 THEN
        v_unmodified_area := ST_Area(v_inter::geography);
      END IF;
    END;
  END IF;

  -- Jaccard similarity index = intersection / union
  v_union_area := v_source_area + v_target_area - v_unmodified_area;

  RETURN QUERY SELECT
    ROUND(v_source_area::numeric, 2)::float8,
    ROUND(v_target_area::numeric, 2)::float8,
    ROUND((v_target_area - v_source_area)::numeric, 2)::float8,
    ROUND(v_added_area::numeric, 2)::float8,
    ROUND(v_removed_area::numeric, 2)::float8,
    ROUND(v_unmodified_area::numeric, 2)::float8,
    CASE WHEN v_union_area > 0 THEN ROUND((v_unmodified_area / v_union_area)::numeric, 4)::float8 ELSE 1.0000::float8 END,
    v_added_geom,
    v_removed_geom;
END;
$$;

-- ─── 4. FUNCTION: fn_spatial_detect_anomalies ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_spatial_detect_anomalies(
  p_layer TEXT,
  p_bbox GEOMETRY,
  p_profile_version TEXT DEFAULT 'v1.0-standard',
  p_max_sliver_area_m2 DOUBLE PRECISION DEFAULT 1000.0,
  p_thinness_threshold DOUBLE PRECISION DEFAULT 0.05
) RETURNS TABLE(
  anomaly_type TEXT,
  entity_a_id UUID,
  entity_b_id UUID,
  anomaly_area_m2 DOUBLE PRECISION,
  severity TEXT,
  centroid GEOMETRY,
  diagnostic_details JSONB
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
  v_bbox_width DOUBLE PRECISION;
  v_bbox_height DOUBLE PRECISION;
BEGIN
  -- Resource limit: 5000ms statement timeout
  SET LOCAL statement_timeout = '5000ms';

  -- Complexity guard: bounding box dimension check (max 2.0 x 2.0 degrees)
  IF p_bbox IS NOT NULL THEN
    v_bbox_width := ST_XMax(p_bbox) - ST_XMin(p_bbox);
    v_bbox_height := ST_YMax(p_bbox) - ST_YMin(p_bbox);
    IF v_bbox_width > 2.01 OR v_bbox_height > 2.01 THEN
      RAISE EXCEPTION 'SPATIAL_QUERY_LIMIT_EXCEEDED: Bounding box exceeds maximum allowed dimensions of 2.0 x 2.0 degrees (width: %, height: %)',
        v_bbox_width, v_bbox_height
        USING ERRCODE = '54000';
    END IF;
  END IF;

  -- Feature scan limit: count candidate features within bbox
  SELECT count(*) INTO v_count
  FROM public.entity_geometries eg
  WHERE (p_bbox IS NULL OR eg.geometry && p_bbox);

  IF v_count > 100 THEN
    RAISE EXCEPTION 'SPATIAL_QUERY_LIMIT_EXCEEDED: Scanned feature count (%) exceeds maximum ceiling of 100 features',
      v_count
      USING ERRCODE = '54000';
  END IF;

  -- Detect Anomaly 1: Unintended Internal Overlaps between adjacent entities (> 100 m^2)
  RETURN QUERY
  SELECT
    'INTERNAL_OVERLAP'::TEXT AS anomaly_type,
    a.id AS entity_a_id,
    b.id AS entity_b_id,
    ROUND(ST_Area(ST_Intersection(a.geometry, b.geometry)::geography)::numeric, 2)::float8 AS anomaly_area_m2,
    CASE 
      WHEN ST_Area(ST_Intersection(a.geometry, b.geometry)::geography) > 10000 THEN 'HIGH'
      WHEN ST_Area(ST_Intersection(a.geometry, b.geometry)::geography) > 1000 THEN 'MEDIUM'
      ELSE 'LOW'
    END::TEXT AS severity,
    ST_Centroid(ST_Intersection(a.geometry, b.geometry)) AS centroid,
    jsonb_build_object(
      'profile', p_profile_version,
      'entity_a_source_feature', a.source_feature_id,
      'entity_b_source_feature', b.source_feature_id,
      'dimension', ST_Dimension(ST_Intersection(a.geometry, b.geometry))
    ) AS diagnostic_details
  FROM public.entity_geometries a
  JOIN public.entity_geometries b ON a.id < b.id
    AND a.geometry && b.geometry
    AND (p_bbox IS NULL OR a.geometry && p_bbox)
    AND ST_Overlaps(a.geometry, b.geometry)
  WHERE ST_Dimension(ST_Intersection(a.geometry, b.geometry)) = 2
    AND ST_Area(ST_Intersection(a.geometry, b.geometry)::geography) > 100.0;

  -- Detect Anomaly 2: Invalid Geometries
  RETURN QUERY
  SELECT
    'INVALID_GEOMETRY'::TEXT AS anomaly_type,
    eg.id AS entity_a_id,
    NULL::UUID AS entity_b_id,
    0.0::float8 AS anomaly_area_m2,
    'HIGH'::TEXT AS severity,
    ST_Centroid(eg.geometry) AS centroid,
    jsonb_build_object(
      'profile', p_profile_version,
      'source_feature_id', eg.source_feature_id,
      'valid_detail', (ST_IsValidDetail(eg.geometry)).reason,
      'valid_location', ST_AsText((ST_IsValidDetail(eg.geometry)).location)
    ) AS diagnostic_details
  FROM public.entity_geometries eg
  WHERE (p_bbox IS NULL OR eg.geometry && p_bbox)
    AND NOT ST_IsValid(eg.geometry);

  -- Detect Anomaly 3: Sliver Artifacts (Area < threshold AND Thinness ratio < threshold)
  RETURN QUERY
  SELECT
    'SLIVER_POLYGON'::TEXT AS anomaly_type,
    eg.id AS entity_a_id,
    NULL::UUID AS entity_b_id,
    ROUND(ST_Area(eg.geometry::geography)::numeric, 2)::float8 AS anomaly_area_m2,
    'MEDIUM'::TEXT AS severity,
    ST_Centroid(eg.geometry) AS centroid,
    jsonb_build_object(
      'profile', p_profile_version,
      'source_feature_id', eg.source_feature_id,
      'area_m2', ST_Area(eg.geometry::geography),
      'thinness_ratio', (4.0 * pi() * ST_Area(eg.geometry::geography)) / NULLIF(ST_Perimeter(eg.geometry::geography)^2, 0)
    ) AS diagnostic_details
  FROM public.entity_geometries eg
  WHERE (p_bbox IS NULL OR eg.geometry && p_bbox)
    AND ST_Area(eg.geometry::geography) < p_max_sliver_area_m2
    AND ST_Perimeter(eg.geometry::geography) > 0
    AND ((4.0 * pi() * ST_Area(eg.geometry::geography)) / (ST_Perimeter(eg.geometry::geography)^2)) < p_thinness_threshold;

  RETURN;
END;
$$;

-- ─── 5. LEAST PRIVILEGE ACL GRANTS ──────────────────────────────────────────
-- Function 1: fn_spatial_calculate_overlap
REVOKE ALL ON FUNCTION public.fn_spatial_calculate_overlap(GEOMETRY, GEOMETRY, BOOLEAN, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_spatial_calculate_overlap(GEOMETRY, GEOMETRY, BOOLEAN, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_spatial_calculate_overlap(GEOMETRY, GEOMETRY, BOOLEAN, INTEGER) TO authenticated, service_role;

-- Function 2: fn_spatial_boundary_diff
REVOKE ALL ON FUNCTION public.fn_spatial_boundary_diff(GEOMETRY, GEOMETRY, DOUBLE PRECISION) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_spatial_boundary_diff(GEOMETRY, GEOMETRY, DOUBLE PRECISION) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_spatial_boundary_diff(GEOMETRY, GEOMETRY, DOUBLE PRECISION) TO authenticated, service_role;

-- Function 3: fn_spatial_detect_anomalies
REVOKE ALL ON FUNCTION public.fn_spatial_detect_anomalies(TEXT, GEOMETRY, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_spatial_detect_anomalies(TEXT, GEOMETRY, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) FROM anon;
REVOKE ALL ON FUNCTION public.fn_spatial_detect_anomalies(TEXT, GEOMETRY, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_spatial_detect_anomalies(TEXT, GEOMETRY, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO service_role;

COMMIT;
