-- Checkpoint 064: Organization Governance Remediation
DO $$
BEGIN
  RAISE NOTICE '=== CHECKPOINT 064: Organization Governance Remediation ===';
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_multilingual_names') THEN
    RAISE EXCEPTION 'CHECKPOINT 064 FAILED: public.organization_multilingual_names missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_symbols') THEN
    RAISE EXCEPTION 'CHECKPOINT 064 FAILED: public.organization_symbols missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_aliases') THEN
    RAISE EXCEPTION 'CHECKPOINT 064 FAILED: public.organization_aliases missing';
  END IF;
  RAISE NOTICE 'CHECKPOINT 064 PASS: Organization ancillary tables verified.';
END $$;

SELECT 'organization_multilingual_names' as table_name, count(*) as count FROM public.organization_multilingual_names
UNION ALL SELECT 'organization_symbols', count(*) FROM public.organization_symbols
UNION ALL SELECT 'organization_aliases', count(*) FROM public.organization_aliases;
