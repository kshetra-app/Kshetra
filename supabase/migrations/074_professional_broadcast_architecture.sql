-- ==============================================================================
-- MIGRATION 074: PROFESSIONAL BROADCAST ARCHITECTURE & INTERACTIVE PLAYS
-- ==============================================================================
-- Authority: Master Product Blueprint, Amendment v1.2, Plan PLAN-W052-REV-1.0
-- Standards: DPDP Act 2023 (Zero Voter PII), PostGIS 589 Invariant, Non-Self-Acceptance
-- Purpose: 
--   1. Authoritative channel profiles for candidates, parties & civic authorities.
--   2. Stream lifecycle management (RTMP, SRT, WHIP ingest; HLS/LL-HLS playback).
--   3. Ephemeral hashed stream keys with automated rotation & 5-minute TTL.
--   4. Ingest health telemetry & quality monitoring.
--   5. Real-time interactive audience polling with cryptographic anti-sybil tokens.
--   6. Moderated audience Q&A queue with fail-closed safety & zero PII leaks.
-- ==============================================================================

-- 1. BROADCAST CHANNELS TABLE
CREATE TABLE IF NOT EXISTS public.broadcast_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    channel_type TEXT NOT NULL CHECK (channel_type IN ('CANDIDATE', 'POLITICAL_PARTY', 'ELECTION_AUTHORITY', 'MEDIA_OUTLET', 'CIVIC_BODY')),
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED', 'VERIFIED_OFFICIAL', 'VERIFIED_MEDIA', 'SUSPENDED')),
    person_internal_id UUID REFERENCES public.canonical_persons(internal_id) ON DELETE SET NULL,
    organization_internal_id UUID REFERENCES public.canonical_organizations(internal_id) ON DELETE SET NULL,
    state_code TEXT REFERENCES public.states(code) ON DELETE SET NULL,
    constituency_internal_id UUID REFERENCES public.constituencies(internal_id) ON DELETE SET NULL,
    avatar_url TEXT,
    banner_url TEXT,
    contact_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. BROADCAST STREAMS TABLE
CREATE TABLE IF NOT EXISTS public.broadcast_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.broadcast_channels(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'GENERAL' CHECK (category IN (
        'TOWN_HALL', 'SPEECH', 'MANIFESTO_RELEASE', 'PRESS_CONFERENCE', 
        'DEBATE', 'ELECTION_UPDATE', 'EMERGENCY_CIVIC', 'GENERAL'
    )),
    language TEXT NOT NULL DEFAULT 'en',
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN (
        'SCHEDULED', 'PROVISIONED', 'LIVE', 'PAUSED', 'ENDED', 'ARCHIVED'
    )),
    visibility TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'UNLISTED', 'RESTRICTED')),
    latency_profile TEXT NOT NULL DEFAULT 'BROADCAST_HLS' CHECK (latency_profile IN (
        'BROADCAST_HLS', 'LOW_LATENCY_LLHLS', 'INTERACTIVE_SFU'
    )),
    scheduled_start_time TIMESTAMPTZ,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    playback_hls_url TEXT,
    playback_llhls_url TEXT,
    playback_webrtc_url TEXT,
    recording_vod_url TEXT,
    recording_retention_days INTEGER NOT NULL DEFAULT 90,
    recording_purged_at TIMESTAMPTZ,
    viewer_count_current INTEGER NOT NULL DEFAULT 0,
    viewer_count_peak INTEGER NOT NULL DEFAULT 0,
    total_views INTEGER NOT NULL DEFAULT 0,
    state_code TEXT REFERENCES public.states(code) ON DELETE SET NULL,
    constituency_internal_id UUID REFERENCES public.constituencies(internal_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. BROADCAST STREAM KEYS TABLE
CREATE TABLE IF NOT EXISTS public.broadcast_stream_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.broadcast_channels(id) ON DELETE CASCADE,
    stream_id UUID REFERENCES public.broadcast_streams(id) ON DELETE SET NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL DEFAULT 'Primary Ingest Key',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. BROADCAST TELEMETRY SNAPSHOTS TABLE
CREATE TABLE IF NOT EXISTS public.broadcast_telemetry_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID NOT NULL REFERENCES public.broadcast_streams(id) ON DELETE CASCADE,
    bitrate_kbps INTEGER NOT NULL,
    fps NUMERIC(5,2) NOT NULL,
    resolution_width INTEGER,
    resolution_height INTEGER,
    audio_bitrate_kbps INTEGER,
    packet_loss_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    ingest_protocol TEXT NOT NULL CHECK (ingest_protocol IN ('RTMP', 'SRT', 'WHIP')),
    health_status TEXT NOT NULL CHECK (health_status IN ('EXCELLENT', 'GOOD', 'DEGRADED', 'CRITICAL', 'DISCONNECTED')),
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. BROADCAST POLLS TABLE
CREATE TABLE IF NOT EXISTS public.broadcast_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID NOT NULL REFERENCES public.broadcast_streams(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED')),
    duration_seconds INTEGER NOT NULL DEFAULT 60,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    total_votes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. BROADCAST POLL OPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.broadcast_poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.broadcast_polls(id) ON DELETE CASCADE,
    option_index INTEGER NOT NULL,
    option_text TEXT NOT NULL,
    vote_count INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_broadcast_poll_option_idx UNIQUE (poll_id, option_index)
);

-- 7. BROADCAST POLL VOTES TABLE (DPDP Act 2023 Compliant: Zero PII)
CREATE TABLE IF NOT EXISTS public.broadcast_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.broadcast_polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES public.broadcast_poll_options(id) ON DELETE CASCADE,
    voter_token_hash TEXT NOT NULL,
    voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_broadcast_poll_voter UNIQUE (poll_id, voter_token_hash)
);

-- 8. BROADCAST QA THREADS TABLE
CREATE TABLE IF NOT EXISTS public.broadcast_qa_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID NOT NULL REFERENCES public.broadcast_streams(id) ON DELETE CASCADE,
    author_display_name TEXT NOT NULL DEFAULT 'Citizen',
    author_token_hash TEXT NOT NULL,
    question_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PINNED', 'ANSWERED')),
    moderation_reason TEXT,
    upvotes INTEGER NOT NULL DEFAULT 0,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    answered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_qa_no_pii CHECK (
        question_text !~* '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' AND
        question_text !~* '(\+91|0)?[6-9][0-9]{9}'
    )
);

-- ─── INDEXES FOR REAL-TIME RETRIEVAL ───
CREATE INDEX IF NOT EXISTS idx_broadcast_channels_slug ON public.broadcast_channels(slug);
CREATE INDEX IF NOT EXISTS idx_broadcast_channels_type ON public.broadcast_channels(channel_type);
CREATE INDEX IF NOT EXISTS idx_broadcast_streams_channel ON public.broadcast_streams(channel_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_streams_status ON public.broadcast_streams(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_streams_geo ON public.broadcast_streams(state_code, constituency_internal_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_stream_keys_hash ON public.broadcast_stream_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_broadcast_telemetry_stream ON public.broadcast_telemetry_snapshots(stream_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_polls_stream ON public.broadcast_polls(stream_id, status);
CREATE INDEX IF NOT EXISTS idx_broadcast_poll_options_poll ON public.broadcast_poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_qa_stream_status ON public.broadcast_qa_threads(stream_id, status, upvotes DESC);

-- ─── ROW LEVEL SECURITY ENFORCEMENT ───
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
END $$;

ALTER TABLE public.broadcast_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_stream_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_telemetry_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_qa_threads ENABLE ROW LEVEL SECURITY;

-- Channels & Streams: Public Read
CREATE POLICY p_broadcast_channels_public_select ON public.broadcast_channels
    FOR SELECT TO public USING (true);

CREATE POLICY p_broadcast_streams_public_select ON public.broadcast_streams
    FOR SELECT TO public USING (visibility = 'PUBLIC' OR visibility = 'UNLISTED');

CREATE POLICY p_broadcast_telemetry_public_select ON public.broadcast_telemetry_snapshots
    FOR SELECT TO public USING (true);

-- Stream Keys: Strictly service_role / Administrative Only
CREATE POLICY p_broadcast_stream_keys_service_all ON public.broadcast_stream_keys
    FOR ALL TO service_role USING (true);

-- Polls & Options: Public Read Active/Closed Polls
CREATE POLICY p_broadcast_polls_public_select ON public.broadcast_polls
    FOR SELECT TO public USING (status IN ('ACTIVE', 'CLOSED', 'ARCHIVED'));

CREATE POLICY p_broadcast_poll_options_public_select ON public.broadcast_poll_options
    FOR SELECT TO public USING (true);

CREATE POLICY p_broadcast_poll_votes_public_insert ON public.broadcast_poll_votes
    FOR INSERT TO public WITH CHECK (true);

-- QA Threads: Public Read Approved & Pinned Questions
CREATE POLICY p_broadcast_qa_public_select ON public.broadcast_qa_threads
    FOR SELECT TO public USING (status IN ('APPROVED', 'PINNED', 'ANSWERED'));

CREATE POLICY p_broadcast_qa_public_insert ON public.broadcast_qa_threads
    FOR INSERT TO public WITH CHECK (true);

-- Service Role Unrestricted Access on All Tables
CREATE POLICY p_broadcast_channels_service_all ON public.broadcast_channels FOR ALL TO service_role USING (true);
CREATE POLICY p_broadcast_streams_service_all ON public.broadcast_streams FOR ALL TO service_role USING (true);
CREATE POLICY p_broadcast_telemetry_service_all ON public.broadcast_telemetry_snapshots FOR ALL TO service_role USING (true);
CREATE POLICY p_broadcast_polls_service_all ON public.broadcast_polls FOR ALL TO service_role USING (true);
CREATE POLICY p_broadcast_poll_options_service_all ON public.broadcast_poll_options FOR ALL TO service_role USING (true);
CREATE POLICY p_broadcast_poll_votes_service_all ON public.broadcast_poll_votes FOR ALL TO service_role USING (true);
CREATE POLICY p_broadcast_qa_service_all ON public.broadcast_qa_threads FOR ALL TO service_role USING (true);
