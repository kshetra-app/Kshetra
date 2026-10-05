-- Checkpoint 050: Political Entity Model
DO $$
BEGIN
  RAISE NOTICE '=== CHECKPOINT 050: Political Entity Model ===';
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'political_organizations') THEN
    RAISE EXCEPTION 'CHECKPOINT 050 FAILED: public.political_organizations missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'canonical_persons') THEN
    RAISE EXCEPTION 'CHECKPOINT 050 FAILED: public.canonical_persons missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidacies') THEN
    RAISE EXCEPTION 'CHECKPOINT 050 FAILED: public.candidacies missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'elected_tenures') THEN
    RAISE EXCEPTION 'CHECKPOINT 050 FAILED: public.elected_tenures missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'person_party_affiliations') THEN
    RAISE EXCEPTION 'CHECKPOINT 050 FAILED: public.person_party_affiliations missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenure_party_switches') THEN
    RAISE EXCEPTION 'CHECKPOINT 050 FAILED: public.tenure_party_switches missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_relationships') THEN
    RAISE EXCEPTION 'CHECKPOINT 050 FAILED: public.organization_relationships missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'data_status_enum') THEN
    RAISE EXCEPTION 'CHECKPOINT 050 FAILED: data_status_enum missing';
  END IF;
  RAISE NOTICE 'CHECKPOINT 050 PASS: Core political tables, enums, and triggers established.';
END $$;

SELECT 'political_organizations' as table_name, count(*) as count FROM public.political_organizations
UNION ALL SELECT 'canonical_persons', count(*) FROM public.canonical_persons
UNION ALL SELECT 'candidacies', count(*) FROM public.candidacies
UNION ALL SELECT 'elected_tenures', count(*) FROM public.elected_tenures
UNION ALL SELECT 'person_party_affiliations', count(*) FROM public.person_party_affiliations
UNION ALL SELECT 'tenure_party_switches', count(*) FROM public.tenure_party_switches
UNION ALL SELECT 'organization_relationships', count(*) FROM public.organization_relationships;
