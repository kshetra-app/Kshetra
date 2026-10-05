-- Checkpoint 059: National Constituency Registry
DO $$
DECLARE
  v_ac_count INT;
  v_pc_count INT;
BEGIN
  RAISE NOTICE '=== CHECKPOINT 059: National Constituency Registry ===';
  SELECT count(*) INTO v_ac_count FROM public.constituencies;
  SELECT count(*) INTO v_pc_count FROM public.parliamentary_constituencies;
  IF v_ac_count < 4142 THEN
    RAISE EXCEPTION 'CHECKPOINT 059 FAILED: Expected at least 4,142 ACs in public.constituencies, found %', v_ac_count;
  END IF;
  IF v_pc_count < 543 THEN
    RAISE EXCEPTION 'CHECKPOINT 059 FAILED: Expected at least 543 PCs in public.parliamentary_constituencies, found %', v_pc_count;
  END IF;
  RAISE NOTICE 'CHECKPOINT 059 PASS: National ACs (%), PCs (%) populated successfully.', v_ac_count, v_pc_count;
END $$;

SELECT 'constituencies' as table_name, count(*) as count FROM public.constituencies
UNION ALL SELECT 'parliamentary_constituencies', count(*) FROM public.parliamentary_constituencies;
