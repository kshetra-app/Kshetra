-- Checkpoint 066: Downstream Civic Extensions
DO $$
BEGIN
  RAISE NOTICE '=== CHECKPOINT 066: Downstream Civic Extensions ===';
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'constituency_demographics') THEN
    RAISE EXCEPTION 'CHECKPOINT 066 FAILED: public.constituency_demographics missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidate_affidavits' AND column_name = 'person_id') THEN
    RAISE EXCEPTION 'CHECKPOINT 066 FAILED: candidate_affidavits.person_id column missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidate_affidavits' AND column_name = 'candidacy_id') THEN
    RAISE EXCEPTION 'CHECKPOINT 066 FAILED: candidate_affidavits.candidacy_id column missing';
  END IF;
  RAISE NOTICE 'CHECKPOINT 066 PASS: Civic extension tables and affidavit foreign keys verified.';
END $$;

SELECT 'constituency_demographics' as table_name, count(*) as count FROM public.constituency_demographics
UNION ALL SELECT 'candidate_affidavits', count(*) FROM public.candidate_affidavits;
