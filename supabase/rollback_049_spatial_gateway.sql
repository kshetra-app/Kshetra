-- ==============================================================================
-- Rollback 049: Spatial Gateway, Boundary Diff & Spatial Query Engine
-- Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY
-- Drops the 3 spatial analytical stored functions
-- ==============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.fn_spatial_calculate_overlap(GEOMETRY, GEOMETRY, BOOLEAN, INTEGER);
DROP FUNCTION IF EXISTS public.fn_spatial_boundary_diff(GEOMETRY, GEOMETRY, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS public.fn_spatial_detect_anomalies(TEXT, GEOMETRY, TEXT, DOUBLE PRECISION, DOUBLE PRECISION);

COMMIT;
