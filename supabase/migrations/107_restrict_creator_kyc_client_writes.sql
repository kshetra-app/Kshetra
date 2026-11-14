-- Keep contributor verification decisions and mutations on the trusted API path.
-- The original owner UPDATE policy let a signed-in user set their own KYC status
-- directly through the Data API, bypassing the reviewer decision and audit RPCs.

-- Keep this as a single statement so it can be applied exactly by the Supabase
-- SQL runner without invoking the unproven historical migration chain.
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users update own KYC" ON public.creator_kyc_records;

  -- KYC submission, resubmission, and review are performed by the authenticated
  -- API using service_role. Mobile clients read status through the API. Remove
  -- client table writes and retain authenticated owner/admin reads.
  REVOKE ALL ON TABLE public.creator_kyc_records FROM PUBLIC, anon, authenticated;
  GRANT SELECT ON TABLE public.creator_kyc_records TO authenticated;
  GRANT ALL ON TABLE public.creator_kyc_records TO service_role;
END
$$;
