-- ============================================================
-- Migration 034: Political Ad Promotion Infrastructure (Lane 2)
-- ============================================================

CREATE TABLE IF NOT EXISTS political_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  mcmc_certificate_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_certification' 
    CHECK (status IN ('pending_certification', 'certified', 'rejected', 'active', 'ended')),
  amount_paid INTEGER NOT NULL DEFAULT 0,
  target_scope TEXT NOT NULL CHECK (target_scope IN ('state', 'constituency')),
  target_value TEXT,
  impressions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_political_ads_page ON political_ads(page_id);
CREATE INDEX IF NOT EXISTS idx_political_ads_status ON political_ads(status);
CREATE INDEX IF NOT EXISTS idx_political_ads_scope ON political_ads(target_scope, target_value);
CREATE INDEX IF NOT EXISTS idx_political_ads_created_at ON political_ads(created_at DESC);

-- Enable Row Level Security
ALTER TABLE political_ads ENABLE ROW LEVEL SECURITY;

-- 1. Anyone (including unauthenticated visitors for the public Ad Library) can view active and ended political ads
CREATE POLICY political_ads_public_select_policy ON political_ads
  FOR SELECT
  USING (
    status IN ('active', 'ended')
    OR (
      auth.uid() IS NOT NULL AND (
        -- Page owner can view all of their own ads regardless of status
        EXISTS (
          SELECT 1 FROM pages
          WHERE pages.id = political_ads.page_id
            AND pages.owner_id = auth.uid()
        )
        -- Admin and moderators can view all ads for the review queue
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'moderator')
        )
      )
    )
  );

-- 2. Page owners can submit an ad, but only with initial status 'pending_certification'
CREATE POLICY political_ads_insert_policy ON political_ads
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND status = 'pending_certification'
    AND EXISTS (
      SELECT 1 FROM pages
      WHERE pages.id = political_ads.page_id
        AND pages.owner_id = auth.uid()
    )
  );

-- 3. Only human reviewers (role IN ('admin', 'moderator')) can update political ad status to certified/rejected
CREATE POLICY political_ads_reviewer_update_policy ON political_ads
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'moderator')
    )
  );
