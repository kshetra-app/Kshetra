-- Checkpoint 065: Political Organization Registry
DO $$
DECLARE
  v_org_count INT;
  v_alias_count INT;
BEGIN
  RAISE NOTICE '=== CHECKPOINT 065: Political Organization Registry ===';
  SELECT count(*) INTO v_org_count FROM public.political_organizations;
  SELECT count(*) INTO v_alias_count FROM public.organization_aliases;
  IF v_org_count < 107 THEN
    RAISE EXCEPTION 'CHECKPOINT 065 FAILED: Expected at least 107 political_organizations, found %', v_org_count;
  END IF;
  IF v_alias_count < 1043 THEN
    RAISE EXCEPTION 'CHECKPOINT 065 FAILED: Expected at least 1,043 organization_aliases, found %', v_alias_count;
  END IF;
  RAISE NOTICE 'CHECKPOINT 065 PASS: Political organizations (%) and aliases (%) verified.', v_org_count, v_alias_count;
END $$;

SELECT 'political_organizations' as table_name, count(*) as count FROM public.political_organizations
UNION ALL SELECT 'organization_aliases', count(*) FROM public.organization_aliases
UNION ALL SELECT 'organization_multilingual_names', count(*) FROM public.organization_multilingual_names
UNION ALL SELECT 'organization_symbols', count(*) FROM public.organization_symbols;
