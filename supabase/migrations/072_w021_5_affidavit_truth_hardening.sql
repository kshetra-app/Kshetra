-- =============================================================================
-- Migration 072: W021.5 Affidavit Data-Truth Hardening
-- Forward-only correction to Migration 068.
-- CTO adjudication: W021.5-CTO-ADJ-001 (schema design approved with conditions).
--
-- Purpose:
-- 1. Stop defaulting absent criminal-disclosure counts to zero.
-- 2. Stop defaulting unproven affidavit records to OFFICIAL.
-- 3. Preserve source-less zero counts as NULL (unknown), not a factual zero.
-- 4. Require source identity, SHA-256, and provenance for OFFICIAL status.
--
-- IMPORTANT:
-- Run ONLY against the Kshetra STAGING project after confirming the project ref
-- in the Supabase dashboard. Never run against production.
-- This migration does not fabricate source records or populate new affidavits.
-- =============================================================================

BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.candidate_affidavit_disclosures') IS NULL THEN
    RAISE EXCEPTION 'W0215_072_PREFLIGHT_FAILED: public.candidate_affidavit_disclosures is absent; apply/reconcile migration 068 first';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'data_status_enum'
  ) THEN
    RAISE EXCEPTION 'W0215_072_PREFLIGHT_FAILED: public.data_status_enum is absent';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='candidate_affidavit_disclosures'
      AND column_name='provenance_id'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='candidate_affidavit_disclosures'
      AND column_name='source_hash'
  ) THEN
    RAISE EXCEPTION 'W0215_072_PREFLIGHT_FAILED: required provenance columns are absent';
  END IF;
END
$preflight$;

-- A. Missing criminal-disclosure counts remain unknown. Preserve explicit
-- nonzero values; only source-less zero values plausibly introduced by the
-- legacy DEFAULT 0 are normalized to NULL.
UPDATE public.candidate_affidavit_disclosures
SET
  criminal_cases_count = CASE
    WHEN criminal_cases_count = 0 THEN NULL ELSE criminal_cases_count END,
  serious_ipc_count = CASE
    WHEN serious_ipc_count = 0 THEN NULL ELSE serious_ipc_count END,
  convictions_count = CASE
    WHEN convictions_count = 0 THEN NULL ELSE convictions_count END,
  charges_framed_count = CASE
    WHEN charges_framed_count = 0 THEN NULL ELSE charges_framed_count END
WHERE provenance_id IS NULL
  AND NULLIF(btrim(source_affidavit_url), '') IS NULL
  AND NULLIF(btrim(source_eci_affidavit_id), '') IS NULL
  AND NULLIF(btrim(source_hash), '') IS NULL
  AND (
    criminal_cases_count = 0 OR serious_ipc_count = 0
    OR convictions_count = 0 OR charges_framed_count = 0
  );

-- B. Without complete row-level source evidence, OFFICIAL is not defensible.
-- Demote status rather than deleting or inventing any source values.
UPDATE public.candidate_affidavit_disclosures
SET data_status = 'UNKNOWN'::public.data_status_enum
WHERE data_status = 'OFFICIAL'::public.data_status_enum
  AND (
    provenance_id IS NULL
    OR source_hash IS NULL
    OR source_hash !~* '^[0-9a-f]{64}$'
    OR (
      NULLIF(btrim(source_affidavit_url), '') IS NULL
      AND NULLIF(btrim(source_eci_affidavit_id), '') IS NULL
    )
  );

-- C. Prevent future synthetic zero and OFFICIAL defaults.
ALTER TABLE public.candidate_affidavit_disclosures
  ALTER COLUMN criminal_cases_count DROP DEFAULT,
  ALTER COLUMN criminal_cases_count DROP NOT NULL,
  ALTER COLUMN serious_ipc_count DROP DEFAULT,
  ALTER COLUMN serious_ipc_count DROP NOT NULL,
  ALTER COLUMN convictions_count DROP DEFAULT,
  ALTER COLUMN convictions_count DROP NOT NULL,
  ALTER COLUMN charges_framed_count DROP DEFAULT,
  ALTER COLUMN charges_framed_count DROP NOT NULL,
  ALTER COLUMN data_status DROP DEFAULT;

-- D. Enforce source-backed OFFICIAL classification for future and existing rows.
ALTER TABLE public.candidate_affidavit_disclosures
  DROP CONSTRAINT IF EXISTS chk_affidavit_official_requires_source;

ALTER TABLE public.candidate_affidavit_disclosures
  ADD CONSTRAINT chk_affidavit_official_requires_source
  CHECK (
    data_status <> 'OFFICIAL'::public.data_status_enum
    OR (
      provenance_id IS NOT NULL
      AND source_hash IS NOT NULL
      AND source_hash ~* '^[0-9a-f]{64}$'
      AND (
        NULLIF(btrim(source_affidavit_url), '') IS NOT NULL
        OR NULLIF(btrim(source_eci_affidavit_id), '') IS NOT NULL
      )
    )
  );

COMMENT ON COLUMN public.candidate_affidavit_disclosures.criminal_cases_count IS
  'Nullable: NULL means undisclosed/unknown; zero is valid only when explicitly evidenced by the source affidavit.';
COMMENT ON COLUMN public.candidate_affidavit_disclosures.data_status IS
  'No default. OFFICIAL requires source identifier, 64-hex SHA-256, and provenance record. Missing evidence must remain UNKNOWN/UNVERIFIED.';

COMMIT;

-- Postflight assertions: query must return exactly 0 rows.
SELECT 'FAIL: criminal count column still has a default or NOT NULL' AS error
WHERE EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema='public'
    AND table_name='candidate_affidavit_disclosures'
    AND column_name IN ('criminal_cases_count','serious_ipc_count','convictions_count','charges_framed_count')
    AND (column_default IS NOT NULL OR is_nullable <> 'YES')
);

SELECT 'FAIL: data_status still has an OFFICIAL default' AS error
WHERE EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema='public'
    AND table_name='candidate_affidavit_disclosures'
    AND column_name='data_status'
    AND column_default IS NOT NULL
);

SELECT 'FAIL: OFFICIAL rows violate source-evidence constraint' AS error
WHERE EXISTS (
  SELECT 1 FROM public.candidate_affidavit_disclosures
  WHERE data_status = 'OFFICIAL'::public.data_status_enum
    AND (
      provenance_id IS NULL
      OR source_hash IS NULL
      OR source_hash !~* '^[0-9a-f]{64}$'
      OR (
        NULLIF(btrim(source_affidavit_url), '') IS NULL
        AND NULLIF(btrim(source_eci_affidavit_id), '') IS NULL
      )
    )
);
