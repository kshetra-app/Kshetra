-- Durable, append-only reviewer decisions for creator KYC.
-- The decision and status transition run in one database transaction.

CREATE TABLE IF NOT EXISTS creator_kyc_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_record_id UUID NOT NULL REFERENCES creator_kyc_records(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('verified', 'rejected', 'resubmitted')),
  rejection_reason TEXT,
  previous_selfie_path TEXT,
  new_selfie_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (event_type IN ('verified', 'resubmitted') AND rejection_reason IS NULL)
    OR (event_type = 'rejected' AND char_length(COALESCE(trim(rejection_reason), '')) >= 10)
  )
);

CREATE INDEX IF NOT EXISTS idx_creator_kyc_events_record_time
  ON creator_kyc_events(kyc_record_id, created_at DESC);

ALTER TABLE creator_kyc_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON creator_kyc_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON creator_kyc_events TO service_role;

CREATE OR REPLACE FUNCTION review_creator_kyc_record(
  p_record_id UUID,
  p_reviewer_user_id UUID,
  p_decision TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS SETOF creator_kyc_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  reviewed_record creator_kyc_records%ROWTYPE;
  normalized_reason TEXT := NULLIF(trim(p_rejection_reason), '');
BEGIN
  IF p_decision NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'Unsupported contributor verification decision' USING ERRCODE = '22023';
  END IF;

  IF p_decision = 'rejected' AND char_length(COALESCE(normalized_reason, '')) < 10 THEN
    RAISE EXCEPTION 'A rejection reason of at least 10 characters is required' USING ERRCODE = '22023';
  END IF;

  UPDATE creator_kyc_records
  SET status = p_decision,
      verified_at = CASE WHEN p_decision = 'verified' THEN now() ELSE NULL END,
      rejection_reason = CASE WHEN p_decision = 'rejected' THEN normalized_reason ELSE NULL END,
      updated_at = now()
  WHERE id = p_record_id AND status = 'pending'
  RETURNING * INTO reviewed_record;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contributor verification record is missing or no longer pending'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO creator_kyc_events (
    kyc_record_id,
    actor_user_id,
    event_type,
    rejection_reason,
    new_selfie_path
  ) VALUES (
    reviewed_record.id,
    p_reviewer_user_id,
    p_decision,
    CASE WHEN p_decision = 'rejected' THEN normalized_reason ELSE NULL END,
    reviewed_record.selfie_url
  );

  RETURN NEXT reviewed_record;
END;
$$;

REVOKE ALL ON FUNCTION review_creator_kyc_record(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION review_creator_kyc_record(UUID, UUID, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION resubmit_creator_kyc_record(
  p_record_id UUID,
  p_user_id UUID,
  p_full_legal_name TEXT,
  p_phone_number TEXT,
  p_selfie_path TEXT
)
RETURNS SETOF creator_kyc_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  existing_record creator_kyc_records%ROWTYPE;
  updated_record creator_kyc_records%ROWTYPE;
BEGIN
  SELECT * INTO existing_record
  FROM creator_kyc_records
  WHERE id = p_record_id AND user_id = p_user_id AND status = 'rejected'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contributor verification record is missing or not eligible for resubmission'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE creator_kyc_records
  SET full_legal_name = p_full_legal_name,
      phone_number = p_phone_number,
      phone_verified = false,
      selfie_url = p_selfie_path,
      status = 'pending',
      verified_at = NULL,
      rejection_reason = NULL,
      terms_accepted_at = now(),
      terms_version = '1.0',
      updated_at = now()
  WHERE id = existing_record.id
  RETURNING * INTO updated_record;

  INSERT INTO creator_kyc_events (
    kyc_record_id,
    actor_user_id,
    event_type,
    previous_selfie_path,
    new_selfie_path
  ) VALUES (
    updated_record.id,
    p_user_id,
    'resubmitted',
    existing_record.selfie_url,
    updated_record.selfie_url
  );

  RETURN NEXT updated_record;
END;
$$;

REVOKE ALL ON FUNCTION resubmit_creator_kyc_record(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION resubmit_creator_kyc_record(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;
