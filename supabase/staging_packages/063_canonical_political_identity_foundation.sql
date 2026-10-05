-- ==============================================================================
-- Migration 063: Canonical Political Identity Foundation (W021.5-B2)
-- Target: Staging Supabase & Local PostgreSQL (fkpigozcqnmcvofuksar)
-- Authority: CTO Master Execution Directive W021.5-B2
-- Scope:
--   1. Create public.person_multilingual_identities for multi-script, multi-variant names
--   2. Create public.tenure_vacancies for first-class statutory vacancy modeling
--   3. Add tenure_status and expand jurisdiction_type on public.elected_tenures
--   4. Enable RLS and security invariants
-- ==============================================================================

BEGIN;

-- ─── 1. PERSON MULTILINGUAL IDENTITIES ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.person_multilingual_identities (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id             UUID NOT NULL REFERENCES public.canonical_persons(id) ON DELETE CASCADE,
  language_code         TEXT NOT NULL, -- e.g. 'te', 'hi', 'ta', 'bn', 'en'
  script_code           TEXT NOT NULL, -- ISO 15924: 'Telu', 'Deva', 'Taml', 'Beng', 'Latn'
  representation_type   TEXT NOT NULL CHECK (representation_type IN ('OFFICIAL', 'PREFERRED', 'SOURCE_NATIVE', 'TRANSLITERATION', 'ALIAS', 'HISTORICAL')),
  representation_value  TEXT NOT NULL CHECK (char_length(representation_value) BETWEEN 1 AND 200),
  is_preferred          BOOLEAN NOT NULL DEFAULT false,
  is_official           BOOLEAN NOT NULL DEFAULT false,
  valid_from            DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to              DATE,
  source                TEXT,
  data_status           public.data_status_enum NOT NULL DEFAULT 'OFFICIAL',
  provenance_id         UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_person_multi_ident UNIQUE (person_id, language_code, script_code, representation_type, representation_value)
);

COMMENT ON TABLE public.person_multilingual_identities IS 'Native script and localized name variants for canonical persons across Indian languages.';

CREATE INDEX IF NOT EXISTS idx_person_multi_ident_person ON public.person_multilingual_identities(person_id);
CREATE INDEX IF NOT EXISTS idx_person_multi_ident_lang_script ON public.person_multilingual_identities(language_code, script_code);
CREATE INDEX IF NOT EXISTS idx_person_multi_ident_type ON public.person_multilingual_identities(representation_type);

ALTER TABLE public.person_multilingual_identities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY p_select_person_multilingual_identities ON public.person_multilingual_identities
    FOR SELECT TO public USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- ─── 2. TENURE VACANCIES (First-Class Statutory Vacancy Events) ───────────────

CREATE TABLE IF NOT EXISTS public.tenure_vacancies (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id               UUID NOT NULL REFERENCES public.elected_tenures(id) ON DELETE CASCADE,
  person_id               UUID NOT NULL REFERENCES public.canonical_persons(id) ON DELETE RESTRICT,
  vacancy_reason          TEXT NOT NULL CHECK (vacancy_reason IN ('DEATH', 'RESIGNATION', 'DISQUALIFICATION_TENTH_SCHEDULE', 'DISQUALIFICATION_RPA_SEC_8', 'ELECTION_ANNULLED_COURT_ORDER', 'EXPULSION', 'VACANCY_GAZETTED')),
  effective_date          DATE NOT NULL,
  notifying_authority     TEXT NOT NULL, -- e.g. 'Speaker of the Legislative Assembly', 'Election Commission of India'
  gazette_notification_ref TEXT,
  notes                   TEXT,
  data_status             public.data_status_enum NOT NULL DEFAULT 'OFFICIAL',
  provenance_id           UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenure_vacancies IS 'Statutory vacancy events terminating an elected tenure before normal term expiration.';

CREATE INDEX IF NOT EXISTS idx_tenure_vacancies_tenure ON public.tenure_vacancies(tenure_id);
CREATE INDEX IF NOT EXISTS idx_tenure_vacancies_person ON public.tenure_vacancies(person_id);
CREATE INDEX IF NOT EXISTS idx_tenure_vacancies_date ON public.tenure_vacancies(effective_date);

ALTER TABLE public.tenure_vacancies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY p_select_tenure_vacancies ON public.tenure_vacancies
    FOR SELECT TO public USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- ─── 3. ELECTED TENURES HARDENING & STATUS ────────────────────────────────────

-- Add tenure_status column if it does not exist
DO $$ BEGIN
  ALTER TABLE public.elected_tenures
  ADD COLUMN tenure_status TEXT NOT NULL DEFAULT 'ACTIVE'
  CHECK (tenure_status IN ('ACTIVE', 'COMPLETED', 'VACATED_RESIGNATION', 'VACATED_DEATH', 'VACATED_DISQUALIFICATION', 'ANNULLED', 'PROVISIONAL'));
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Expand jurisdiction_type to include 'state' and 'nominated' for Rajya Sabha
ALTER TABLE public.elected_tenures DROP CONSTRAINT IF EXISTS elected_tenures_jurisdiction_type_check;
ALTER TABLE public.elected_tenures ADD CONSTRAINT elected_tenures_jurisdiction_type_check
  CHECK (jurisdiction_type IN (
    'parliamentary_constituency',
    'assembly_constituency',
    'state',
    'nominated',
    'urban_local_body',
    'ulb_ward',
    'gram_panchayat',
    'gp_ward',
    'mandal_parishad',
    'mptc_division',
    'zilla_parishad',
    'zptc_division'
  ));

COMMIT;
