-- Checkpoint 061: National AC-PC Mappings
DO $$
DECLARE
  v_map_count INT;
BEGIN
  RAISE NOTICE '=== CHECKPOINT 061: National AC-PC Mappings ===';
  SELECT count(*) INTO v_map_count FROM public.constituency_parliamentary_mappings;
  IF v_map_count < 4142 THEN
    RAISE EXCEPTION 'CHECKPOINT 061 FAILED: Expected at least 4,142 mappings, found %', v_map_count;
  END IF;
  RAISE NOTICE 'CHECKPOINT 061 PASS: National AC-PC mappings verified (%).', v_map_count;
END $$;

SELECT 'constituency_parliamentary_mappings' as table_name, count(*) as count FROM public.constituency_parliamentary_mappings;
