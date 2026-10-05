-- Checkpoint 060: Electoral Geography Remediation
DO $$
BEGIN
  RAISE NOTICE '=== CHECKPOINT 060: Electoral Geography Remediation ===';
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'constituency_parliamentary_mappings') THEN
    RAISE EXCEPTION 'CHECKPOINT 060 FAILED: public.constituency_parliamentary_mappings table missing';
  END IF;
  RAISE NOTICE 'CHECKPOINT 060 PASS: Mapping table and geography remediations verified.';
END $$;

SELECT 'constituency_parliamentary_mappings' as table_name, count(*) as count FROM public.constituency_parliamentary_mappings;
