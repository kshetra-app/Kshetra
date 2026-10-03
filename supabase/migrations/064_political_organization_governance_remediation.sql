-- ==============================================================================
-- Migration 064: Political Organization Schema & Governance Remediation (W021.5-B2.2-B)
-- Target: Staging Supabase & Local PostgreSQL (fkpigozcqnmcvofuksar)
-- Authority: CTO Master Execution Directive W021.5-B2.2-B
-- Scope:
--   1. Create public.organization_multilingual_names (GAP-ORG-001)
--   2. Create public.organization_aliases for deterministic alias resolution (GAP-ORG-002)
--   3. Create public.organization_symbols for temporal symbol validity (GAP-ORG-003)
--   4. Hardening organization_relationships check constraints (Splits, Renamings, Mergers)
--   5. Hardening political_organizations recognition_level (Prohibit synthetic independents GAP-ORG-004)
--   6. Row-Level Security (RLS) policies and security invariants
-- ==============================================================================

BEGIN;

-- ─── 1. ORGANIZATION MULTILINGUAL NAMES (GAP-ORG-001) ─────────────────────────

CREATE TABLE IF NOT EXISTS public.organization_multilingual_names (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       TEXT NOT NULL REFERENCES public.political_organizations(id) ON DELETE CASCADE,
  language_code         TEXT NOT NULL, -- ISO 639-1: 'te', 'hi', 'ta', 'bn', 'mr', 'kn', 'ml', 'gu', 'pa', 'or', 'as', 'ur', 'en'
  script_code           TEXT NOT NULL, -- ISO 15924: 'Telu', 'Deva', 'Taml', 'Beng', 'Knda', 'Mlym', 'Gujr', 'Guru', 'Orya', 'Arab', 'Latn'
  representation_type   TEXT NOT NULL CHECK (representation_type IN ('OFFICIAL', 'PREFERRED', 'SOURCE_NATIVE', 'TRANSLITERATION', 'ALIAS', 'HISTORICAL')),
  name_value            TEXT NOT NULL CHECK (char_length(name_value) BETWEEN 1 AND 250),
  short_name_value      TEXT CHECK (char_length(short_name_value) BETWEEN 1 AND 50),
  is_preferred          BOOLEAN NOT NULL DEFAULT false,
  is_official           BOOLEAN NOT NULL DEFAULT false,
  valid_from            DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to              DATE,
  source                TEXT,
  data_status           public.data_status_enum NOT NULL DEFAULT 'OFFICIAL',
  provenance_id         UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_multi_name UNIQUE (organization_id, language_code, script_code, representation_type, name_value)
);

COMMENT ON TABLE public.organization_multilingual_names IS 'Statutory and localized political organization names across Indian languages and scripts.';

CREATE INDEX IF NOT EXISTS idx_org_multi_names_org ON public.organization_multilingual_names(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_multi_names_lang_script ON public.organization_multilingual_names(language_code, script_code);
CREATE INDEX IF NOT EXISTS idx_org_multi_names_type ON public.organization_multilingual_names(representation_type);

ALTER TABLE public.organization_multilingual_names ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY p_select_org_multilingual_names ON public.organization_multilingual_names
    FOR SELECT TO public USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- ─── 2. DETERMINISTIC ORGANIZATION ALIAS REGISTRY (GAP-ORG-002) ───────────────

CREATE TABLE IF NOT EXISTS public.organization_aliases (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_lookup_key        TEXT NOT NULL, -- Case-insensitive normalized key, e.g. 'cpi(m)', 'tmc', 'trs'
  raw_original_string   TEXT NOT NULL, -- Exact verbatim raw string encountered in source
  organization_id       TEXT NOT NULL REFERENCES public.political_organizations(id) ON DELETE CASCADE,
  alias_type            TEXT NOT NULL CHECK (alias_type IN ('STANDARD_ABBREVIATION', 'TYPOGRAPHIC_VARIANT', 'HISTORICAL_PREDECESSOR', 'ECI_PARTY_CODE', 'REGIONAL_VARIANT', 'POPULAR_NAME')),
  jurisdiction_scope    TEXT REFERENCES public.states(code) ON DELETE RESTRICT, -- NULL = National scope
  valid_from            DATE NOT NULL DEFAULT '1947-08-15',
  valid_to              DATE,
  confidence            TEXT NOT NULL DEFAULT 'VERIFIED' CHECK (confidence IN ('VERIFIED', 'RECONCILED', 'PROVISIONAL', 'CONFLICTING')),
  provenance_id         UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Note: In PostgreSQL, NULL values in unique constraints allow multiple entries with NULL jurisdiction.
-- We create two explicit partial unique indexes to guarantee deterministic alias uniqueness:
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_alias_national
  ON public.organization_aliases (raw_lookup_key, COALESCE(valid_from, '1947-08-15'))
  WHERE jurisdiction_scope IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_alias_jurisdictional
  ON public.organization_aliases (raw_lookup_key, jurisdiction_scope, COALESCE(valid_from, '1947-08-15'))
  WHERE jurisdiction_scope IS NOT NULL;

COMMENT ON TABLE public.organization_aliases IS 'First-class deterministic lookup registry mapping raw party strings to canonical political organizations.';

CREATE INDEX IF NOT EXISTS idx_org_aliases_key ON public.organization_aliases(raw_lookup_key);
CREATE INDEX IF NOT EXISTS idx_org_aliases_org ON public.organization_aliases(organization_id);

ALTER TABLE public.organization_aliases ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY p_select_org_aliases ON public.organization_aliases
    FOR SELECT TO public USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- ─── 3. TEMPORAL PARTY SYMBOLS & RECOGNITION (GAP-ORG-003) ───────────────────

CREATE TABLE IF NOT EXISTS public.organization_symbols (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       TEXT NOT NULL REFERENCES public.political_organizations(id) ON DELETE CASCADE,
  symbol_name           TEXT NOT NULL, -- e.g. 'Hand', 'Lotus', 'Bow and Arrow', 'Flaming Torch', 'Car', 'Clock'
  symbol_url            TEXT,
  jurisdiction_scope    TEXT REFERENCES public.states(code) ON DELETE RESTRICT, -- NULL = National
  valid_from            DATE NOT NULL DEFAULT '1947-08-15',
  valid_to              DATE,
  is_current            BOOLEAN NOT NULL DEFAULT true,
  statutory_order_ref   TEXT, -- e.g. 'ECI Notification No. 56/Dispute/2022'
  data_status           public.data_status_enum NOT NULL DEFAULT 'OFFICIAL',
  provenance_id         UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_symbols_timeline UNIQUE (organization_id, symbol_name, valid_from)
);

COMMENT ON TABLE public.organization_symbols IS 'Temporal statutory election symbols allocated to political organizations over time.';

CREATE INDEX IF NOT EXISTS idx_org_symbols_org ON public.organization_symbols(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_symbols_current ON public.organization_symbols(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_org_symbols_dates ON public.organization_symbols(valid_from, valid_to);

ALTER TABLE public.organization_symbols ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY p_select_org_symbols ON public.organization_symbols
    FOR SELECT TO public USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- ─── 4. ORGANIZATION RELATIONSHIPS CONSTRAINT HARDENING ───────────────────────

-- Expand relationship_type check constraint on public.organization_relationships
ALTER TABLE public.organization_relationships DROP CONSTRAINT IF EXISTS organization_relationships_relationship_type_check;
ALTER TABLE public.organization_relationships ADD CONSTRAINT organization_relationships_relationship_type_check
  CHECK (relationship_type IN (
    'alliance_with',
    'coalition_partner',
    'parent_of',
    'subsidiary_of',
    'merged_into',
    'renamed_to',
    'succeeded_by',
    'predecessor_of',
    'split_from',
    'faction_of',
    'other'
  ));


-- ─── 5. INDEPENDENT PROHIBITION & RECOGNITION ENUM HARDENING (GAP-ORG-004) ────

-- Drop the check constraint on recognition_level that allowed 'independent'
ALTER TABLE public.political_organizations DROP CONSTRAINT IF EXISTS political_organizations_recognition_level_check;

-- Prohibit 'independent' as an organization recognition level
ALTER TABLE public.political_organizations ADD CONSTRAINT political_organizations_recognition_level_check
  CHECK (recognition_level IN ('national', 'state', 'unrecognized', 'registered_unrecognized'));

-- Add constraint explicitly prohibiting synthetic independent party IDs
ALTER TABLE public.political_organizations DROP CONSTRAINT IF EXISTS chk_prohibit_synthetic_independent;
ALTER TABLE public.political_organizations ADD CONSTRAINT chk_prohibit_synthetic_independent
  CHECK (id NOT IN ('ORG-INDEPENDENT', 'ORG-PARTY-IND', 'ORG-PARTY-INDP', 'ORG-PARTY-INDEPENDENT'));

COMMIT;
