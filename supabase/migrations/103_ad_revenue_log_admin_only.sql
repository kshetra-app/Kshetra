-- Ad revenue records contain campaign and monetary data. The original policy
-- name implied admin-only access, but its USING (true) expression allowed all
-- roles with table SELECT permission to read the log.
--
-- Keep the existing server-side service-role access intact while limiting
-- direct client reads to authenticated administrators and moderators.
ALTER POLICY "Admin read revenue"
  ON public.ad_revenue_log
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles AS profile
      WHERE profile.user_id = auth.uid()
        AND profile.role IN ('admin', 'moderator')
    )
  );
