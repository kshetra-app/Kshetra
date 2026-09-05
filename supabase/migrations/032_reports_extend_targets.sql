-- 032_reports_extend_targets.sql
-- Extend reports table to support user and direct message conversation targets (FIX-7)

ALTER TABLE reports ADD COLUMN IF NOT EXISTS reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;

-- Drop existing inline check constraint if named or alter with drop constraint
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'reports'::regclass
      AND contype = 'c'
      AND (
        conname = 'reports_check'
        OR pg_get_constraintdef(oid) LIKE '%post_id IS NOT NULL%'
      )
  ) LOOP
    EXECUTE 'ALTER TABLE reports DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- Add updated target constraint allowing post, comment, OR user target
ALTER TABLE reports ADD CONSTRAINT reports_target_check CHECK (
  (post_id IS NOT NULL AND comment_id IS NULL AND reported_user_id IS NULL) OR
  (post_id IS NULL AND comment_id IS NOT NULL AND reported_user_id IS NULL) OR
  (post_id IS NULL AND comment_id IS NULL AND reported_user_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_conversation ON reports(conversation_id);
