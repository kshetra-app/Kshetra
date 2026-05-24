-- 015: Journalist Platform
-- Journalist profiles, articles, fact-checks, breaking news, tips, assignments

-- ─── Journalist Profiles ───
CREATE TABLE IF NOT EXISTS journalist_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  tier TEXT NOT NULL DEFAULT 'citizen' CHECK (tier IN ('citizen','stringer','correspondent','senior','editor','bureau_chief')),
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','pending','verified','rejected','suspended','revoked')),
  press_card_url TEXT,
  outlet_affiliation TEXT,
  outlet_role TEXT,
  beats TEXT[] DEFAULT '{}',
  coverage_areas JSONB DEFAULT '[]',
  portfolio_url TEXT,
  social_links JSONB DEFAULT '[]',
  reputation INTEGER DEFAULT 0,
  total_articles INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_tips INTEGER DEFAULT 0,
  total_earnings NUMERIC(12,2) DEFAULT 0,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  is_available_for_assignment BOOLEAN DEFAULT true,
  featured_article_ids UUID[] DEFAULT '{}',
  badges JSONB DEFAULT '[]',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ─── Articles ───
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES journalist_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('breaking_news','news_report','investigation','opinion','editorial','photo_essay','video_report','audio_report','data_story','interview','ground_report','explainer')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','fact_checking','approved','published','rejected','retracted','archived')),
  headline TEXT NOT NULL,
  subheadline TEXT,
  slug TEXT UNIQUE,
  body JSONB DEFAULT '[]',
  summary TEXT DEFAULT '',
  cover_image_url TEXT,
  media JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  beats TEXT[] DEFAULT '{}',
  sources JSONB DEFAULT '[]',
  location JSONB,
  word_count INTEGER DEFAULT 0,
  read_time_minutes INTEGER DEFAULT 1,
  views BIGINT DEFAULT 0,
  shares INTEGER DEFAULT 0,
  tips INTEGER DEFAULT 0,
  tip_amount_total NUMERIC(12,2) DEFAULT 0,
  reactions JSONB DEFAULT '{"like":0,"insightful":0,"important":0,"misleading":0}',
  comments INTEGER DEFAULT 0,
  fact_check_id UUID,
  is_breaking BOOLEAN DEFAULT FALSE,
  breaking_priority TEXT CHECK (breaking_priority IN ('flash','urgent','developing','update')),
  is_editor_pick BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  reviewed_by UUID,
  review_note TEXT,
  related_article_ids UUID[] DEFAULT '{}',
  constituency_ac_no INTEGER,
  state_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_articles_author ON articles(author_id);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_state ON articles(state_code);
CREATE INDEX idx_articles_published ON articles(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_articles_breaking ON articles(is_breaking, breaking_priority) WHERE is_breaking = TRUE;

-- ─── Fact Checks ───
CREATE TABLE IF NOT EXISTS fact_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id),
  claim_text TEXT NOT NULL,
  claim_source TEXT NOT NULL,
  claim_date DATE,
  verdict TEXT NOT NULL CHECK (verdict IN ('true','mostly_true','half_true','mostly_false','false','misleading','unverifiable','satire','out_of_context')),
  explanation TEXT NOT NULL,
  evidence JSONB DEFAULT '[]',
  checked_by UUID NOT NULL REFERENCES journalist_profiles(id),
  reviewed_by UUID,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Breaking News ───
CREATE TABLE IF NOT EXISTS breaking_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority TEXT NOT NULL CHECK (priority IN ('flash','urgent','developing','update')),
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  article_id UUID REFERENCES articles(id),
  author_id UUID NOT NULL REFERENCES journalist_profiles(id),
  state_code TEXT,
  constituency_ac_no INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  updates JSONB DEFAULT '[]',
  update_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Tip Transactions ───
CREATE TABLE IF NOT EXISTS tip_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id),
  to_journalist_id UUID NOT NULL REFERENCES journalist_profiles(id),
  article_id UUID NOT NULL REFERENCES articles(id),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'INR',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Editorial Assignments ───
CREATE TABLE IF NOT EXISTS editorial_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  editor_id UUID NOT NULL REFERENCES journalist_profiles(id),
  journalist_id UUID NOT NULL REFERENCES journalist_profiles(id),
  beat TEXT NOT NULL,
  state_code TEXT NOT NULL,
  constituency_ac_no INTEGER,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','accepted','in_progress','submitted','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Triggers ───
CREATE OR REPLACE FUNCTION update_journalist_article_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    UPDATE journalist_profiles SET total_articles = total_articles + 1 WHERE id = NEW.author_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_article_publish
  AFTER INSERT OR UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_journalist_article_count();

CREATE OR REPLACE FUNCTION update_journalist_tips()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE journalist_profiles
  SET total_tips = total_tips + 1,
      total_earnings = total_earnings + NEW.amount
  WHERE id = NEW.to_journalist_id;
  UPDATE articles SET tips = tips + 1, tip_amount_total = tip_amount_total + NEW.amount WHERE id = NEW.article_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tip_received
  AFTER INSERT ON tip_transactions
  FOR EACH ROW EXECUTE FUNCTION update_journalist_tips();

-- ─── RLS ───
ALTER TABLE journalist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaking_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE tip_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE editorial_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read journalist profiles" ON journalist_profiles FOR SELECT USING (true);
CREATE POLICY "Users manage own journalist profile" ON journalist_profiles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public read published articles" ON articles FOR SELECT USING (status = 'published' OR author_id IN (SELECT id FROM journalist_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Authors manage own articles" ON articles FOR ALL USING (author_id IN (SELECT id FROM journalist_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public read fact checks" ON fact_checks FOR SELECT USING (published_at IS NOT NULL);
CREATE POLICY "Public read breaking news" ON breaking_news FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read tips" ON tip_transactions FOR SELECT USING (true);
CREATE POLICY "Auth insert tips" ON tip_transactions FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Journalist read assignments" ON editorial_assignments FOR SELECT USING (
  journalist_id IN (SELECT id FROM journalist_profiles WHERE user_id = auth.uid()) OR
  editor_id IN (SELECT id FROM journalist_profiles WHERE user_id = auth.uid())
);
