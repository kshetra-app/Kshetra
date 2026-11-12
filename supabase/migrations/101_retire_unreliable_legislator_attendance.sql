-- Attendance is not consistently published across India's state legislatures,
-- and this repository has no verified, recurring attendance ingestion path.
-- Retire it from product-facing surfaces while retaining the legacy table for audit.
BEGIN;

DO $retire_unreliable_attendance$
DECLARE
  role_name TEXT;
BEGIN
  IF to_regclass('public.data_pipeline_status') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'data_pipeline_status'
         AND column_name = 'source'
     ) THEN
    DELETE FROM public.data_pipeline_status
    WHERE source = 'prs_attendance';
  END IF;

  IF to_regclass('public.legislator_attendance') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public read attendance"
      ON public.legislator_attendance;

    -- No client role should be able to query this legacy, unevenly sourced table.
    ALTER TABLE public.legislator_attendance ENABLE ROW LEVEL SECURITY;
    REVOKE SELECT ON TABLE public.legislator_attendance FROM PUBLIC;

    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format(
          'REVOKE SELECT ON TABLE public.legislator_attendance FROM %I',
          role_name
        );
      END IF;
    END LOOP;

    COMMENT ON TABLE public.legislator_attendance IS
      'Legacy records retained for audit only. Attendance is not exposed in Poligram because reliable, recurring coverage is not available across the supported legislatures.';
  END IF;

  IF to_regclass('public.legislator_profiles') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'legislator_profiles'
         AND column_name = 'attendance_percent'
     ) THEN
    -- These stored figures have no dependable, consistent source and the
    -- profile table is otherwise publicly readable. Clear only the unsupported
    -- attendance fields while retaining the profile rows and schema for clients.
    EXECUTE 'UPDATE public.legislator_profiles SET attendance_percent = NULL';
    ALTER TABLE public.legislator_profiles
      ALTER COLUMN attendance_percent DROP DEFAULT;

    COMMENT ON COLUMN public.legislator_profiles.attendance_percent IS
      'Deprecated. Values were cleared because reliable, recurring coverage is not available across the supported legislatures.';
  END IF;

  IF to_regclass('public.legislator_profiles') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'legislator_profiles'
         AND column_name = 'attendance_rank'
     ) THEN
    EXECUTE 'UPDATE public.legislator_profiles SET attendance_rank = NULL';
    ALTER TABLE public.legislator_profiles
      ALTER COLUMN attendance_rank DROP DEFAULT;
    COMMENT ON COLUMN public.legislator_profiles.attendance_rank IS
      'Deprecated. Values were cleared because reliable, recurring attendance coverage is not available.';
  END IF;

  IF to_regclass('public.current_legislators') IS NOT NULL
     AND to_regclass('public.legislator_profiles') IS NOT NULL THEN
    EXECUTE $current_legislators_view$
      CREATE OR REPLACE VIEW public.current_legislators AS
      SELECT
        lp.id,
        lp.full_name,
        lp.display_name,
        lp.house,
        lp.state_code,
        lp.constituency_name,
        lp.current_party,
        lp.gender,
        lp.age_at_election,
        lp.education_level,
        lp.terms_served,
        lp.is_cabinet_minister,
        lp.is_chief_minister,
        NULL::NUMERIC(5,2) AS attendance_percent,
        lp.questions_asked,
        lp.data_completeness,
        lp.photo_url,
        (
          SELECT lf.total_assets
          FROM public.legislator_finances AS lf
          WHERE lf.legislator_id = lp.id
          ORDER BY lf.election_year DESC
          LIMIT 1
        ) AS latest_total_assets,
        (
          SELECT count(*)
          FROM public.legislator_criminal_cases AS lcc
          WHERE lcc.legislator_id = lp.id
            AND lcc.status = 'pending'
        ) AS pending_cases
      FROM public.legislator_profiles AS lp
      WHERE lp.is_current_member = true
      ORDER BY lp.state_code, lp.constituency_name
    $current_legislators_view$;
  END IF;

  IF to_regclass('public.data_health_by_state') IS NOT NULL
     AND to_regclass('public.legislator_profiles') IS NOT NULL THEN
    EXECUTE $data_health_view$
      CREATE OR REPLACE VIEW public.data_health_by_state AS
      SELECT
        state_code,
        house,
        count(*) AS total_profiles,
        count(*) FILTER (WHERE is_current_member) AS current_members,
        round(avg(data_completeness), 1) AS avg_completeness,
        count(*) FILTER (WHERE photo_url IS NOT NULL) AS with_photo,
        count(*) FILTER (WHERE dob IS NOT NULL) AS with_dob,
        NULL::BIGINT AS with_performance,
        count(*) FILTER (WHERE data_completeness >= 90) AS profiles_above_90,
        count(*) FILTER (WHERE data_completeness < 50) AS profiles_below_50
      FROM public.legislator_profiles
      GROUP BY state_code, house
      ORDER BY state_code, house
    $data_health_view$;
  END IF;
END;
$retire_unreliable_attendance$;

COMMIT;
