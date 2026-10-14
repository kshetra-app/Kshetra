-- ==============================================================================
-- W021.5-B2.2-D Chunk 06B Sequence Gap Analysis Checkpoint
-- Scope: Candidacies Sequence 0001 to 2300 Gap & Completeness Check
-- Target: Staging Supabase (fkpigozcqnmcvofuksar)
-- Mode: STRICTLY READ-ONLY (Zero Mutations, Zero DDL)
-- Authority: Master Execution Framework Amendment v1.2 / Rule IV-001 Non-Self-Acceptance
-- Directive: W021.5-CTO-NEXT-010
-- ==============================================================================

WITH expected_sequence AS (
  SELECT 
    ('0215b22d-0002-0000-0000-' || lpad(g::text, 12, '0'))::uuid AS expected_id,
    g AS expected_seq
  FROM generate_series(1, 2300) AS g
),
actual_candidacies AS (
  SELECT id FROM public.candidacies
),
missing_ids AS (
  SELECT e.expected_id, e.expected_seq
  FROM expected_sequence e
  LEFT JOIN actual_candidacies a ON e.expected_id = a.id
  WHERE a.id IS NULL
),
unexpected_ids AS (
  SELECT a.id
  FROM actual_candidacies a
  LEFT JOIN expected_sequence e ON a.id = e.expected_id
  WHERE e.expected_id IS NULL
)
SELECT jsonb_build_object(
  'timestamp', now(),
  'check_name', 'W021.5_06B_CANDIDACY_SEQUENCE_GAP_ANALYSIS',
  'expected_range_start', '0215b22d-0002-0000-0000-000000000001',
  'expected_range_end', '0215b22d-0002-0000-0000-000000002300',
  'expected_count', 2300,
  'actual_total_candidacies', (SELECT count(*) FROM actual_candidacies),
  'missing_count', (SELECT count(*) FROM missing_ids),
  'missing_sample', (SELECT COALESCE(jsonb_agg(expected_id), '[]'::jsonb) FROM (SELECT expected_id FROM missing_ids LIMIT 5) m),
  'unexpected_count', (SELECT count(*) FROM unexpected_ids),
  'unexpected_sample', (SELECT COALESCE(jsonb_agg(id), '[]'::jsonb) FROM (SELECT id FROM unexpected_ids LIMIT 5) u),
  'status', CASE 
    WHEN (SELECT count(*) FROM missing_ids) = 0 
     AND (SELECT count(*) FROM unexpected_ids) = 0 
     AND (SELECT count(*) FROM actual_candidacies) = 2300 
    THEN 'PASS' 
    ELSE 'FAIL' 
  END
) AS sequence_gap_result;
