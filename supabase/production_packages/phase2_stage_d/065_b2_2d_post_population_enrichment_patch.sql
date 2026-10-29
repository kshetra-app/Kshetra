-- ==============================================================================
-- W021.5-B2.2-D Post-Population Enrichment Patch (PROPOSED - NOT EXECUTED)
-- Scope: Enrich 36 Candidacies Retained with Party=NULL with Authoritative Source Data
-- Mode: Explicit UPDATE on Exactly 36 Known Candidacy IDs
-- Target: Staging Supabase (fkpigozcqnmcvofuksar)
-- Directive Reference: W021.5-CTO-CHUNK08B-CONFLICT-REVIEW-001
-- Note: This file is a proposed post-population artifact; DO NOT EXECUTE without separate authorization.
-- ==============================================================================

BEGIN;

-- ─── PRE-CONDITION ASSERTION: Exactly 36 target records must exist with party_id IS NULL ───
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.candidacies
  WHERE id IN (
    '0215b22d-0002-0000-0000-000000000823'::uuid,
    '0215b22d-0002-0000-0000-000000002343'::uuid,
    '0215b22d-0002-0000-0000-000000002311'::uuid,
    '0215b22d-0002-0000-0000-000000002374'::uuid,
    '0215b22d-0002-0000-0000-000000002312'::uuid,
    '0215b22d-0002-0000-0000-000000002301'::uuid,
    '0215b22d-0002-0000-0000-000000002339'::uuid,
    '0215b22d-0002-0000-0000-000000002355'::uuid,
    '0215b22d-0002-0000-0000-000000002370'::uuid,
    '0215b22d-0002-0000-0000-000000002283'::uuid,
    '0215b22d-0002-0000-0000-000000002359'::uuid,
    '0215b22d-0002-0000-0000-000000002347'::uuid,
    '0215b22d-0002-0000-0000-000000002325'::uuid,
    '0215b22d-0002-0000-0000-000000002316'::uuid,
    '0215b22d-0002-0000-0000-000000002327'::uuid,
    '0215b22d-0002-0000-0000-000000002393'::uuid,
    '0215b22d-0002-0000-0000-000000002286'::uuid,
    '0215b22d-0002-0000-0000-000000002350'::uuid,
    '0215b22d-0002-0000-0000-000000002358'::uuid,
    '0215b22d-0002-0000-0000-000000003258'::uuid,
    '0215b22d-0002-0000-0000-000000003798'::uuid,
    '0215b22d-0002-0000-0000-000000003605'::uuid,
    '0215b22d-0002-0000-0000-000000003755'::uuid,
    '0215b22d-0002-0000-0000-000000003603'::uuid,
    '0215b22d-0002-0000-0000-000000003669'::uuid,
    '0215b22d-0002-0000-0000-000000003748'::uuid,
    '0215b22d-0002-0000-0000-000000003753'::uuid,
    '0215b22d-0002-0000-0000-000000003638'::uuid,
    '0215b22d-0002-0000-0000-000000003610'::uuid,
    '0215b22d-0002-0000-0000-000000003710'::uuid,
    '0215b22d-0002-0000-0000-000000003662'::uuid,
    '0215b22d-0002-0000-0000-000000003634'::uuid,
    '0215b22d-0002-0000-0000-000000003784'::uuid,
    '0215b22d-0002-0000-0000-000000003775'::uuid,
    '0215b22d-0002-0000-0000-000000003736'::uuid,
    '0215b22d-0002-0000-0000-000000004524'::uuid
  ) AND party_id IS NULL;

  IF v_count <> 36 THEN
    RAISE EXCEPTION 'PRECONDITION_FAILED: Expected exactly 36 unpopulated party records, found %', v_count;
  END IF;
END $$;

-- ─── ENRICHMENT UPDATES ────────────────────────────────────────────────────────
-- Item 1: T. G. Bharath (AP - AC-137)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-TDP',
    is_independent = false,
    votes_received = 91690,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000000823'::uuid
  AND party_id IS NULL;

-- Item 2: A. K. M. Ashraf (KL - AC-1)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-IUML',
    is_independent = false,
    votes_received = 65758,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000002343'::uuid
  AND party_id IS NULL;

-- Item 3: M. Vijin (KL - AC-7)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-CPIM',
    is_independent = false,
    votes_received = 88252,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000002311'::uuid
  AND party_id IS NULL;

-- Item 4: I. C. Balakrishnan (KL - AC-18)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-INC',
    is_independent = false,
    votes_received = 83002,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000002374'::uuid
  AND party_id IS NULL;

-- Item 5: T. Siddique (KL - AC-19)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-INC',
    is_independent = false,
    votes_received = 71859,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000002312'::uuid
  AND party_id IS NULL;

-- Item 6: P. K. Basheer (KL - AC-34)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-IUML',
    is_independent = false,
    votes_received = 78076,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000002301'::uuid
  AND party_id IS NULL;

-- Item 7: A. Prabhakaran (KL - AC-55)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-CPIM',
    is_independent = false,
    votes_received = 75934,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000002339'::uuid
  AND party_id IS NULL;

-- Item 8: K. Rajan (KL - AC-66)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-CPI',
    is_independent = false,
    votes_received = 76657,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000002355'::uuid
  AND party_id IS NULL;

-- Item 9: K. K. Ramachandran (KL - AC-71)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-CPIM',
    is_independent = false,
    votes_received = 73365,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000002370'::uuid
  AND party_id IS NULL;

-- Item 10: Roji M. John (KL - AC-75)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-INC',
    is_independent = false,
    votes_received = 71562,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000002283'::uuid
  AND party_id IS NULL;

-- Item 11: V. D. Satheesan (KL - AC-78)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-INC',
    is_independent = false,
    votes_received = 82264,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000002359'::uuid
  AND party_id IS NULL;

-- Item 12: M. S. Arun Kumar (KL - AC-109)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-CPIM',
    is_independent = false,
    votes_received = 71743,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000002347'::uuid
  AND party_id IS NULL;

-- Item 13: K. U. Jenish Kumar (KL - AC-114)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-CPIM',
    is_independent = false,
    votes_received = 62318,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000002325'::uuid
  AND party_id IS NULL;

-- Item 14: C. R. Mahesh (KL - AC-116)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-INC',
    is_independent = false,
    votes_received = 93932,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000002316'::uuid
  AND party_id IS NULL;

-- Item 15: K. N. Balagopal (KL - AC-119)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-CPIM',
    is_independent = false,
    votes_received = 68770,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000002327'::uuid
  AND party_id IS NULL;

-- Item 16: V. Joy (KL - AC-127)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-CPIM',
    is_independent = false,
    votes_received = 68816,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000002393'::uuid
  AND party_id IS NULL;

-- Item 17: O. S. Ambika (KL - AC-128)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-CPIM',
    is_independent = false,
    votes_received = 69898,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000002286'::uuid
  AND party_id IS NULL;

-- Item 18: G. R. Anil (KL - AC-130)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-CPI',
    is_independent = false,
    votes_received = 72742,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000002350'::uuid
  AND party_id IS NULL;

-- Item 19: C. K. Hareendran (KL - AC-137)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-CPIM',
    is_independent = false,
    votes_received = 78548,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000002358'::uuid
  AND party_id IS NULL;

-- Item 20: P Rajavelu (PY - AC-22)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-AINRC',
    is_independent = false,
    votes_received = 15978,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000003258'::uuid
  AND party_id IS NULL;

-- Item 21: VILWANATHAN.A.C (TN - AC-48)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-DMK',
    is_independent = false,
    votes_received = 90476,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000003798'::uuid
  AND party_id IS NULL;

-- Item 22: ANBALAGAN.K.P. (TN - AC-57)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-AIADMK',
    is_independent = false,
    votes_received = 110070,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000003605'::uuid
  AND party_id IS NULL;

-- Item 23: SAMPATHKUMAR.V (TN - AC-61)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-AIADMK',
    is_independent = false,
    votes_received = 99061,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000003755'::uuid
  AND party_id IS NULL;

-- Item 24: Ambethkumar S (TN - AC-69)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-DMK',
    is_independent = false,
    votes_received = 102064,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000003603'::uuid
  AND party_id IS NULL;

-- Item 25: KARUPPANAN.K.C (TN - AC-104)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-AIADMK',
    is_independent = false,
    votes_received = 100915,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000003669'::uuid
  AND party_id IS NULL;

-- Item 26: S.P. VELUMANI (TN - AC-119)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-AIADMK',
    is_independent = false,
    votes_received = 124225,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000003748'::uuid
  AND party_id IS NULL;

-- Item 27: SAKKARAPANI R (TN - AC-128)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-DMK',
    is_independent = false,
    votes_received = 109970,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000003753'::uuid
  AND party_id IS NULL;

-- Item 28: ELANGO. R (TN - AC-134)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-DMK',
    is_independent = false,
    votes_received = 93369,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000003638'::uuid
  AND party_id IS NULL;

-- Item 29: Arunmozhithevan. A (TN - AC-157)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-AIADMK',
    is_independent = false,
    votes_received = 96453,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000003610'::uuid
  AND party_id IS NULL;

-- Item 30: Nivedha M. Murugan (TN - AC-162)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-DMK',
    is_independent = false,
    votes_received = 96102,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000003710'::uuid
  AND party_id IS NULL;

-- Item 31: KAMARAJ R (TN - AC-169)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-AIADMK',
    is_independent = false,
    votes_received = 103637,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000003662'::uuid
  AND party_id IS NULL;

-- Item 32: DURAI.CHANDRASEKARAN (TN - AC-173)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-DMK',
    is_independent = false,
    votes_received = 103210,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000003634'::uuid
  AND party_id IS NULL;

-- Item 33: V . MUTHURAJA (TN - AC-180)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-DMK',
    is_independent = false,
    votes_received = 85802,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000003784'::uuid
  AND party_id IS NULL;

-- Item 34: THALAVAI SUNDARAM N. (TN - AC-229)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-AIADMK',
    is_independent = false,
    votes_received = 109745,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000003775'::uuid
  AND party_id IS NULL;

-- Item 35: RAJESH KUMAR S (TN - AC-234)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-INC',
    is_independent = false,
    votes_received = 101541,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000003736'::uuid
  AND party_id IS NULL;

-- Item 36: Md. Ghulam Rabbani (WB - AC-30)
UPDATE public.candidacies
SET party_id = 'ORG-PARTY-AITC',
    is_independent = false,
    votes_received = 105649,
    updated_at = now()
WHERE id = '0215b22d-0002-0000-0000-000000004524'::uuid
  AND party_id IS NULL;

-- ─── POST-CONDITION ASSERTION: Exactly 0 records among the 36 have party_id IS NULL ───
DO $$
DECLARE
  v_remaining INTEGER;
BEGIN
  SELECT count(*) INTO v_remaining
  FROM public.candidacies
  WHERE id IN (
    '0215b22d-0002-0000-0000-000000000823'::uuid,
    '0215b22d-0002-0000-0000-000000002343'::uuid,
    '0215b22d-0002-0000-0000-000000002311'::uuid,
    '0215b22d-0002-0000-0000-000000002374'::uuid,
    '0215b22d-0002-0000-0000-000000002312'::uuid,
    '0215b22d-0002-0000-0000-000000002301'::uuid,
    '0215b22d-0002-0000-0000-000000002339'::uuid,
    '0215b22d-0002-0000-0000-000000002355'::uuid,
    '0215b22d-0002-0000-0000-000000002370'::uuid,
    '0215b22d-0002-0000-0000-000000002283'::uuid,
    '0215b22d-0002-0000-0000-000000002359'::uuid,
    '0215b22d-0002-0000-0000-000000002347'::uuid,
    '0215b22d-0002-0000-0000-000000002325'::uuid,
    '0215b22d-0002-0000-0000-000000002316'::uuid,
    '0215b22d-0002-0000-0000-000000002327'::uuid,
    '0215b22d-0002-0000-0000-000000002393'::uuid,
    '0215b22d-0002-0000-0000-000000002286'::uuid,
    '0215b22d-0002-0000-0000-000000002350'::uuid,
    '0215b22d-0002-0000-0000-000000002358'::uuid,
    '0215b22d-0002-0000-0000-000000003258'::uuid,
    '0215b22d-0002-0000-0000-000000003798'::uuid,
    '0215b22d-0002-0000-0000-000000003605'::uuid,
    '0215b22d-0002-0000-0000-000000003755'::uuid,
    '0215b22d-0002-0000-0000-000000003603'::uuid,
    '0215b22d-0002-0000-0000-000000003669'::uuid,
    '0215b22d-0002-0000-0000-000000003748'::uuid,
    '0215b22d-0002-0000-0000-000000003753'::uuid,
    '0215b22d-0002-0000-0000-000000003638'::uuid,
    '0215b22d-0002-0000-0000-000000003610'::uuid,
    '0215b22d-0002-0000-0000-000000003710'::uuid,
    '0215b22d-0002-0000-0000-000000003662'::uuid,
    '0215b22d-0002-0000-0000-000000003634'::uuid,
    '0215b22d-0002-0000-0000-000000003784'::uuid,
    '0215b22d-0002-0000-0000-000000003775'::uuid,
    '0215b22d-0002-0000-0000-000000003736'::uuid,
    '0215b22d-0002-0000-0000-000000004524'::uuid
  ) AND party_id IS NULL;

  IF v_remaining <> 0 THEN
    RAISE EXCEPTION 'POSTCONDITION_FAILED: % records still have NULL party_id after enrichment', v_remaining;
  END IF;
END $$;

COMMIT;
