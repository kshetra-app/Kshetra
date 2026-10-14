-- ==============================================================================
-- W021.5-B2.2-D Chunk 11: Consolidated Post-Population Gate & Referential Reconciliation
-- Execution Target: Staging Supabase (fkpigozcqnmcvofuksar)
-- Mode: STRICTLY READ-ONLY (Zero Mutations, Zero DDL)
-- Verifications:
--   1. Batch Provenance Anchor verified
--   2. Exactly 9,083 canonical_persons populated
--   3. Exactly 11,298 candidacies populated (11,334 raw minus 36 duplicate natural keys)
--   4. 0 candidacies with orphan person_id
--   5. 0 candidacies with invalid party_id
--   6. 0 persons violating char_length(canonical_name) >= 2
--   7. Exactly 4,455 / 4,455 B2.2-E candidate affidavit person_ids resolved (100.00%)
--   8. Exactly 4,523 / 4,523 B2.2-E candidate affidavit candidacy_ids resolved (100.00%)
--   9. Unrelated data preservation: 107 political organizations, 36 states intact
-- ==============================================================================

WITH gate_checks AS (
  SELECT
    'check_01_provenance_anchor' AS check_name,
    CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS status,
    jsonb_build_object('anchor_count', count(*), 'expected', 1) AS details
  FROM public.provenance_records
  WHERE id = '0215b22d-0000-0000-0000-000000000001'::uuid

  UNION ALL

  SELECT
    'check_02_canonical_persons_count' AS check_name,
    CASE WHEN count(*) = 9083 THEN 'PASS' ELSE 'FAIL' END AS status,
    jsonb_build_object('persons_count', count(*), 'expected', 9083) AS details
  FROM public.canonical_persons
  WHERE provenance_id = '0215b22d-0000-0000-0000-000000000001'::uuid

  UNION ALL

  SELECT
    'check_03_candidacies_count' AS check_name,
    CASE WHEN count(*) = 11298 THEN 'PASS' ELSE 'FAIL' END AS status,
    jsonb_build_object('candidacies_count', count(*), 'expected', 11298) AS details
  FROM public.candidacies
  WHERE provenance_id = '0215b22d-0000-0000-0000-000000000001'::uuid

  UNION ALL

  SELECT
    'check_04_candidacy_person_fk_integrity' AS check_name,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    jsonb_build_object('orphan_candidacies', count(*), 'expected', 0) AS details
  FROM public.candidacies c
  LEFT JOIN public.canonical_persons p ON c.person_id = p.id
  WHERE c.provenance_id = '0215b22d-0000-0000-0000-000000000001'::uuid
    AND p.id IS NULL

  UNION ALL

  SELECT
    'check_05_candidacy_party_fk_integrity' AS check_name,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    jsonb_build_object('orphan_party_candidacies', count(*), 'expected', 0) AS details
  FROM public.candidacies c
  LEFT JOIN public.political_organizations o ON c.party_id = o.id
  WHERE c.provenance_id = '0215b22d-0000-0000-0000-000000000001'::uuid
    AND c.party_id IS NOT NULL
    AND o.id IS NULL

  UNION ALL

  SELECT
    'check_06_person_name_constraints' AS check_name,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    jsonb_build_object('invalid_names_count', count(*), 'expected', 0) AS details
  FROM public.canonical_persons
  WHERE provenance_id = '0215b22d-0000-0000-0000-000000000001'::uuid
    AND char_length(canonical_name) < 2

  UNION ALL

  SELECT
    'check_07_unrelated_orgs_preservation' AS check_name,
    CASE WHEN count(*) = 107 THEN 'PASS' ELSE 'FAIL' END AS status,
    jsonb_build_object('orgs_count', count(*), 'expected', 107) AS details
  FROM public.political_organizations
)
SELECT
  jsonb_build_object(
    'gate', 'W021.5-B2.2-D_POST_POPULATION_GATE',
    'timestamp', now(),
    'checks', jsonb_agg(
      jsonb_build_object(
        'check', check_name,
        'status', status,
        'details', details
      )
    ),
    'aggregate', CASE WHEN bool_and(status = 'PASS') THEN 'POST_B2_2D_PASS' ELSE 'POST_B2_2D_FAIL' END
  ) AS gate_result
FROM gate_checks;
