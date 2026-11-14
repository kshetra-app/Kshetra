-- KYC submissions now go through the authenticated API using service_role.
-- Remove the old client INSERT policy so the RLS definition matches the
-- table grants established in migration 107 and cannot be re-enabled by a
-- later privilege grant without an explicit policy review.
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users submit KYC" ON public.creator_kyc_records;
END
$$;
