-- ==============================================================================
-- Migration 083: Podium Runner-Ups & 13-Language Data Architecture
-- ==============================================================================
-- Applies to: PANIN National Electoral, Local Government & Representative Data Programme
-- Scope:
--   1. Historical Winner vs. Current Officeholder Disentanglement (Officeholding Status)
--   2. Canonical Election Events & Contests Setup (Milestone W019 Self-Contained Provisioning)
--   3. First Runner-Up & Second Runner-Up Modeling with Complete Vote Differentials
--   4. Dual Support: Canonical election_contests + Legacy election_results backward compatibility
--   5. 13-Language Normalized Entity Multilingual Architecture for all Domain Data
--   6. RLS policies and Deterministic Localized Resolution Function
-- ==============================================================================

BEGIN;

-- ─── 1. HISTORICAL WINNER VS CURRENT OFFICEHOLDER REMEDIATION ──────────────────

DO $$ BEGIN
  ALTER TABLE public.representatives
  ADD COLUMN officeholding_status TEXT NOT NULL DEFAULT 'HISTORICAL_WINNER'
  CHECK (officeholding_status IN (
    'CURRENT_CONFIRMED',     -- Independently verified as actively holding office
    'HISTORICAL_TERM',       -- Term expired or superseded by fresh election
    'HISTORICAL_WINNER',     -- Historical winner; current officeholding unverified
    'UNRESOLVED',            -- Ambiguous / disputed / under adjudication
    'VACATED'                -- Resigned, deceased, disqualified
  ));
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

COMMENT ON COLUMN public.representatives.officeholding_status IS
  'Distinguishes historical election winners from independently verified current officeholders.';

CREATE INDEX IF NOT EXISTS idx_reps_officeholding_status 
  ON public.representatives(officeholding_status);


-- ─── 2. CANONICAL ELECTION CONTESTS, RUNNER-UPS & VOTE DIFFERENTIALS ────────────

-- 2.1 Provision Canonical Election Events Table if not present
CREATE TABLE IF NOT EXISTS public.election_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_code         TEXT UNIQUE NOT NULL,
  state_code            TEXT NOT NULL,
  election_type         TEXT NOT NULL CHECK (election_type IN ('assembly', 'parliamentary', 'local_body', 'by_election')),
  election_year         INTEGER NOT NULL CHECK (election_year >= 1947),
  title                 TEXT NOT NULL,
  notification_date     DATE,
  polling_date          DATE NOT NULL,
  counting_date         DATE,
  status                TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled', 'ongoing', 'counting', 'completed', 'cancelled')),
  total_constituencies  INTEGER NOT NULL DEFAULT 0 CHECK (total_constituencies >= 0),
  total_electors        BIGINT DEFAULT 0 CHECK (total_electors >= 0),
  total_votes_polled    BIGINT DEFAULT 0 CHECK (total_votes_polled >= 0),
  turnout_percentage    NUMERIC(5,2) DEFAULT 0.0 CHECK (turnout_percentage >= 0 AND turnout_percentage <= 100),
  data_status           TEXT NOT NULL DEFAULT 'OFFICIAL',
  provenance_id         UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  metadata              JSONB DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_election_events_state ON public.election_events(state_code);
CREATE INDEX IF NOT EXISTS idx_election_events_year_type ON public.election_events(election_year, election_type);

-- 2.2 Provision Canonical Election Contests Table with Podium Runner-Ups & Differentials
CREATE TABLE IF NOT EXISTS public.election_contests (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id                   UUID NOT NULL REFERENCES public.election_events(id) ON DELETE CASCADE,
  contest_code                  TEXT UNIQUE NOT NULL,
  constituency_id               TEXT NOT NULL REFERENCES public.constituencies(id) ON DELETE RESTRICT,
  constituency_version_id       UUID,
  constituency_name             TEXT NOT NULL,
  reservation_status            TEXT NOT NULL DEFAULT 'GEN' CHECK (reservation_status IN ('GEN', 'SC', 'ST')),
  status                        TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled', 'completed', 'countermanded', 'cancelled', 're_polled')),
  is_uncontested                BOOLEAN NOT NULL DEFAULT false,
  countermanded_contest_id      UUID REFERENCES public.election_contests(id) ON DELETE SET NULL,
  total_electors                INTEGER NOT NULL DEFAULT 0 CHECK (total_electors >= 0),
  total_votes_polled            INTEGER NOT NULL DEFAULT 0 CHECK (total_votes_polled >= 0),
  total_valid_votes             INTEGER NOT NULL DEFAULT 0 CHECK (total_valid_votes >= 0),
  total_rejected_votes          INTEGER NOT NULL DEFAULT 0 CHECK (total_rejected_votes >= 0),
  total_nota_votes              INTEGER NOT NULL DEFAULT 0 CHECK (total_nota_votes >= 0),
  turnout_percentage            NUMERIC(5,2) DEFAULT 0.0 CHECK (turnout_percentage >= 0 AND turnout_percentage <= 100),
  victory_margin                INTEGER DEFAULT 0 CHECK (victory_margin >= 0),
  winning_candidacy_id          UUID REFERENCES public.candidacies(id) ON DELETE SET NULL,
  runner_up_candidacy_id        UUID REFERENCES public.candidacies(id) ON DELETE SET NULL,
  second_runner_up_candidacy_id UUID REFERENCES public.candidacies(id) ON DELETE SET NULL,
  margin_winner_runner_up_1     INTEGER DEFAULT 0 CHECK (margin_winner_runner_up_1 >= 0),
  margin_winner_runner_up_2     INTEGER DEFAULT 0 CHECK (margin_winner_runner_up_2 >= 0),
  margin_runner_up_1_runner_up_2 INTEGER DEFAULT 0 CHECK (margin_runner_up_1_runner_up_2 >= 0),
  data_status                   TEXT NOT NULL DEFAULT 'OFFICIAL',
  provenance_id                 UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  metadata                      JSONB DEFAULT '{}'::jsonb,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_election_contests_seat UNIQUE (election_id, constituency_id)
);

-- 2.3 If election_contests existed prior to Migration 083, apply podium additions idempotently:
DO $$ BEGIN
  ALTER TABLE public.election_contests
    ADD COLUMN IF NOT EXISTS second_runner_up_candidacy_id UUID REFERENCES public.candidacies(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS margin_winner_runner_up_1 INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margin_winner_runner_up_2 INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margin_runner_up_1_runner_up_2 INTEGER DEFAULT 0;
EXCEPTION
  WHEN undefined_table THEN null;
  WHEN duplicate_column THEN null;
END $$;

COMMENT ON COLUMN public.election_contests.second_runner_up_candidacy_id IS 
  'Foreign key linking the 2nd runner up (Rank 3 candidate) to their complete candidacy & affidavit profile.';
COMMENT ON COLUMN public.election_contests.margin_winner_runner_up_1 IS 
  'Vote differential between Winner (Rank 1) and First Runner Up (Rank 2): V1 - V2.';
COMMENT ON COLUMN public.election_contests.margin_winner_runner_up_2 IS 
  'Vote differential between Winner (Rank 1) and Second Runner Up (Rank 3): V1 - V3.';
COMMENT ON COLUMN public.election_contests.margin_runner_up_1_runner_up_2 IS 
  'Vote differential between First Runner Up (Rank 2) and Second Runner Up (Rank 3): V2 - V3.';

CREATE INDEX IF NOT EXISTS idx_election_contests_election ON public.election_contests(election_id);
CREATE INDEX IF NOT EXISTS idx_election_contests_constituency ON public.election_contests(constituency_id);
CREATE INDEX IF NOT EXISTS idx_election_contests_second_runner_up 
  ON public.election_contests(second_runner_up_candidacy_id) 
  WHERE second_runner_up_candidacy_id IS NOT NULL;

-- 2.4 Enable RLS on election events and contests
ALTER TABLE public.election_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_contests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY election_events_select_policy ON public.election_events FOR SELECT TO public USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY election_events_service_role ON public.election_events FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY election_contests_select_policy ON public.election_contests FOR SELECT TO public USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY election_contests_service_role ON public.election_contests FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

GRANT SELECT ON public.election_events TO anon, authenticated;
GRANT ALL ON public.election_events TO service_role;
GRANT SELECT ON public.election_contests TO anon, authenticated;
GRANT ALL ON public.election_contests TO service_role;

-- 2.5 Also update legacy election_results table (if present) for full backward compatibility:
DO $$ BEGIN
  ALTER TABLE IF EXISTS public.election_results
    ADD COLUMN IF NOT EXISTS second_runner_up_name TEXT,
    ADD COLUMN IF NOT EXISTS second_runner_up_party TEXT,
    ADD COLUMN IF NOT EXISTS second_runner_up_votes INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margin_winner_runner_up_1 INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margin_winner_runner_up_2 INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margin_runner_up_1_runner_up_2 INTEGER DEFAULT 0;
EXCEPTION
  WHEN undefined_table THEN null;
  WHEN duplicate_column THEN null;
END $$;


-- ─── 3. 13-LANGUAGE NORMALIZED ENTITY LOCALIZATION TABLE ───────────────────────

CREATE TABLE IF NOT EXISTS public.entity_multilingual_representations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type           TEXT NOT NULL CHECK (entity_type IN (
                          'person',
                          'political_party',
                          'constituency',
                          'urban_local_body',
                          'gram_panchayat',
                          'ward',
                          'taxonomy'
                        )),
  entity_id             TEXT NOT NULL,
  language_code         TEXT NOT NULL CHECK (language_code IN (
                          'en', 'te', 'hi', 'kn', 'mr', 'ta', 'ml', 
                          'bn', 'gu', 'pa', 'or', 'as', 'ne'
                        )),
  script_code           TEXT NOT NULL, -- ISO 15924: Latn, Telu, Deva, Taml, Knda, Mlym, Beng, Gujr, Guru, Orya
  field_key             TEXT NOT NULL, -- e.g. 'name', 'biography', 'party_full_name', 'education', 'profession'
  representation_value  TEXT NOT NULL CHECK (char_length(representation_value) BETWEEN 1 AND 5000),
  representation_type   TEXT NOT NULL CHECK (representation_type IN (
                          'OFFICIAL', 
                          'PREFERRED', 
                          'SOURCE_NATIVE', 
                          'TRANSLITERATION', 
                          'TRANSLATION', 
                          'ALIAS', 
                          'HISTORICAL'
                        )),
  translation_status    TEXT NOT NULL DEFAULT 'MACHINE_DRAFT' CHECK (translation_status IN (
                          'SOURCE_NATIVE',
                          'OFFICIAL_LOCALIZED',
                          'HUMAN_VERIFIED',
                          'MACHINE_DRAFT',
                          'NOT_AVAILABLE',
                          'CONFLICT'
                        )),
  source_evidence       TEXT,
  provenance_id         UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_entity_lang_field_type UNIQUE (entity_type, entity_id, language_code, field_key, representation_type)
);

COMMENT ON TABLE public.entity_multilingual_representations IS 
  'Universal 13-language data representation layer for all political, electoral, and civic entities.';

CREATE INDEX IF NOT EXISTS idx_entity_multi_lookup 
  ON public.entity_multilingual_representations(entity_type, entity_id, language_code);

CREATE INDEX IF NOT EXISTS idx_entity_multi_field 
  ON public.entity_multilingual_representations(entity_type, field_key, language_code);

CREATE INDEX IF NOT EXISTS idx_entity_multi_status 
  ON public.entity_multilingual_representations(translation_status);


-- ─── 4. ROW-LEVEL SECURITY & PERMISSIONS ───────────────────────────────────────

ALTER TABLE public.entity_multilingual_representations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY entity_multilingual_select_policy 
    ON public.entity_multilingual_representations
    FOR SELECT TO public USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY entity_multilingual_service_role_all 
    ON public.entity_multilingual_representations
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

GRANT SELECT ON public.entity_multilingual_representations TO anon, authenticated;
GRANT ALL ON public.entity_multilingual_representations TO service_role;


-- ─── 5. DETERMINISTIC LOCALIZED ENTITY FIELD RESOLUTION FUNCTION ───────────────

CREATE OR REPLACE FUNCTION public.fn_get_localized_entity_field(
  p_entity_type   TEXT,
  p_entity_id     TEXT,
  p_language_code TEXT,
  p_field_key     TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_localized_value TEXT;
BEGIN
  -- 1. Attempt exact match for requested language (prioritizing HUMAN_VERIFIED / OFFICIAL)
  SELECT representation_value
    INTO v_localized_value
    FROM public.entity_multilingual_representations
   WHERE entity_type = p_entity_type
     AND entity_id = p_entity_id
     AND language_code = p_language_code
     AND field_key = p_field_key
   ORDER BY 
     CASE translation_status
       WHEN 'OFFICIAL_LOCALIZED' THEN 1
       WHEN 'HUMAN_VERIFIED' THEN 2
       WHEN 'SOURCE_NATIVE' THEN 3
       WHEN 'MACHINE_DRAFT' THEN 4
       ELSE 5
     END,
     created_at DESC
   LIMIT 1;

  IF v_localized_value IS NOT NULL THEN
    RETURN v_localized_value;
  END IF;

  -- 2. Fall back to SOURCE_NATIVE or English representation
  SELECT representation_value
    INTO v_localized_value
    FROM public.entity_multilingual_representations
   WHERE entity_type = p_entity_type
     AND entity_id = p_entity_id
     AND field_key = p_field_key
     AND (representation_type = 'SOURCE_NATIVE' OR language_code = 'en')
   ORDER BY 
     CASE representation_type
       WHEN 'SOURCE_NATIVE' THEN 1
       ELSE 2
     END
   LIMIT 1;

  RETURN v_localized_value;
END;
$$;

COMMENT ON FUNCTION public.fn_get_localized_entity_field(TEXT, TEXT, TEXT, TEXT) IS
  'Deterministic resolution of a localized field for an entity, failing over safely to SOURCE_NATIVE / English.';

REVOKE ALL ON FUNCTION public.fn_get_localized_entity_field(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_get_localized_entity_field(TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role, anon;

COMMIT;
