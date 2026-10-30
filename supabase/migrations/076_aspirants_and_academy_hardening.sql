-- 076: Aspirants, Communities & Leadership Academy Platform Hardening
-- Governing Standard: Master Product Blueprint, Job Book (JOB 046 - JOB 050), DEC-176, DEC-177
-- Depends on: 010_aspiring_leaders.sql, 027_extend_role_and_verification.sql, 075_civic_platform_hardening.sql

-- 1. Extend aspirant_profiles with verification, handle, and declaration fields
ALTER TABLE IF EXISTS public.aspirant_profiles
  ADD COLUMN IF NOT EXISTS verification_tier TEXT NOT NULL DEFAULT 'tier1' CHECK (verification_tier IN ('tier1', 'tier2')),
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS manifesto_url TEXT,
  ADD COLUMN IF NOT EXISTS vision_summary TEXT,
  ADD COLUMN IF NOT EXISTS has_criminal_cases BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS criminal_cases_details TEXT,
  ADD COLUMN IF NOT EXISTS handle TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_aspirant_profiles_handle ON public.aspirant_profiles(handle);
CREATE INDEX IF NOT EXISTS idx_aspirant_profiles_verif_status ON public.aspirant_profiles(verification_status);

-- 2. Aspirant KYC Verification Documents & Audit Table (JOB 046)
CREATE TABLE IF NOT EXISTS public.aspirant_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aspirant_id UUID NOT NULL REFERENCES public.aspirant_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('voter_id', 'aadhaar_masked', 'pan', 'election_affidavit', 'party_letter')),
    document_hash TEXT NOT NULL,
    document_url TEXT,
    verification_tier TEXT NOT NULL DEFAULT 'tier1' CHECK (verification_tier IN ('tier1', 'tier2')),
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    statutory_declaration_accepted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(aspirant_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_aspirant_verif_aspirant ON public.aspirant_verifications(aspirant_id);
CREATE INDEX IF NOT EXISTS idx_aspirant_verif_user ON public.aspirant_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_aspirant_verif_status ON public.aspirant_verifications(verification_status);

-- 3. Page Followers Table (JOB 048)
CREATE TABLE IF NOT EXISTS public.page_followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(page_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_page_followers_page ON public.page_followers(page_id);
CREATE INDEX IF NOT EXISTS idx_page_followers_user ON public.page_followers(user_id);

-- 4. Page Events Table (JOB 048)
CREATE TABLE IF NOT EXISTS public.page_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 150),
    description TEXT CHECK (char_length(description) <= 2000),
    event_type TEXT NOT NULL CHECK (event_type IN ('townhall', 'rally', 'volunteer_meet', 'webinar', 'press_conference', 'door_to_door')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    venue_name TEXT,
    venue_address TEXT,
    constituency_id TEXT REFERENCES public.constituencies(id),
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    is_virtual BOOLEAN NOT NULL DEFAULT false,
    meeting_link TEXT,
    rsvp_count INTEGER NOT NULL DEFAULT 0,
    dispatched_to_followers BOOLEAN NOT NULL DEFAULT false,
    dispatched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_events_page ON public.page_events(page_id);
CREATE INDEX IF NOT EXISTS idx_page_events_start ON public.page_events(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_page_events_constituency ON public.page_events(constituency_id);

-- 5. Page Event RSVPs Table (JOB 048)
CREATE TABLE IF NOT EXISTS public.page_event_rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.page_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'interested', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_page_event_rsvps_event ON public.page_event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_page_event_rsvps_user ON public.page_event_rsvps(user_id);

-- 6. Leadership Academy Quiz Attempts Table (JOB 050)
CREATE TABLE IF NOT EXISTS public.module_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.leadership_modules(id) ON DELETE CASCADE,
    score_percentage INTEGER NOT NULL CHECK (score_percentage BETWEEN 0 AND 100),
    passed BOOLEAN NOT NULL DEFAULT false,
    answers_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_module_quiz_attempts_user_mod ON public.module_quiz_attempts(user_id, module_id);

-- 7. Trigger: Update Page Follower Count on page_followers insert/delete
CREATE OR REPLACE FUNCTION public.fn_sync_page_follower_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.pages
        SET follower_count = follower_count + 1, updated_at = now()
        WHERE id = NEW.page_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.pages
        SET follower_count = GREATEST(0, follower_count - 1), updated_at = now()
        WHERE id = OLD.page_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_page_follower_count ON public.page_followers;
CREATE TRIGGER trg_sync_page_follower_count
AFTER INSERT OR DELETE ON public.page_followers
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_page_follower_count();

-- 8. Trigger: Update Event RSVP Count on page_event_rsvps insert/update/delete
CREATE OR REPLACE FUNCTION public.fn_sync_page_event_rsvp_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'going' THEN
            UPDATE public.page_events SET rsvp_count = rsvp_count + 1, updated_at = now() WHERE id = NEW.event_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'going' AND NEW.status = 'going' THEN
            UPDATE public.page_events SET rsvp_count = rsvp_count + 1, updated_at = now() WHERE id = NEW.event_id;
        ELSIF OLD.status = 'going' AND NEW.status != 'going' THEN
            UPDATE public.page_events SET rsvp_count = GREATEST(0, rsvp_count - 1), updated_at = now() WHERE id = NEW.event_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.status = 'going' THEN
            UPDATE public.page_events SET rsvp_count = GREATEST(0, rsvp_count - 1), updated_at = now() WHERE id = OLD.event_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_page_event_rsvp_count ON public.page_event_rsvps;
CREATE TRIGGER trg_sync_page_event_rsvp_count
AFTER INSERT OR UPDATE OR DELETE ON public.page_event_rsvps
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_page_event_rsvp_count();

-- 9. Row Level Security Policies
ALTER TABLE public.aspirant_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- KYC verifications: private to owner and admin
CREATE POLICY "Aspirant verifications own read" ON public.aspirant_verifications
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Aspirant verifications insert own" ON public.aspirant_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Page followers: public read, authenticated insert/delete own
CREATE POLICY "Page followers public read" ON public.page_followers FOR SELECT USING (true);
CREATE POLICY "Page followers insert own" ON public.page_followers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Page followers delete own" ON public.page_followers FOR DELETE USING (auth.uid() = user_id);

-- Page events: public read, page owner or admin insert/update
CREATE POLICY "Page events public read" ON public.page_events FOR SELECT USING (true);
CREATE POLICY "Page events manage owner" ON public.page_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.pages WHERE pages.id = page_events.page_id AND pages.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Page event RSVPs: public read, auth user manage own
CREATE POLICY "Page event RSVPs public read" ON public.page_event_rsvps FOR SELECT USING (true);
CREATE POLICY "Page event RSVPs manage own" ON public.page_event_rsvps FOR ALL USING (auth.uid() = user_id);

-- Quiz attempts: user read own and admin read
CREATE POLICY "Quiz attempts read own" ON public.module_quiz_attempts
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Quiz attempts insert own" ON public.module_quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
