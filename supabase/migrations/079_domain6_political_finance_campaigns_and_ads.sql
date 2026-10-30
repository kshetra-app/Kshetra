-- 079_domain6_political_finance_campaigns_and_ads.sql
-- Canonical Migration for Domain 6: Political Finance, Campaign Management, Advertising & Monetization Engine (JOB 054–061)
-- Ratified under DEC-186 & Master Product Blueprint (Representation of the People Act 1951, Section 127A & ECI MCMC Guidelines)

-- ─── 1. Political Campaigns & Team RBAC (JOB 054) ───
CREATE TABLE IF NOT EXISTS political_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID,
  organization_id UUID,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  state_code TEXT NOT NULL,
  target_constituency_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_budget_inr NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (total_budget_inr >= 0),
  spent_budget_inr NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (spent_budget_inr >= 0),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_political_campaigns_ac ON political_campaigns(target_constituency_id);
CREATE INDEX IF NOT EXISTS idx_political_campaigns_status ON political_campaigns(status);

CREATE TABLE IF NOT EXISTS political_campaign_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES political_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('campaign_manager', 'content_creator', 'field_director', 'finance_officer', 'analyst')),
  permissions TEXT[] DEFAULT '{}',
  invite_token TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_political_campaign_members_camp ON political_campaign_members(campaign_id);

-- ─── 2. Campaign Communication & Multi-Modality Workflow (JOB 056) ───
CREATE TABLE IF NOT EXISTS political_campaign_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES political_campaigns(id) ON DELETE CASCADE,
  modality TEXT NOT NULL CHECK (modality IN ('post', 'short', 'event', 'rally', 'broadcast_announcement')),
  title TEXT NOT NULL,
  body_text TEXT DEFAULT '',
  media_urls TEXT[] DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  event_location TEXT,
  target_constituency_id TEXT NOT NULL,
  workflow_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (workflow_status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'PUBLISHED', 'REJECTED')),
  created_by UUID NOT NULL,
  created_by_name TEXT NOT NULL,
  reviewed_by UUID,
  reviewed_by_name TEXT,
  review_note TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_content_camp ON political_campaign_content(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_content_status ON political_campaign_content(workflow_status);

-- ─── 3. Political Advertising & 6-Category Adaptive Governance (JOB 057) ───
CREATE TABLE IF NOT EXISTS political_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES political_campaigns(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN (
    'festival_wishes',
    'birthday_congratulatory',
    'milestone_achievement',
    'rally_meeting',
    'election_campaign',
    'issue_advocacy'
  )),
  title TEXT NOT NULL,
  headline TEXT NOT NULL,
  body_text TEXT DEFAULT '',
  media_url TEXT,
  target_scope TEXT NOT NULL DEFAULT 'constituency' CHECK (target_scope IN ('constituency', 'district', 'state')),
  target_constituency_id TEXT NOT NULL,
  sponsor_name TEXT NOT NULL,
  disclaimer_text TEXT NOT NULL,
  electoral_window_state TEXT NOT NULL DEFAULT 'ROUTINE_CIVIC' CHECK (electoral_window_state IN ('ROUTINE_CIVIC', 'MCC_ACTIVE')),
  mcmc_certificate_id TEXT,
  mcmc_certificate_pdf_url TEXT,
  statutory_candidate_id UUID,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'active', 'paused', 'completed', 'rejected')),
  pricing_model TEXT NOT NULL DEFAULT 'cpm' CHECK (pricing_model IN ('cpm', 'cpc', 'fixed_daily_flight')),
  flight_start_date DATE NOT NULL,
  flight_end_date DATE NOT NULL,
  daily_budget_inr NUMERIC(12,2) NOT NULL DEFAULT 500.00 CHECK (daily_budget_inr >= 0),
  total_budget_inr NUMERIC(14,2) NOT NULL DEFAULT 1000.00 CHECK (total_budget_inr >= 0),
  spent_amount_inr NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (spent_amount_inr >= 0),
  impressions_count INTEGER NOT NULL DEFAULT 0,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_political_ads_ac ON political_ads(target_constituency_id);
CREATE INDEX IF NOT EXISTS idx_political_ads_status ON political_ads(status);
CREATE INDEX IF NOT EXISTS idx_political_ads_category ON political_ads(category);

-- ─── 4. Commercial Merchant Accounts & Commercial Ads (JOB 058) ───
CREATE TABLE IF NOT EXISTS commercial_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  trade_name TEXT,
  gstin TEXT,
  pan TEXT,
  business_category TEXT NOT NULL CHECK (business_category IN ('retail', 'dining', 'healthcare', 'education', 'services', 'real_estate', 'other')),
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  address_street TEXT NOT NULL,
  mandal_name TEXT,
  constituency_id TEXT NOT NULL,
  state_code TEXT NOT NULL,
  wallet_balance_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (wallet_balance_inr >= 0),
  total_recharged_inr NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (total_recharged_inr >= 0),
  total_spent_inr NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (total_spent_inr >= 0),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commercial_accounts_ac ON commercial_ad_accounts(constituency_id);
CREATE INDEX IF NOT EXISTS idx_commercial_accounts_phone ON commercial_ad_accounts(contact_phone);

CREATE TABLE IF NOT EXISTS commercial_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES commercial_ad_accounts(id) ON DELETE CASCADE,
  headline TEXT NOT NULL,
  body_text TEXT DEFAULT '',
  media_asset_url TEXT,
  cta_type TEXT NOT NULL DEFAULT 'website' CHECK (cta_type IN ('website', 'phone', 'whatsapp', 'directions')),
  cta_target TEXT NOT NULL,
  placement_slot TEXT NOT NULL DEFAULT 'feed_inline' CHECK (placement_slot IN ('feed_inline', 'shorts_interstitial', 'constituency_banner')),
  pricing_model TEXT NOT NULL DEFAULT 'cpm' CHECK (pricing_model IN ('cpm', 'cpc', 'fixed_daily_flight')),
  target_constituency_id TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  daily_budget_inr NUMERIC(12,2) NOT NULL DEFAULT 500.00 CHECK (daily_budget_inr >= 0),
  total_budget_inr NUMERIC(14,2) NOT NULL DEFAULT 1000.00 CHECK (total_budget_inr >= 0),
  spent_amount_inr NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (spent_amount_inr >= 0),
  impressions_count INTEGER NOT NULL DEFAULT 0,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  frequency_cap_per_user_24h INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'review' CHECK (status IN ('draft', 'review', 'active', 'paused', 'completed', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commercial_ads_ac ON commercial_ads(target_constituency_id);
CREATE INDEX IF NOT EXISTS idx_commercial_ads_status ON commercial_ads(status);

-- ─── 5. Dynamic Backend/Admin Pricing Engine (JOB 060) ───
CREATE TABLE IF NOT EXISTS ad_pricing_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_model TEXT NOT NULL CHECK (pricing_model IN ('cpm', 'cpc', 'fixed_daily_flight')),
  placement_slot TEXT NOT NULL CHECK (placement_slot IN ('feed_inline', 'shorts_interstitial', 'constituency_banner')),
  ad_type TEXT NOT NULL CHECK (ad_type IN ('political', 'commercial')),
  tier TEXT NOT NULL CHECK (tier IN ('tier_1_metro', 'tier_2_urban', 'tier_3_rural')),
  base_rate_inr NUMERIC(10,2) NOT NULL CHECK (base_rate_inr > 0),
  seasonal_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00 CHECK (seasonal_multiplier >= 0.5),
  min_budget_inr NUMERIC(10,2) NOT NULL DEFAULT 500.00 CHECK (min_budget_inr > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pricing_model, placement_slot, ad_type, tier)
);

-- Seed default pricing configurations
INSERT INTO ad_pricing_configurations (pricing_model, placement_slot, ad_type, tier, base_rate_inr, seasonal_multiplier, min_budget_inr)
VALUES
  ('cpm', 'feed_inline', 'commercial', 'tier_1_metro', 150.00, 1.00, 500.00),
  ('cpm', 'feed_inline', 'commercial', 'tier_2_urban', 100.00, 1.00, 500.00),
  ('cpm', 'feed_inline', 'commercial', 'tier_3_rural', 75.00, 1.00, 500.00),
  ('cpc', 'feed_inline', 'commercial', 'tier_1_metro', 5.00, 1.00, 500.00),
  ('cpc', 'feed_inline', 'commercial', 'tier_2_urban', 3.50, 1.00, 500.00),
  ('cpc', 'feed_inline', 'commercial', 'tier_3_rural', 2.50, 1.00, 500.00),
  ('fixed_daily_flight', 'constituency_banner', 'commercial', 'tier_1_metro', 1500.00, 1.00, 1500.00),
  ('fixed_daily_flight', 'constituency_banner', 'commercial', 'tier_2_urban', 1000.00, 1.00, 1000.00),
  ('fixed_daily_flight', 'constituency_banner', 'commercial', 'tier_3_rural', 750.00, 1.00, 750.00),
  ('cpm', 'feed_inline', 'political', 'tier_1_metro', 200.00, 1.00, 1000.00),
  ('cpm', 'feed_inline', 'political', 'tier_2_urban', 150.00, 1.00, 1000.00),
  ('cpm', 'feed_inline', 'political', 'tier_3_rural', 100.00, 1.00, 1000.00),
  ('fixed_daily_flight', 'constituency_banner', 'political', 'tier_1_metro', 3000.00, 1.00, 3000.00),
  ('fixed_daily_flight', 'constituency_banner', 'political', 'tier_2_urban', 2000.00, 1.00, 2000.00),
  ('fixed_daily_flight', 'constituency_banner', 'political', 'tier_3_rural', 1200.00, 1.00, 1200.00)
ON CONFLICT (pricing_model, placement_slot, ad_type, tier) DO NOTHING;

-- ─── 6. High-Throughput Telemetry & Anti-Fraud (JOB 059) ───
CREATE TABLE IF NOT EXISTS ad_telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('political', 'commercial')),
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
  target_constituency_id TEXT NOT NULL,
  view_token TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  user_session_hash TEXT NOT NULL,
  is_ivt_filtered BOOLEAN NOT NULL DEFAULT false,
  filter_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_ad_event ON ad_telemetry_events(ad_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_telemetry_session ON ad_telemetry_events(user_session_hash, created_at);

-- ─── 7. Double-Entry Financial Invoicing & GST (JOB 060) ───
CREATE TABLE IF NOT EXISTS gst_tax_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  account_type TEXT NOT NULL CHECK (account_type IN ('political', 'commercial')),
  account_id UUID NOT NULL,
  billed_entity_name TEXT NOT NULL,
  billed_entity_gstin TEXT,
  hsn_sac_code TEXT NOT NULL DEFAULT '998311',
  taxable_amount_inr NUMERIC(12,2) NOT NULL CHECK (taxable_amount_inr >= 0),
  cgst_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  sgst_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  igst_inr NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_amount_inr NUMERIC(12,2) NOT NULL CHECK (total_amount_inr >= 0),
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'paid', 'cancelled')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_account ON gst_tax_invoices(account_type, account_id);

-- Add reference_id and double_entry columns to wallet_transactions if not existing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallet_transactions' AND column_name = 'reference_id'
  ) THEN
    ALTER TABLE wallet_transactions ADD COLUMN reference_id UUID;
    ALTER TABLE wallet_transactions ADD COLUMN tax_invoice_id UUID REFERENCES gst_tax_invoices(id);
    ALTER TABLE wallet_transactions ADD COLUMN double_entry_type TEXT CHECK (double_entry_type IN ('debit_spend', 'credit_recharge', 'refund', 'adjustment'));
  END IF;
END $$;
