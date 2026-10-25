-- =============================================================================
-- W021.5 POST-072 AFFIDAVIT TRUTH GATE
-- Run in Supabase STAGING SQL Editor after 072_w021_5_affidavit_truth_hardening.sql.
-- Expected result: every query returns zero rows; final summary returns one PASS row.
-- =============================================================================

-- 1. Column nullability/defaults.
SELECT 'CRIT-072-01' AS check_id, column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='candidate_affidavit_disclosures'
  AND column_name IN (
    'criminal_cases_count','serious_ipc_count','convictions_count',
    'charges_framed_count','data_status'
  )
  AND (
    column_default IS NOT NULL
    OR (column_name IN ('criminal_cases_count','serious_ipc_count','convictions_count','charges_framed_count') AND is_nullable <> 'YES')
  );

-- 2. Missing mandatory constraints/FK target. Expected result: zero rows.
SELECT 'CRIT-072-02' AS check_id, expected.constraint_name
FROM (VALUES ('chk_affidavit_official_requires_source'), ('fk_affidavit_disclosures_constituency')) AS expected(constraint_name)
LEFT JOIN pg_constraint c
  ON c.conrelid='public.candidate_affidavit_disclosures'::regclass
 AND c.conname=expected.constraint_name
WHERE c.oid IS NULL;

-- 3. No OFFICIAL row without source hash + provenance + source identifier.
SELECT 'CRIT-072-03' AS check_id, id, data_status, provenance_id, source_hash
FROM public.candidate_affidavit_disclosures
WHERE data_status='OFFICIAL'::public.data_status_enum
  AND (
    provenance_id IS NULL
    OR source_hash IS NULL
    OR source_hash !~* '^[0-9a-f]{64}$'
    OR (NULLIF(btrim(source_affidavit_url),'') IS NULL AND NULLIF(btrim(source_eci_affidavit_id),'') IS NULL)
  );

-- 4. No orphan constituency references.
SELECT 'CRIT-072-04' AS check_id, d.id, d.constituency_id
FROM public.candidate_affidavit_disclosures d
LEFT JOIN public.constituencies c ON c.id=d.constituency_id
WHERE c.id IS NULL;

-- 5. RLS enabled and SELECT policy present.
SELECT 'CRIT-072-05' AS check_id, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname='candidate_affidavit_disclosures'
  AND c.relrowsecurity IS NOT TRUE;

SELECT 'CRIT-072-06' AS check_id, 'p_select_candidate_affidavit_disclosures' AS expected_policy
WHERE NOT EXISTS (
  SELECT 1 FROM pg_policy p
  WHERE p.polrelid='public.candidate_affidavit_disclosures'::regclass
    AND p.polname='p_select_candidate_affidavit_disclosures'
    AND p.polcmd='r'
);

-- 6. Single-row aggregate gate. PASS means the critical invariants above
-- should have returned zero rows; do not ignore any row returned by checks 1-5.
SELECT
  'W0215_POST_072_GATE' AS gate_id,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='candidate_affidavit_disclosures'
        AND column_name IN ('criminal_cases_count','serious_ipc_count','convictions_count','charges_framed_count','data_status')
        AND column_default IS NOT NULL
    ) THEN 'FAIL'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid='public.candidate_affidavit_disclosures'::regclass
        AND conname='chk_affidavit_official_requires_source'
    ) THEN 'FAIL'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid='public.candidate_affidavit_disclosures'::regclass
        AND conname='fk_affidavit_disclosures_constituency'
    ) THEN 'FAIL'
    WHEN EXISTS (
      SELECT 1 FROM public.candidate_affidavit_disclosures
      WHERE data_status='OFFICIAL'::public.data_status_enum
        AND (provenance_id IS NULL OR source_hash IS NULL OR source_hash !~* '^[0-9a-f]{64}$'
          OR (NULLIF(btrim(source_affidavit_url),'') IS NULL AND NULLIF(btrim(source_eci_affidavit_id),'') IS NULL))
    ) THEN 'FAIL'
    ELSE 'PASS'
  END AS result;
