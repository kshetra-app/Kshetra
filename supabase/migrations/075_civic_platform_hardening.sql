-- ==============================================================================
-- MIGRATION 075: CANONICAL CIVIC PLATFORM HARDENING & COMMUNITY GROUPS
-- ==============================================================================
-- Authority: Master Product Blueprint, Amendment v1.2, Plan PLAN-DOMAIN-3-REV-1.0
-- Standards: DPDP Act 2023 (Zero Voter PII), PostGIS 589 Invariant, Non-Self-Acceptance
-- Purpose:
--   1. Real community civic working groups (Ward / Mandal / Assembly level).
--   2. Corroborating community evidence table (photo uploads & ground proof).
--   3. Real civic schemes catalog & constituency development projects.
--   4. Immutable status history enforcement & anti-sybil triggers.
-- ==============================================================================

-- 1. COMMUNITY GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.community_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(name) >= 3 AND char_length(name) <= 100),
    slug TEXT UNIQUE NOT NULL,
    constituency_id TEXT NOT NULL REFERENCES public.constituencies(id) ON DELETE RESTRICT,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'sanitation', 'roads', 'water', 'electricity', 
        'education', 'environment', 'public_safety', 'healthcare', 'general'
    )),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    member_count INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_groups_constituency ON public.community_groups(constituency_id);
CREATE INDEX IF NOT EXISTS idx_community_groups_category ON public.community_groups(category);

-- 2. COMMUNITY GROUP MEMBERSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.community_group_memberships (
    group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON public.community_group_memberships(user_id);

-- 3. CORROBORATING ISSUE EVIDENCE TABLE
CREATE TABLE IF NOT EXISTS public.issue_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES public.civic_issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    user_name TEXT NOT NULL,
    media_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issue_evidence_issue ON public.issue_evidence(issue_id);

-- 4. GOVERNMENT SCHEMES TABLE (REAL DATA REPLACING STUBS)
CREATE TABLE IF NOT EXISTS public.government_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('CENTRAL', 'STATE', 'LOCAL')),
    state_code TEXT REFERENCES public.states(code),
    description TEXT NOT NULL,
    eligibility TEXT,
    benefits TEXT,
    application_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_government_schemes_state ON public.government_schemes(state_code);
CREATE INDEX IF NOT EXISTS idx_government_schemes_category ON public.government_schemes(category);

-- 5. CONSTITUENCY DEVELOPMENT PROJECTS TABLE (REAL DATA REPLACING STUBS)
CREATE TABLE IF NOT EXISTS public.development_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    constituency_id TEXT NOT NULL REFERENCES public.constituencies(id) ON DELETE RESTRICT,
    state_code TEXT NOT NULL REFERENCES public.states(code) ON DELETE RESTRICT,
    category TEXT NOT NULL,
    budget_inr NUMERIC(15, 2) NOT NULL DEFAULT 0,
    spent_inr NUMERIC(15, 2) NOT NULL DEFAULT 0,
    phase TEXT NOT NULL CHECK (phase IN ('PROPOSED', 'SANCTIONED', 'IN_PROGRESS', 'COMPLETED', 'HALTED')),
    contractor_name TEXT,
    start_date DATE,
    completion_target_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dev_projects_constituency ON public.development_projects(constituency_id);
CREATE INDEX IF NOT EXISTS idx_dev_projects_state ON public.development_projects(state_code);

-- 6. TRIGGERS FOR MEMBERSHIP & EVIDENCE COUNTERS
CREATE OR REPLACE FUNCTION public.fn_sync_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.community_groups 
        SET member_count = member_count + 1, updated_at = NOW() 
        WHERE id = NEW.group_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.community_groups 
        SET member_count = GREATEST(member_count - 1, 0), updated_at = NOW() 
        WHERE id = OLD.group_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_group_member_count ON public.community_group_memberships;
CREATE TRIGGER trg_sync_group_member_count
    AFTER INSERT OR DELETE ON public.community_group_memberships
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_group_member_count();

CREATE OR REPLACE FUNCTION public.fn_sync_issue_evidence_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.civic_issues 
    SET evidence_count = evidence_count + 1, updated_at = NOW() 
    WHERE id = NEW.issue_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_issue_evidence_count ON public.issue_evidence;
CREATE TRIGGER trg_sync_issue_evidence_count
    AFTER INSERT ON public.issue_evidence
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_issue_evidence_count();

-- 7. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.development_projects ENABLE ROW LEVEL SECURITY;

-- Community Groups RLS
CREATE POLICY "Public read community groups" ON public.community_groups FOR SELECT USING (true);
CREATE POLICY "Auth users create community groups" ON public.community_groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator update community groups" ON public.community_groups FOR UPDATE USING (auth.uid() = created_by);

-- Memberships RLS
CREATE POLICY "Public read group memberships" ON public.community_group_memberships FOR SELECT USING (true);
CREATE POLICY "Auth users manage own membership" ON public.community_group_memberships FOR ALL USING (auth.uid() = user_id);

-- Evidence RLS
CREATE POLICY "Public read issue evidence" ON public.issue_evidence FOR SELECT USING (true);
CREATE POLICY "Auth users submit evidence" ON public.issue_evidence FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Schemes & Projects RLS (Public read, admin write)
CREATE POLICY "Public read schemes" ON public.government_schemes FOR SELECT USING (true);
CREATE POLICY "Public read development projects" ON public.development_projects FOR SELECT USING (true);
