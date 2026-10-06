-- ==============================================================================
-- Migration 063-R2: Canonical Political Identity Foundation (W021.5-B2)
-- Target: Staging Supabase & Local PostgreSQL (fkpigozcqnmcvofuksar)
-- Authority: CTO Master Execution Directive W021.5-B2
-- Scope:
--   1. Create public.person_multilingual_identities with single-preferred/official invariants
--   2. Enforce composite key on public.elected_tenures (id, person_id)
--   3. Create public.tenure_vacancies with composite FK, RESTRICT referential action,
--      terminal event uniqueness, and fail-closed temporal invariants
--   4. Deterministic tenure_status backfill & check constraint on elected_tenures
--   5. Expand jurisdiction_type to include 'state' and 'nominated'
--   6. Full RLS policies for public read and service_role write
-- ==============================================================================

BEGIN;

-- ─── 1. PERSON MULTILINGUAL IDENTITIES ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.person_multilingual_identities (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id             UUID NOT NULL REFERENCES public.canonical_persons(id) ON DELETE CASCADE,
  language_code         TEXT NOT NULL,
  script_code           TEXT NOT NULL,
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

-- Single preferred/official name invariant per language & script
CREATE UNIQUE INDEX IF NOT EXISTS uq_person_multi_ident_single_preferred
  ON public.person_multilingual_identities (person_id, language_code, script_code)
  WHERE is_preferred = true;

CREATE UNIQUE INDEX IF NOT EXISTS uq_person_multi_ident_single_official
  ON public.person_multilingual_identities (person_id, language_code, script_code)
  WHERE is_official = true;

ALTER TABLE public.person_multilingual_identities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY person_multilingual_identities_select_policy ON public.person_multilingual_identities
    FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY person_multilingual_identities_service_role_all ON public.person_multilingual_identities
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

GRANT SELECT ON public.person_multilingual_identities TO anon, authenticated;
GRANT ALL ON public.person_multilingual_identities TO service_role;


-- ─── 2. ELECTED TENURES COMPOSITE KEY & HARDENING ─────────────────────────────

-- Composite uniqueness required to anchor foreign keys with person consistency
DO $$ BEGIN
  ALTER TABLE public.elected_tenures
    ADD CONSTRAINT uq_elected_tenures_id_person UNIQUE (id, person_id);
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;


-- ─── 3. TENURE VACANCIES ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tenure_vacancies (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_id                UUID NOT NULL,
  person_id                UUID NOT NULL,
  vacancy_reason           TEXT NOT NULL CHECK (vacancy_reason IN ('DEATH', 'RESIGNATION', 'DISQUALIFICATION_TENTH_SCHEDULE', 'DISQUALIFICATION_RPA_SEC_8', 'ELECTION_ANNULLED_COURT_ORDER', 'EXPULSION', 'VACANCY_GAZETTED')),
  effective_date           DATE NOT NULL CHECK (effective_date >= '1947-08-15'::date),
  notifying_authority      TEXT NOT NULL,
  gazette_notification_ref  TEXT,
  notes                    TEXT,
  data_status              public.data_status_enum NOT NULL DEFAULT 'OFFICIAL',
  provenance_id            UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tenure_vacancies_single_terminal UNIQUE (tenure_id),
  CONSTRAINT fk_tenure_vacancies_tenure_person FOREIGN KEY (tenure_id, person_id) REFERENCES public.elected_tenures(id, person_id) ON DELETE RESTRICT
);

COMMENT ON TABLE public.tenure_vacancies IS 'Statutory vacancy events terminating an elected tenure before normal term expiration.';

CREATE INDEX IF NOT EXISTS idx_tenure_vacancies_tenure ON public.tenure_vacancies(tenure_id);
CREATE INDEX IF NOT EXISTS idx_tenure_vacancies_person ON public.tenure_vacancies(person_id);
CREATE INDEX IF NOT EXISTS idx_tenure_vacancies_date ON public.tenure_vacancies(effective_date);

-- Trigger enforcing fail-closed temporal boundaries and NULL term_start handling
CREATE OR REPLACE FUNCTION public.fn_validate_tenure_vacancy_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_term_start DATE;
BEGIN
  SELECT term_start INTO v_term_start
  FROM public.elected_tenures
  WHERE id = NEW.tenure_id;

  IF v_term_start IS NULL THEN
    RAISE EXCEPTION 'TEMPORAL_INVARIANT_VIOLATION: Cannot register vacancy for tenure (%) with NULL term_start',
      NEW.tenure_id
      USING ERRCODE = '23514';
  END IF;

  IF NEW.effective_date < v_term_start THEN
    RAISE EXCEPTION 'TEMPORAL_INVARIANT_VIOLATION: Vacancy effective_date (%) cannot precede tenure term_start (%)',
      NEW.effective_date, v_term_start
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_tenure_vacancy_invariants ON public.tenure_vacancies;
CREATE TRIGGER trg_validate_tenure_vacancy_invariants
  BEFORE INSERT OR UPDATE ON public.tenure_vacancies
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_tenure_vacancy_invariants();

ALTER TABLE public.tenure_vacancies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY tenure_vacancies_select_policy ON public.tenure_vacancies
    FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY tenure_vacancies_service_role_all ON public.tenure_vacancies
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

GRANT SELECT ON public.tenure_vacancies TO anon, authenticated;
GRANT ALL ON public.tenure_vacancies TO service_role;


-- ─── 4. ELECTED TENURES STATUS BACKFILL & JURISDICTION EXPANSION ───────────────

-- Step A: Add column as nullable without default
ALTER TABLE public.elected_tenures ADD COLUMN IF NOT EXISTS tenure_status TEXT;

-- Step B: Deterministic backfill based strictly on available truth (Approach B)
UPDATE public.elected_tenures t
SET tenure_status = CASE
  WHEN t.is_current = true THEN 'ACTIVE'
  WHEN t.is_current = false THEN 'COMPLETED'
  ELSE 'PROVISIONAL'
END
WHERE tenure_status IS NULL;

-- Step C: Enforce DEFAULT 'ACTIVE', NOT NULL, and CHECK constraint
ALTER TABLE public.elected_tenures 
  ALTER COLUMN tenure_status SET DEFAULT 'ACTIVE',
  ALTER COLUMN tenure_status SET NOT NULL;

ALTER TABLE public.elected_tenures DROP CONSTRAINT IF EXISTS elected_tenures_status_check;
ALTER TABLE public.elected_tenures ADD CONSTRAINT elected_tenures_status_check
  CHECK (tenure_status IN ('ACTIVE', 'COMPLETED', 'VACATED_RESIGNATION', 'VACATED_DEATH', 'VACATED_DISQUALIFICATION', 'ANNULLED', 'PROVISIONAL'));

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
