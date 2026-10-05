-- Checkpoint 063: Political Identity Foundation
DO $$
BEGIN
  RAISE NOTICE '=== CHECKPOINT 063: Political Identity Foundation ===';
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'person_multilingual_identities') THEN
    RAISE EXCEPTION 'CHECKPOINT 063 FAILED: public.person_multilingual_identities missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'person_multilingual_identities' AND column_name = 'representation_type') THEN
    RAISE EXCEPTION 'CHECKPOINT 063 FAILED: representation_type column missing';
  END IF;
  RAISE NOTICE 'CHECKPOINT 063 PASS: Multi-script person identity table verified.';
END $$;

SELECT 'person_multilingual_identities' as table_name, count(*) as count FROM public.person_multilingual_identities;
