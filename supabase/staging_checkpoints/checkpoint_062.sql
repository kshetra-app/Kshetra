-- Checkpoint 062: Assam 2023 Delimitation
DO $$
DECLARE
  v_assam_ac INT;
BEGIN
  RAISE NOTICE '=== CHECKPOINT 062: Assam 2023 Delimitation ===';
  SELECT count(*) INTO v_assam_ac FROM public.constituencies WHERE state_code = 'AS';
  IF v_assam_ac < 126 THEN
    RAISE EXCEPTION 'CHECKPOINT 062 FAILED: Expected 126 Assam ACs, found %', v_assam_ac;
  END IF;
  RAISE NOTICE 'CHECKPOINT 062 PASS: Assam post-2023 delimitation verified (126 ACs).';
END $$;

SELECT 'assam_constituencies' as table_name, count(*) as count FROM public.constituencies WHERE state_code = 'AS';
