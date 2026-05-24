-- 018: Enhanced Civic Metrics
-- Budget tracking, RTI, legislator attendance, bills, schemes, projects, hearings

-- ─── Budget Allocations ───
CREATE TABLE IF NOT EXISTS budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('education','healthcare','infrastructure','agriculture','social_welfare','law_enforcement','rural_development','urban_development','environment','industry','defence','debt_servicing','salaries','other')),
  allocated_crores NUMERIC(12,2) NOT NULL,
  revised_crores NUMERIC(12,2),
  actual_spent_crores NUMERIC(12,2),
  utilization_percent NUMERIC(5,2) DEFAULT 0,
  constituency_ac_no INTEGER,
  district_name TEXT,
  scheme_name TEXT,
  source TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_state_year ON budget_allocations(state_code, fiscal_year);
CREATE INDEX idx_budget_category ON budget_allocations(category);
CREATE INDEX idx_budget_ac ON budget_allocations(constituency_ac_no);

-- ─── State Budget Summaries ───
CREATE TABLE IF NOT EXISTS state_budget_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  total_budget_crores NUMERIC(14,2) NOT NULL,
  total_revised_crores NUMERIC(14,2),
  total_spent_crores NUMERIC(14,2),
  overall_utilization NUMERIC(5,2) DEFAULT 0,
  category_breakdown JSONB DEFAULT '[]',
  top_schemes JSONB DEFAULT '[]',
  fiscal_deficit_crores NUMERIC(14,2) DEFAULT 0,
  revenue_deficit_crores NUMERIC(14,2) DEFAULT 0,
  debt_to_gdp_ratio NUMERIC(5,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(state_code, fiscal_year)
);

-- ─── RTI Requests ───
CREATE TABLE IF NOT EXISTS rti_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','filed','acknowledged','first_appeal','second_appeal','information_received','denied','partial_response','transferred','closed')),
  department TEXT NOT NULL,
  authority TEXT NOT NULL,
  subject TEXT NOT NULL,
  question_text TEXT NOT NULL,
  state_code TEXT NOT NULL,
  district_name TEXT,
  constituency_ac_no INTEGER,
  filed_date DATE,
  acknowledged_date DATE,
  response_date DATE,
  response_text TEXT,
  attachment_urls TEXT[] DEFAULT '{}',
  response_attachment_urls TEXT[] DEFAULT '{}',
  first_appeal_date DATE,
  second_appeal_date DATE,
  fees NUMERIC(8,2) DEFAULT 10,
  is_public BOOLEAN DEFAULT TRUE,
  upvotes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rti_user ON rti_requests(user_id);
CREATE INDEX idx_rti_state ON rti_requests(state_code);
CREATE INDEX idx_rti_status ON rti_requests(status);

-- ─── Legislator Attendance ───
CREATE TABLE IF NOT EXISTS legislator_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legislator_name TEXT NOT NULL,
  party TEXT NOT NULL,
  state_code TEXT NOT NULL,
  constituency_ac_no INTEGER,
  session_year TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('assembly_session','committee_meeting','question_hour','debate','voting','zero_hour')),
  total_sessions INTEGER NOT NULL,
  attended INTEGER NOT NULL,
  attendance_percent NUMERIC(5,2) DEFAULT 0,
  questions_asked INTEGER DEFAULT 0,
  debates_participated INTEGER DEFAULT 0,
  private_member_bills INTEGER DEFAULT 0,
  ranking INTEGER,
  total_legislators INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(legislator_name, state_code, session_year, type)
);

CREATE INDEX idx_attendance_state ON legislator_attendance(state_code);
CREATE INDEX idx_attendance_ac ON legislator_attendance(constituency_ac_no);

-- ─── Bills / Legislation ───
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  short_title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ordinary','money','finance','constitutional_amendment','private_member')),
  status TEXT NOT NULL DEFAULT 'introduced' CHECK (status IN ('introduced','first_reading','committee_review','second_reading','passed_lower','passed_upper','presidential_assent','enacted','lapsed','withdrawn','referred_select')),
  introduced_by TEXT NOT NULL,
  introduced_by_party TEXT,
  house_introduced TEXT NOT NULL CHECK (house_introduced IN ('lok_sabha','rajya_sabha','state_assembly','state_council')),
  state_code TEXT,
  introduced_date DATE NOT NULL,
  last_action_date DATE,
  summary TEXT DEFAULT '',
  full_text_url TEXT,
  committee_report_url TEXT,
  related_departments TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  affected_constituencies INTEGER[] DEFAULT '{}',
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  votes_abstain INTEGER DEFAULT 0,
  public_opinion JSONB DEFAULT '{"support":0,"oppose":0,"neutral":0}',
  amendments JSONB DEFAULT '[]',
  timeline JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_state ON bills(state_code);
CREATE INDEX idx_bills_date ON bills(introduced_date DESC);

-- ─── Government Schemes ───
CREATE TABLE IF NOT EXISTS government_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('agriculture','education','health','housing','employment','social_security','women_child','skill_development','digital','infrastructure','rural','urban','tribal','minority')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','completed','merged','discontinued')),
  launched_date DATE NOT NULL,
  ministry TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('central','state','joint')),
  state_code TEXT,
  description TEXT DEFAULT '',
  eligibility TEXT DEFAULT '',
  benefits TEXT DEFAULT '',
  application_url TEXT,
  budget_crores NUMERIC(14,2) DEFAULT 0,
  beneficiaries_target BIGINT DEFAULT 0,
  beneficiaries_actual BIGINT DEFAULT 0,
  coverage_percent NUMERIC(5,2) DEFAULT 0,
  district_wise_coverage JSONB DEFAULT '[]',
  constituency_wise_coverage JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schemes_category ON government_schemes(category);
CREATE INDEX idx_schemes_state ON government_schemes(state_code);
CREATE INDEX idx_schemes_status ON government_schemes(status);

-- ─── Development Projects ───
CREATE TABLE IF NOT EXISTS development_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('road','bridge','flyover','school','hospital','water_supply','sewage','electricity','housing','community_hall','park','stadium','market','bus_depot','railway','metro','airport','port','irrigation','dam')),
  phase TEXT NOT NULL DEFAULT 'proposed' CHECK (phase IN ('proposed','approved','tendered','under_construction','delayed','completed','inaugurated','cancelled','stalled')),
  state_code TEXT NOT NULL,
  district_name TEXT NOT NULL,
  constituency_ac_no INTEGER,
  ward_no INTEGER,
  description TEXT DEFAULT '',
  contractor TEXT,
  sanctioned_cost_crores NUMERIC(12,2) NOT NULL,
  revised_cost_crores NUMERIC(12,2),
  expenditure_crores NUMERIC(12,2) DEFAULT 0,
  sanctioned_date DATE NOT NULL,
  expected_completion DATE NOT NULL,
  actual_completion DATE,
  delay_days INTEGER DEFAULT 0,
  physical_progress NUMERIC(5,2) DEFAULT 0,
  financial_progress NUMERIC(5,2) DEFAULT 0,
  gps_lat NUMERIC(10,7),
  gps_lng NUMERIC(10,7),
  photos JSONB DEFAULT '[]',
  milestones JSONB DEFAULT '[]',
  issues TEXT[] DEFAULT '{}',
  last_inspection JSONB,
  source TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_state ON development_projects(state_code);
CREATE INDEX idx_projects_ac ON development_projects(constituency_ac_no);
CREATE INDEX idx_projects_phase ON development_projects(phase);
CREATE INDEX idx_projects_category ON development_projects(category);

-- ─── Public Hearings ───
CREATE TABLE IF NOT EXISTS public_hearings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('public_hearing','gram_sabha','ward_meeting','town_hall','environment_clearance','land_acquisition','budget_consultation','grievance_redressal')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  organizer TEXT NOT NULL,
  state_code TEXT NOT NULL,
  district_name TEXT NOT NULL,
  constituency_ac_no INTEGER,
  venue TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  is_open BOOLEAN DEFAULT TRUE,
  registration_url TEXT,
  agenda_items TEXT[] DEFAULT '{}',
  attendee_count INTEGER,
  minutes_url TEXT,
  outcome TEXT,
  related_project_id UUID REFERENCES development_projects(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hearings_state ON public_hearings(state_code);
CREATE INDEX idx_hearings_date ON public_hearings(date DESC);
CREATE INDEX idx_hearings_ac ON public_hearings(constituency_ac_no);

-- ─── Constituency Development Index ───
CREATE TABLE IF NOT EXISTS constituency_development_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constituency_ac_no INTEGER NOT NULL,
  constituency_name TEXT NOT NULL,
  state_code TEXT NOT NULL,
  overall_score NUMERIC(5,2) NOT NULL,
  rank INTEGER,
  total_acs INTEGER,
  percentile NUMERIC(5,2),
  metrics JSONB DEFAULT '[]',
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(constituency_ac_no, state_code)
);

CREATE INDEX idx_cdi_state ON constituency_development_index(state_code);
CREATE INDEX idx_cdi_score ON constituency_development_index(overall_score DESC);

-- ─── RLS ───
ALTER TABLE budget_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_budget_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rti_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE legislator_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE constituency_development_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read budgets" ON budget_allocations FOR SELECT USING (true);
CREATE POLICY "Public read budget summaries" ON state_budget_summaries FOR SELECT USING (true);
CREATE POLICY "Public read RTI" ON rti_requests FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);
CREATE POLICY "Auth file RTI" ON rti_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own RTI" ON rti_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public read attendance" ON legislator_attendance FOR SELECT USING (true);
CREATE POLICY "Public read bills" ON bills FOR SELECT USING (true);
CREATE POLICY "Public read schemes" ON government_schemes FOR SELECT USING (true);
CREATE POLICY "Public read projects" ON development_projects FOR SELECT USING (true);
CREATE POLICY "Public read hearings" ON public_hearings FOR SELECT USING (true);
CREATE POLICY "Public read CDI" ON constituency_development_index FOR SELECT USING (true);
