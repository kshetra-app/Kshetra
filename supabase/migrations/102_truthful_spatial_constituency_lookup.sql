-- Production spatial lookup returns geography only. Current officeholders are
-- resolved separately from elected_tenures, never from deprecated columns.
BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.constituencies') IS NULL THEN
    RAISE EXCEPTION 'Cannot install spatial lookup: public.constituencies is missing';
  END IF;

  IF (
    SELECT count(*)
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'constituencies'
      AND column_name IN (
        'id', 'internal_id', 'ac_no', 'name', 'state_code',
        'district', 'reservation_status', 'boundary'
      )
  ) <> 8 THEN
    RAISE EXCEPTION 'Cannot install spatial lookup: public.constituencies is missing required geography columns';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.locate_constituency_point_truthful(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
)
RETURNS TABLE (
  id TEXT,
  internal_id UUID,
  ac_no INTEGER,
  name TEXT,
  state_code TEXT,
  district TEXT,
  reservation_status TEXT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_catalog
AS $function$
  SELECT
    c.id,
    c.internal_id,
    c.ac_no,
    c.name,
    c.state_code,
    c.district,
    c.reservation_status
  FROM public.constituencies AS c
  WHERE p_lat BETWEEN -90 AND 90
    AND p_lng BETWEEN -180 AND 180
    AND c.boundary IS NOT NULL
    AND ST_Covers(
      c.boundary,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
    )
  LIMIT 2;
$function$;

REVOKE ALL ON FUNCTION public.locate_constituency_point_truthful(DOUBLE PRECISION, DOUBLE PRECISION)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.locate_constituency_point_truthful(DOUBLE PRECISION, DOUBLE PRECISION)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.locate_constituency_point_truthful(DOUBLE PRECISION, DOUBLE PRECISION) IS
  'Returns up to two matching assembly constituency geography records. Callers must reject multiple matches; no legacy political fields are returned.';

COMMIT;
