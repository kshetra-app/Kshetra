-- 017: Campaign Manager & Ad Engine
-- Campaigns, ads, targeting, volunteers, booth strategy, canvassing, A/B tests, revenue tracking

-- ─── Campaigns ───
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID NOT NULL REFERENCES politician_portal_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('election','awareness','fundraising','outreach','issue_advocacy','brand_building','get_out_vote')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','planned','active','paused','completed','cancelled')),
  state_code TEXT NOT NULL,
  target_constituencies INTEGER[] DEFAULT '{}',
  target_districts TEXT[] DEFAULT '{}',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_budget_inr NUMERIC(14,2) DEFAULT 0,
  spent_budget_inr NUMERIC(14,2) DEFAULT 0,
  ad_count INTEGER DEFAULT 0,
  volunteer_count INTEGER DEFAULT 0,
  booths_covered INTEGER DEFAULT 0,
  total_booths INTEGER DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  engagements BIGINT DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  sentiment_score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_politician ON campaigns(politician_id);
CREATE INDEX idx_campaigns_state ON campaigns(state_code);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- ─── Ad Creatives ───
CREATE TABLE IF NOT EXISTS ad_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('promoted_post','banner','video_ad','carousel','native_story','constituency_spotlight','push_notification','sms_blast','whatsapp_broadcast')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','approved','active','paused','completed','rejected','expired')),
  name TEXT NOT NULL,
  headline TEXT NOT NULL,
  body TEXT DEFAULT '',
  call_to_action TEXT DEFAULT '',
  media_urls TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  landing_url TEXT,
  targeting JSONB DEFAULT '{}',
  budget JSONB DEFAULT '{}',
  schedule JSONB DEFAULT '{}',
  performance JSONB DEFAULT '{"impressions":0,"reach":0,"clicks":0,"engagements":0,"shares":0,"ctr":0,"cpm":0,"cpc":0,"cpe":0,"frequency":0,"spend":0,"conversions":0,"conversionRate":0,"roi":0}',
  ab_test_id UUID,
  ab_variant TEXT CHECK (ab_variant IN ('A','B','C')),
  disclosure_text TEXT DEFAULT '',
  paid_for_by TEXT DEFAULT '',
  eci_disclosure_id TEXT,
  is_eci_compliant BOOLEAN DEFAULT FALSE,
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ads_campaign ON ad_creatives(campaign_id);
CREATE INDEX idx_ads_status ON ad_creatives(status);
CREATE INDEX idx_ads_format ON ad_creatives(format);

-- ─── A/B Tests ───
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','stopped')),
  variants JSONB DEFAULT '[]',
  winner_id UUID,
  winner_variant TEXT,
  confidence_level NUMERIC(5,2) DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ─── Volunteers ───
CREATE TABLE IF NOT EXISTS campaign_volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('canvasser','booth_agent','social_media','logistics','data_entry','coordinator','driver','caller')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended','blacklisted')),
  assigned_booths TEXT[] DEFAULT '{}',
  assigned_wards INTEGER[] DEFAULT '{}',
  constituency_ac_no INTEGER,
  tasks_completed INTEGER DEFAULT 0,
  hours_logged NUMERIC(8,2) DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, campaign_id)
);

CREATE INDEX idx_volunteers_campaign ON campaign_volunteers(campaign_id);

-- ─── Booth Strategy ───
CREATE TABLE IF NOT EXISTS booth_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  booth_id TEXT NOT NULL,
  booth_name TEXT NOT NULL,
  booth_number TEXT NOT NULL,
  constituency_ac_no INTEGER NOT NULL,
  ward_no INTEGER,
  total_voters INTEGER DEFAULT 0,
  estimated_turnout NUMERIC(5,2) DEFAULT 0,
  target_votes INTEGER DEFAULT 0,
  historical_results JSONB DEFAULT '[]',
  assigned_volunteers TEXT[] DEFAULT '{}',
  agent_id UUID,
  agent_name TEXT,
  agent_phone TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','canvassing','ready','polling_day','counted')),
  canvassing_completion NUMERIC(5,2) DEFAULT 0,
  support_estimate NUMERIC(5,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, booth_id)
);

CREATE INDEX idx_booths_campaign ON booth_strategies(campaign_id);
CREATE INDEX idx_booths_ac ON booth_strategies(constituency_ac_no);
CREATE INDEX idx_booths_priority ON booth_strategies(priority);

-- ─── Canvassing Records ───
CREATE TABLE IF NOT EXISTS canvassing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES campaign_volunteers(id),
  booth_id TEXT NOT NULL,
  booth_name TEXT DEFAULT '',
  ward_no INTEGER,
  constituency_ac_no INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('not_started','in_progress','completed','follow_up_needed')),
  households_visited INTEGER DEFAULT 0,
  households_total INTEGER DEFAULT 0,
  supporter_count INTEGER DEFAULT 0,
  opposition_count INTEGER DEFAULT 0,
  undecided_count INTEGER DEFAULT 0,
  issues_raised TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  gps_track JSONB DEFAULT '[]',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_canvassing_campaign ON canvassing_records(campaign_id);
CREATE INDEX idx_canvassing_booth ON canvassing_records(booth_id);

-- ─── Ad Revenue Tracking ───
CREATE TABLE IF NOT EXISTS ad_revenue_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ad_creatives(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  politician_id UUID NOT NULL,
  amount_inr NUMERIC(10,2) NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression','click','engagement','conversion')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_revenue_campaign ON ad_revenue_log(campaign_id);
CREATE INDEX idx_revenue_date ON ad_revenue_log(created_at DESC);

-- ─── Views ───
CREATE OR REPLACE VIEW campaign_dashboard AS
SELECT
  c.id,
  c.name,
  c.type,
  c.status,
  c.state_code,
  c.total_budget_inr,
  c.spent_budget_inr,
  CASE WHEN c.total_budget_inr > 0 THEN ROUND((c.spent_budget_inr / c.total_budget_inr) * 100, 1) ELSE 0 END as budget_utilization,
  c.impressions,
  c.reach,
  c.engagements,
  CASE WHEN c.impressions > 0 THEN ROUND((c.engagements::NUMERIC / c.impressions) * 100, 2) ELSE 0 END as engagement_rate,
  (SELECT COUNT(*) FROM ad_creatives WHERE campaign_id = c.id AND status = 'active') as active_ads,
  (SELECT COUNT(*) FROM campaign_volunteers WHERE campaign_id = c.id AND status = 'active') as active_volunteers,
  (SELECT COUNT(*) FROM booth_strategies WHERE campaign_id = c.id AND status = 'ready') as booths_ready,
  (SELECT COUNT(*) FROM booth_strategies WHERE campaign_id = c.id) as total_booths,
  pp.display_name as politician_name,
  pp.party
FROM campaigns c
JOIN politician_portal_profiles pp ON c.politician_id = pp.id;

CREATE OR REPLACE VIEW revenue_summary AS
SELECT
  DATE_TRUNC('month', created_at) as month,
  SUM(amount_inr) as total_revenue,
  COUNT(DISTINCT campaign_id) as campaigns,
  COUNT(DISTINCT politician_id) as politicians,
  COUNT(*) as transactions
FROM ad_revenue_log
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- ─── Triggers ───
CREATE OR REPLACE FUNCTION update_campaign_ad_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaigns SET ad_count = (SELECT COUNT(*) FROM ad_creatives WHERE campaign_id = NEW.campaign_id) WHERE id = NEW.campaign_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ad_count AFTER INSERT OR DELETE ON ad_creatives FOR EACH ROW EXECUTE FUNCTION update_campaign_ad_count();

CREATE OR REPLACE FUNCTION update_campaign_volunteer_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaigns SET volunteer_count = (SELECT COUNT(*) FROM campaign_volunteers WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id) AND status = 'active') WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_volunteer_count AFTER INSERT OR UPDATE OR DELETE ON campaign_volunteers FOR EACH ROW EXECUTE FUNCTION update_campaign_volunteer_count();

-- ─── RLS ───
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE booth_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvassing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_revenue_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Politicians read own campaigns" ON campaigns FOR SELECT USING (politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Politicians manage own campaigns" ON campaigns FOR ALL USING (politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Campaign owners read ads" ON ad_creatives FOR SELECT USING (campaign_id IN (SELECT id FROM campaigns WHERE politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid())));
CREATE POLICY "Campaign owners manage ads" ON ad_creatives FOR ALL USING (campaign_id IN (SELECT id FROM campaigns WHERE politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid())));

CREATE POLICY "Campaign owners read tests" ON ab_tests FOR SELECT USING (campaign_id IN (SELECT id FROM campaigns WHERE politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid())));

CREATE POLICY "Volunteers read own records" ON campaign_volunteers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Auth join as volunteer" ON campaign_volunteers FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Campaign owners read booths" ON booth_strategies FOR SELECT USING (campaign_id IN (SELECT id FROM campaigns WHERE politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid())));
CREATE POLICY "Campaign owners manage booths" ON booth_strategies FOR ALL USING (campaign_id IN (SELECT id FROM campaigns WHERE politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid())));

CREATE POLICY "Volunteers read canvassing" ON canvassing_records FOR SELECT USING (volunteer_id IN (SELECT id FROM campaign_volunteers WHERE user_id = auth.uid()));
CREATE POLICY "Volunteers insert canvassing" ON canvassing_records FOR INSERT WITH CHECK (volunteer_id IN (SELECT id FROM campaign_volunteers WHERE user_id = auth.uid()));

CREATE POLICY "Admin read revenue" ON ad_revenue_log FOR SELECT USING (true);
