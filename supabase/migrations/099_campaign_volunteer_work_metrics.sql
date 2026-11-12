-- Add a compact, server-side aggregate for campaign work-log metrics.
-- This is additive and does not alter existing work-log records or policies.
DO $$
BEGIN
  IF to_regclass('public.canvassing_records') IS NULL THEN
    RAISE EXCEPTION 'Cannot install campaign work metrics: public.canvassing_records is missing';
  END IF;

  IF (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'canvassing_records'
      AND column_name IN ('campaign_id', 'volunteer_id', 'status', 'start_time', 'end_time')
  ) <> 5 THEN
    RAISE EXCEPTION 'Cannot install campaign work metrics: canvassing_records is missing required columns';
  END IF;
END;
$$;

ALTER TABLE public.canvassing_records
  ADD COLUMN IF NOT EXISTS reported_by_user_id UUID
  REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.canvassing_records.reported_by_user_id IS
  'Authenticated campaign operator who recorded this work session; NULL for older records.';

CREATE OR REPLACE FUNCTION public.get_campaign_volunteer_work_metrics(p_campaign_id UUID)
RETURNS TABLE (
  volunteer_id UUID,
  tasks_completed BIGINT,
  hours_logged NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
  SELECT
    records.volunteer_id,
    COUNT(*)::BIGINT AS tasks_completed,
    CASE
      WHEN BOOL_AND(
        records.start_time IS NOT NULL
        AND records.end_time IS NOT NULL
        AND records.end_time > records.start_time
        AND records.end_time <= records.start_time + INTERVAL '24 hours'
        AND records.end_time <= NOW() + INTERVAL '5 minutes'
      )
      THEN ROUND(
        SUM(EXTRACT(EPOCH FROM (records.end_time - records.start_time))::NUMERIC) / 3600,
        2
      )
      ELSE NULL::NUMERIC
    END AS hours_logged
  FROM public.canvassing_records AS records
  WHERE records.campaign_id = p_campaign_id
    AND records.status = 'completed'
  GROUP BY records.volunteer_id;
$function$;

COMMENT ON FUNCTION public.get_campaign_volunteer_work_metrics(UUID) IS
  'Returns completed campaign work-log counts and valid recorded hours per volunteer. Invalid durations produce NULL hours.';

REVOKE ALL ON FUNCTION public.get_campaign_volunteer_work_metrics(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_volunteer_work_metrics(UUID) TO service_role;
