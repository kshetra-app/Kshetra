-- ==============================================================================
-- KSHETRA W021.5 VERIFICATION SQL BATTERY (050-066)
-- Target: PostgreSQL / Supabase SQL Editor
-- Purpose: Read-only verification of schema, tables, columns, constraints, and counts
-- ==============================================================================

DO  
DECLARE
  v_cnt INTEGER;
BEGIN
  RAISE NOTICE '=== EXECUTING W021.5 SCHEMA VERIFICATION ===';

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'constituencies') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Table public.constituencies does not exist';
  ELSE
    RAISE NOTICE 'Table public.constituencies exists: PASS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parliamentary_constituencies') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Table public.parliamentary_constituencies does not exist';
  ELSE
    RAISE NOTICE 'Table public.parliamentary_constituencies exists: PASS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'constituency_parliamentary_mappings') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Table public.constituency_parliamentary_mappings does not exist';
  ELSE
    RAISE NOTICE 'Table public.constituency_parliamentary_mappings exists: PASS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'political_organizations') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Table public.political_organizations does not exist';
  ELSE
    RAISE NOTICE 'Table public.political_organizations exists: PASS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_aliases') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Table public.organization_aliases does not exist';
  ELSE
    RAISE NOTICE 'Table public.organization_aliases exists: PASS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_multilingual_names') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Table public.organization_multilingual_names does not exist';
  ELSE
    RAISE NOTICE 'Table public.organization_multilingual_names exists: PASS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_symbols') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Table public.organization_symbols does not exist';
  ELSE
    RAISE NOTICE 'Table public.organization_symbols exists: PASS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_relationships') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Table public.organization_relationships does not exist';
  ELSE
    RAISE NOTICE 'Table public.organization_relationships exists: PASS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'canonical_persons') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Table public.canonical_persons does not exist';
  ELSE
    RAISE NOTICE 'Table public.canonical_persons exists: PASS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'person_multilingual_identities') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Table public.person_multilingual_identities does not exist';
  ELSE
    RAISE NOTICE 'Table public.person_multilingual_identities exists: PASS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidacies') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Table public.candidacies does not exist';
  ELSE
    RAISE NOTICE 'Table public.candidacies exists: PASS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'elected_tenures') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Table public.elected_tenures does not exist';
  ELSE
    RAISE NOTICE 'Table public.elected_tenures exists: PASS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'person_party_affiliations') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Table public.person_party_affiliations does not exist';
  ELSE
    RAISE NOTICE 'Table public.person_party_affiliations exists: PASS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenure_party_switches') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Table public.tenure_party_switches does not exist';
  ELSE
    RAISE NOTICE 'Table public.tenure_party_switches exists: PASS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidate_affidavits') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Table public.candidate_affidavits does not exist';
  ELSE
    RAISE NOTICE 'Table public.candidate_affidavits exists: PASS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'constituency_lineage') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Table public.constituency_lineage does not exist';
  ELSE
    RAISE NOTICE 'Table public.constituency_lineage exists: PASS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'constituency_demographics') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Table public.constituency_demographics does not exist';
  ELSE
    RAISE NOTICE 'Table public.constituency_demographics exists: PASS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'provenance_records') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Table public.provenance_records does not exist';
  ELSE
    RAISE NOTICE 'Table public.provenance_records exists: PASS';
  END IF;

  -- Column check: person_multilingual_identities
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'person_multilingual_identities' AND column_name = 'representation_type') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Column person_multilingual_identities.representation_type missing';
  END IF;

  -- Column check: candidate_affidavits foreign keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidate_affidavits' AND column_name = 'person_id') THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Column candidate_affidavits.person_id missing';
  END IF;

  RAISE NOTICE '=== ALL 18 TARGET TABLES & CRITICAL SCHEMAS VERIFIED CLEANLY ===';
END ;

-- Table row count diagnostic query
SELECT 'constituencies' as table_name, count(*) as row_count FROM public.constituencies
UNION ALL SELECT 'parliamentary_constituencies', count(*) FROM public.parliamentary_constituencies
UNION ALL SELECT 'constituency_parliamentary_mappings', count(*) FROM public.constituency_parliamentary_mappings
UNION ALL SELECT 'political_organizations', count(*) FROM public.political_organizations
UNION ALL SELECT 'organization_aliases', count(*) FROM public.organization_aliases
UNION ALL SELECT 'organization_multilingual_names', count(*) FROM public.organization_multilingual_names
UNION ALL SELECT 'organization_symbols', count(*) FROM public.organization_symbols
UNION ALL SELECT 'organization_relationships', count(*) FROM public.organization_relationships
UNION ALL SELECT 'canonical_persons', count(*) FROM public.canonical_persons
UNION ALL SELECT 'person_multilingual_identities', count(*) FROM public.person_multilingual_identities
UNION ALL SELECT 'candidacies', count(*) FROM public.candidacies
UNION ALL SELECT 'elected_tenures', count(*) FROM public.elected_tenures
UNION ALL SELECT 'person_party_affiliations', count(*) FROM public.person_party_affiliations
UNION ALL SELECT 'tenure_party_switches', count(*) FROM public.tenure_party_switches
UNION ALL SELECT 'candidate_affidavits', count(*) FROM public.candidate_affidavits
UNION ALL SELECT 'constituency_lineage', count(*) FROM public.constituency_lineage
UNION ALL SELECT 'constituency_demographics', count(*) FROM public.constituency_demographics
UNION ALL SELECT 'provenance_records', count(*) FROM public.provenance_records;
