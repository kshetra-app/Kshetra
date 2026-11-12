-- Allow moderation reports to target an account while preserving existing
-- post and comment reports and their rows.

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS reported_user_id UUID
  REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_check;

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_target_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_target_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL AND reported_user_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL AND reported_user_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NULL AND reported_user_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_reports_reported_user
  ON public.reports(reported_user_id);


