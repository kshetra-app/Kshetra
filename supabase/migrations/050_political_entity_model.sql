-- ==============================================================================
-- Migration 050: Political Entity Model (W018)
-- Target: Staging Supabase (fkpigozcqnmcvofuksar)
-- Authoritative Plan: PLAN-W018-REV-1.0.md
--
-- Security Baseline:
--   1. 100% SECURITY INVOKER for all stored functions (prosecdef = false).
--   2. Explicit immutable search_path pinned: SET search_path = public, pg_temp.
--   3. Row-Level Security (RLS) enabled on all tables.
--   4. Identity claim mutations strictly restricted to service_role / verified admins.
--   5. Deterministic identity linkage ledger restricted to authenticated callers.
--   6. Full adherence to Migration 039 Data Governance & Provenance standards.
--   7. Strict immutability triggers for candidacy and tenure election party history.
-- ==============================================================================

BEGIN;

-- ─── 0. TYPE SAFETY & PREREQUISITES ─────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.data_status_enum AS ENUM (
    'OFFICIAL',
    'DERIVED',
    'VERIFIED',
    'ESTIMATE',
    'SCENARIO',
    'INFERRED',
    'UNVERIFIED',
    'UNKNOWN'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.provenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.canonical_persons (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name      TEXT NOT NULL CHECK (char_length(canonical_name) BETWEEN 2 AND 150),
  aliases             TEXT[] NOT NULL DEFAULT '{}',
  gender              TEXT CHECK (gender IN ('male', 'female', 'other')),
  dob                 DATE,
  dob_estimated       BOOLEAN NOT NULL DEFAULT false,
  photo_url           TEXT,
  eci_candidate_id    TEXT UNIQUE,
  sansad_member_id    TEXT UNIQUE,
  primary_user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
  data_status         public.data_status_enum NOT NULL DEFAULT 'UNVERIFIED',
  provenance_id       UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.canonical_persons IS 'Core canonical human identity for political actors across all offices, elections, and civic roles.';
COMMENT ON COLUMN public.canonical_persons.primary_user_id IS 'Verified mobile user account claim. Can only be bound via authorized verification review.';

CREATE INDEX IF NOT EXISTS idx_canonical_persons_name ON public.canonical_persons(canonical_name);
CREATE INDEX IF NOT EXISTS idx_canonical_persons_status ON public.canonical_persons(data_status);
CREATE INDEX IF NOT EXISTS idx_canonical_persons_eci_id ON public.canonical_persons(eci_candidate_id) WHERE eci_candidate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canonical_persons_sansad ON public.canonical_persons(sansad_member_id) WHERE sansad_member_id IS NOT NULL;


-- ─── 2. POLITICAL ORGANIZATIONS (Parties, Media Houses, Alliances) ─────────────

CREATE TABLE IF NOT EXISTS public.political_organizations (
  id                  TEXT PRIMARY KEY,  -- e.g. 'ORG-PARTY-INC', 'ORG-PARTY-BJP', 'ORG-MEDIA-TV9'
  org_type            TEXT NOT NULL CHECK (org_type IN ('political_party', 'media_organization', 'civic_organization', 'political_alliance', 'other')),
  name                TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 150),
  short_name          TEXT NOT NULL CHECK (char_length(short_name) BETWEEN 1 AND 30),
  ec_party_code       TEXT UNIQUE,
  recognition_level   TEXT CHECK (recognition_level IN ('national', 'state', 'unrecognized', 'independent')),
  headquarters_state  TEXT REFERENCES public.states(code) ON DELETE RESTRICT,
  parent_org_id       TEXT REFERENCES public.political_organizations(id) ON DELETE SET NULL,
  symbol_url          TEXT,
  brand_colors        JSONB NOT NULL DEFAULT '{}'::jsonb,
  page_id             UUID REFERENCES public.pages(id) ON DELETE SET NULL,
  data_status         public.data_status_enum NOT NULL DEFAULT 'OFFICIAL',
  provenance_id       UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.political_organizations IS 'Canonical registry of political parties, media organizations, civic organizations, and alliances.';

CREATE INDEX IF NOT EXISTS idx_political_orgs_type ON public.political_organizations(org_type);
CREATE INDEX IF NOT EXISTS idx_political_orgs_short ON public.political_organizations(short_name);
CREATE INDEX IF NOT EXISTS idx_political_orgs_parent ON public.political_organizations(parent_org_id) WHERE parent_org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_political_orgs_ec_code ON public.political_organizations(ec_party_code) WHERE ec_party_code IS NOT NULL;


-- ─── 3. PERSON ROLES (Temporal hats worn by a person) ──────────────────────────

CREATE TABLE IF NOT EXISTS public.person_roles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id           UUID NOT NULL REFERENCES public.canonical_persons(id) ON DELETE RESTRICT,
  role_type           TEXT NOT NULL CHECK (role_type IN ('mp', 'mla', 'mlc', 'local_representative', 'candidate', 'aspirant', 'journalist', 'party_official')),
  organization_id     TEXT REFERENCES public.political_organizations(id) ON DELETE RESTRICT,
  relationship_type   TEXT NOT NULL DEFAULT 'member_of' CHECK (relationship_type IN ('member_of', 'affiliated_with', 'contested_for', 'employed_by', 'alliance_with')),
  valid_from          DATE NOT NULL,
  valid_to            DATE,
  is_current          BOOLEAN NOT NULL DEFAULT true,
  role_metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  data_status         public.data_status_enum NOT NULL DEFAULT 'VERIFIED',
  provenance_id       UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.person_roles IS 'Temporal roles held by a person (e.g. journalist, aspirant, party secretary) with explicit relationship semantics.';

CREATE INDEX IF NOT EXISTS idx_person_roles_person ON public.person_roles(person_id);
CREATE INDEX IF NOT EXISTS idx_person_roles_type ON public.person_roles(role_type);
CREATE INDEX IF NOT EXISTS idx_person_roles_rel ON public.person_roles(relationship_type);
CREATE INDEX IF NOT EXISTS idx_person_roles_org ON public.person_roles(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_person_roles_current ON public.person_roles(is_current) WHERE is_current = true;


-- ─── 4. CANDIDACIES (Attaching a person to an election contest) ────────────────

CREATE TABLE IF NOT EXISTS public.candidacies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id           UUID NOT NULL REFERENCES public.canonical_persons(id) ON DELETE RESTRICT,
  election_year       INTEGER NOT NULL CHECK (election_year >= 1947),
  election_type       TEXT NOT NULL CHECK (election_type IN ('parliamentary', 'assembly', 'local_body', 'by_election')),
  constituency_type   TEXT NOT NULL CHECK (constituency_type IN ('parliamentary', 'assembly', 'local_body_ward', 'panchayat')),
  constituency_id     TEXT NOT NULL,
  party_id            TEXT REFERENCES public.political_organizations(id) ON DELETE RESTRICT,
  is_independent      BOOLEAN NOT NULL DEFAULT false,
  result              TEXT NOT NULL CHECK (result IN ('won', 'lost', 'forfeited_deposit', 'withdrawn', 'pending')),
  votes_received      INTEGER NOT NULL DEFAULT 0 CHECK (votes_received >= 0),
  vote_share          NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (vote_share BETWEEN 0 AND 100),
  rank                INTEGER NOT NULL DEFAULT 0 CHECK (rank >= 0),
  affidavit_id        UUID REFERENCES public.candidate_affidavits(id) ON DELETE SET NULL,
  data_status         public.data_status_enum NOT NULL DEFAULT 'OFFICIAL',
  provenance_id       UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(person_id, election_year, election_type, constituency_id)
);

COMMENT ON TABLE public.candidacies IS 'Historical election contest participation by a canonical person.';

CREATE INDEX IF NOT EXISTS idx_candidacies_person ON public.candidacies(person_id);
CREATE INDEX IF NOT EXISTS idx_candidacies_election ON public.candidacies(election_year, election_type);
CREATE INDEX IF NOT EXISTS idx_candidacies_constituency ON public.candidacies(constituency_id);
CREATE INDEX IF NOT EXISTS idx_candidacies_party ON public.candidacies(party_id) WHERE party_id IS NOT NULL;


-- ─── 5. ELECTED TENURES (Sovereign office-holding periods) ──────────────────────

CREATE TABLE IF NOT EXISTS public.elected_tenures (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id               UUID NOT NULL REFERENCES public.canonical_persons(id) ON DELETE RESTRICT,
  office_type             TEXT NOT NULL CHECK (office_type IN ('mp_lok_sabha', 'mp_rajya_sabha', 'mla', 'mlc', 'mayor', 'sarpanch', 'corporator', 'mptc_member', 'zptc_member')),
  jurisdiction_type       TEXT NOT NULL CHECK (jurisdiction_type IN ('parliamentary_constituency', 'assembly_constituency', 'urban_local_body', 'ulb_ward', 'gram_panchayat', 'gp_ward', 'mandal_parishad', 'mptc_division', 'zilla_parishad', 'zptc_division')),
  jurisdiction_id         TEXT NOT NULL,
  constituency_version_id UUID,
  term_start              DATE NOT NULL,
  term_end                DATE,
  is_current              BOOLEAN NOT NULL DEFAULT true,
  party_at_election       TEXT REFERENCES public.political_organizations(id) ON DELETE RESTRICT,
  current_party           TEXT REFERENCES public.political_organizations(id) ON DELETE RESTRICT,
  defection_date          DATE,
  candidacy_id            UUID REFERENCES public.candidacies(id) ON DELETE SET NULL,
  data_status             public.data_status_enum NOT NULL DEFAULT 'OFFICIAL',
  provenance_id           UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.elected_tenures IS 'Sovereign elected office terms held by canonical persons with temporal and party shift tracking.';

CREATE INDEX IF NOT EXISTS idx_elected_tenures_person ON public.elected_tenures(person_id);
CREATE INDEX IF NOT EXISTS idx_elected_tenures_office ON public.elected_tenures(office_type);
CREATE INDEX IF NOT EXISTS idx_elected_tenures_jurisdiction ON public.elected_tenures(jurisdiction_type, jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_elected_tenures_current ON public.elected_tenures(is_current) WHERE is_current = true;


-- ─── 5B. IMMUTABILITY GUARDS FOR CANDIDACIES & ELECTED TENURES ─────────────────

CREATE OR REPLACE FUNCTION public.fn_prevent_candidacy_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.party_id IS DISTINCT FROM NEW.party_id THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELD: party_id cannot be modified on historical candidacies'
      USING ERRCODE = '23514';
  END IF;
  IF OLD.person_id IS DISTINCT FROM NEW.person_id THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELD: person_id cannot be modified on candidacies'
      USING ERRCODE = '23514';
  END IF;
  IF OLD.election_year IS DISTINCT FROM NEW.election_year OR OLD.constituency_id IS DISTINCT FROM NEW.constituency_id THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELD: election coordinate cannot be modified on candidacies'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_candidacies_immutable_fields ON public.candidacies;
CREATE TRIGGER trg_candidacies_immutable_fields
  BEFORE UPDATE ON public.candidacies
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_candidacy_mutation();


CREATE OR REPLACE FUNCTION public.fn_prevent_tenure_history_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.party_at_election IS DISTINCT FROM NEW.party_at_election THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELD: party_at_election cannot be modified after creation'
      USING ERRCODE = '23514';
  END IF;
  IF OLD.person_id IS DISTINCT FROM NEW.person_id THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELD: person_id cannot be modified on elected_tenures'
      USING ERRCODE = '23514';
  END IF;
  IF OLD.jurisdiction_id IS DISTINCT FROM NEW.jurisdiction_id THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELD: jurisdiction_id cannot be modified on elected_tenures'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_elected_tenures_immutable_fields ON public.elected_tenures;
CREATE TRIGGER trg_elected_tenures_immutable_fields
  BEFORE UPDATE ON public.elected_tenures
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_tenure_history_mutation();


-- ─── 6. PERSON IDENTITY LINKAGES (Multi-table Resolution Ledger) ────────────────

CREATE TABLE IF NOT EXISTS public.person_identity_linkages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id           UUID NOT NULL REFERENCES public.canonical_persons(id) ON DELETE CASCADE,
  source_system       TEXT NOT NULL CHECK (source_system IN ('legislator_profiles', 'candidate_affidavits', 'representatives', 'aspirant_profiles', 'journalist_profiles', 'politician_portal_profiles', 'myneta', 'sansad', 'eci')),
  source_record_id    TEXT NOT NULL,
  match_method        TEXT NOT NULL CHECK (match_method IN ('exact_eci_id', 'exact_sansad_id', 'user_verified_claim', 'manual_curated', 'deterministic_biographic_tuple')),
  confidence          NUMERIC(3,2) NOT NULL CHECK (confidence BETWEEN 0.00 AND 1.00),
  curated_by          TEXT NOT NULL DEFAULT 'system',
  curated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  provenance_id       UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_system, source_record_id)
);

COMMENT ON TABLE public.person_identity_linkages IS 'Deterministic and auditable link resolving external records to their canonical person.';

CREATE INDEX IF NOT EXISTS idx_identity_linkages_person ON public.person_identity_linkages(person_id);
CREATE INDEX IF NOT EXISTS idx_identity_linkages_source ON public.person_identity_linkages(source_system, source_record_id);


-- ─── 7. DETERMINISTIC IDENTITY RESOLUTION STORED PROCEDURES ────────────────────
-- 100% SECURITY INVOKER with immutable search_path

CREATE OR REPLACE FUNCTION public.fn_resolve_canonical_person(
  p_source_system     TEXT,
  p_source_record_id  TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_person_id UUID;
BEGIN
  IF p_source_system IS NULL OR p_source_record_id IS NULL OR trim(p_source_system) = '' OR trim(p_source_record_id) = '' THEN
    RETURN NULL;
  END IF;

  SELECT person_id
    INTO v_person_id
    FROM public.person_identity_linkages
   WHERE source_system = p_source_system
     AND source_record_id = p_source_record_id
     AND is_active = true;

  RETURN v_person_id;
END;
$$;

COMMENT ON FUNCTION public.fn_resolve_canonical_person(TEXT, TEXT) IS 'Resolves an external or source-table record ID to its canonical person UUID. Returns NULL if unmapped or invalid (fails closed).';


CREATE OR REPLACE FUNCTION public.fn_link_person_identity(
  p_person_id         UUID,
  p_source_system     TEXT,
  p_source_record_id  TEXT,
  p_match_method      TEXT,
  p_confidence        NUMERIC DEFAULT 1.00,
  p_curated_by        TEXT DEFAULT 'system'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_link_id UUID;
BEGIN
  -- Assert person exists
  IF NOT EXISTS (SELECT 1 FROM public.canonical_persons WHERE id = p_person_id) THEN
    RAISE EXCEPTION 'PERSON_NOT_FOUND: Canonical person % does not exist', p_person_id
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.person_identity_linkages (
    person_id,
    source_system,
    source_record_id,
    match_method,
    confidence,
    curated_by,
    is_active
  )
  VALUES (
    p_person_id,
    p_source_system,
    p_source_record_id,
    p_match_method,
    p_confidence,
    p_curated_by,
    true
  )
  ON CONFLICT (source_system, source_record_id)
  DO UPDATE SET
    person_id = EXCLUDED.person_id,
    match_method = EXCLUDED.match_method,
    confidence = EXCLUDED.confidence,
    curated_by = EXCLUDED.curated_by,
    is_active = true,
    curated_at = now()
  RETURNING id INTO v_link_id;

  RETURN v_link_id;
END;
$$;

COMMENT ON FUNCTION public.fn_link_person_identity(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) IS 'Upserts a deterministic identity linkage connecting an external source record to a canonical person.';


-- ─── 8. ROW LEVEL SECURITY (RLS) & PERMISSIONS ─────────────────────────────────

ALTER TABLE public.canonical_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.political_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elected_tenures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_identity_linkages ENABLE ROW LEVEL SECURITY;

-- Public SELECT policies (canonical public registry open to authenticated & anon)
CREATE POLICY canonical_persons_select_policy ON public.canonical_persons
  FOR SELECT USING (true);

CREATE POLICY political_organizations_select_policy ON public.political_organizations
  FOR SELECT USING (true);

CREATE POLICY person_roles_select_policy ON public.person_roles
  FOR SELECT USING (true);

CREATE POLICY candidacies_select_policy ON public.candidacies
  FOR SELECT USING (true);

CREATE POLICY elected_tenures_select_policy ON public.elected_tenures
  FOR SELECT USING (true);

-- Internal identity linkage ledger is restricted: authenticated callers & service_role only (no public anonymous scraping)
CREATE POLICY person_identity_linkages_select_policy ON public.person_identity_linkages
  FOR SELECT TO authenticated, service_role USING (true);

-- Mutations restricted strictly to service_role (via RLS default denial for anon/authenticated)
CREATE POLICY canonical_persons_service_role_all ON public.canonical_persons
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY political_organizations_service_role_all ON public.political_organizations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY person_roles_service_role_all ON public.person_roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY candidacies_service_role_all ON public.candidacies
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY elected_tenures_service_role_all ON public.elected_tenures
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY person_identity_linkages_service_role_all ON public.person_identity_linkages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Explicit Grants
GRANT SELECT ON public.canonical_persons TO anon, authenticated;
GRANT SELECT ON public.political_organizations TO anon, authenticated;
GRANT SELECT ON public.person_roles TO anon, authenticated;
GRANT SELECT ON public.candidacies TO anon, authenticated;
GRANT SELECT ON public.elected_tenures TO anon, authenticated;
GRANT SELECT ON public.person_identity_linkages TO authenticated; -- anon revoked for enumeration protection

GRANT ALL ON public.canonical_persons TO service_role;
GRANT ALL ON public.political_organizations TO service_role;
GRANT ALL ON public.person_roles TO service_role;
GRANT ALL ON public.candidacies TO service_role;
GRANT ALL ON public.elected_tenures TO service_role;
GRANT ALL ON public.person_identity_linkages TO service_role;

-- Stored function execution grants
-- fn_resolve_canonical_person: Revoked from PUBLIC and anon; granted to authenticated & service_role
REVOKE ALL ON FUNCTION public.fn_resolve_canonical_person(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_resolve_canonical_person(TEXT, TEXT) TO authenticated, service_role;

-- fn_link_person_identity: Restricted strictly to service_role
REVOKE ALL ON FUNCTION public.fn_link_person_identity(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_link_person_identity(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) TO service_role;

-- Immutability guard functions: executable by authenticated & service_role
REVOKE ALL ON FUNCTION public.fn_prevent_candidacy_mutation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_prevent_candidacy_mutation() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fn_prevent_tenure_history_mutation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_prevent_tenure_history_mutation() TO authenticated, service_role;

COMMIT;
