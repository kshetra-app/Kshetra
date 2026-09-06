-- Migration 033: Content and Department Alerts Pipeline
-- Enables real bi-directional persistence for citizen content alerts and department acknowledgments.

-- 1. Extend content_alerts for generic content references & location context
ALTER TABLE content_alerts ALTER COLUMN content_visibility_id DROP NOT NULL;
ALTER TABLE content_alerts ADD COLUMN IF NOT EXISTS content_type TEXT;
ALTER TABLE content_alerts ADD COLUMN IF NOT EXISTS content_id TEXT;
ALTER TABLE content_alerts ADD COLUMN IF NOT EXISTS state_code TEXT;
ALTER TABLE content_alerts ADD COLUMN IF NOT EXISTS constituency_id TEXT;

-- Update trigger function to tolerate null content_visibility_id
CREATE OR REPLACE FUNCTION handle_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content_visibility_id IS NOT NULL THEN
    UPDATE content_visibility
    SET alert_count = alert_count + 1,
        review_status = CASE
          WHEN review_status NOT IN ('restricted') THEN 'held'
          ELSE review_status
        END,
        updated_at = now()
    WHERE id = NEW.content_visibility_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Allow moderators, admins, and department officials to update content_alerts (to acknowledge)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'content_alerts' AND policyname = 'Moderators update content_alerts'
  ) THEN
    CREATE POLICY "Moderators update content_alerts" ON content_alerts
      FOR UPDATE
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_id = auth.uid() AND role IN ('admin', 'moderator', 'official')
        )
        OR EXISTS (
          SELECT 1 FROM constituency_moderators
          WHERE user_id = auth.uid() AND is_active = true
        )
      )
      WITH CHECK (true);
  END IF;
END $$;

-- 3. Extend lmx_department_alerts
ALTER TABLE lmx_department_alerts ALTER COLUMN live_event_id DROP NOT NULL;
ALTER TABLE lmx_department_alerts ADD COLUMN IF NOT EXISTS content_alert_id UUID;
ALTER TABLE lmx_department_alerts ADD COLUMN IF NOT EXISTS content_type TEXT;
ALTER TABLE lmx_department_alerts ADD COLUMN IF NOT EXISTS content_id TEXT;

-- 4. Enable RLS policies on lmx_department_alerts for real reads, inserts, and acknowledgments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lmx_department_alerts' AND policyname = 'Authenticated insert department alerts'
  ) THEN
    CREATE POLICY "Authenticated insert department alerts" ON lmx_department_alerts
      FOR INSERT
      WITH CHECK (auth.role() = 'authenticated' OR auth.uid()::text = reporter_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lmx_department_alerts' AND policyname = 'Read department alerts'
  ) THEN
    CREATE POLICY "Read department alerts" ON lmx_department_alerts
      FOR SELECT
      USING (
        auth.role() = 'authenticated'
        OR auth.uid()::text = reporter_id
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_id = auth.uid() AND role IN ('admin', 'moderator', 'official')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lmx_department_alerts' AND policyname = 'Officials acknowledge department alerts'
  ) THEN
    CREATE POLICY "Officials acknowledge department alerts" ON lmx_department_alerts
      FOR UPDATE
      USING (
        auth.role() = 'authenticated'
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_id = auth.uid() AND role IN ('admin', 'moderator', 'official')
        )
      )
      WITH CHECK (true);
  END IF;
END $$;
