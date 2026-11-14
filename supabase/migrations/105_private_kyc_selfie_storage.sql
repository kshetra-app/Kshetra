-- Private storage for the contributor KYC selfie upload flow.
-- Users can upload and read their own evidence only. Deletion and replacement
-- are intentionally unavailable to clients so a submitted review artifact
-- cannot be silently altered after submission.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-selfies',
  'kyc-selfies',
  FALSE,
  5242880,
  ARRAY['image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  bucket_is_public BOOLEAN;
BEGIN
  SELECT public INTO bucket_is_public
  FROM storage.buckets
  WHERE id = 'kyc-selfies';

  IF bucket_is_public IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION 'The kyc-selfies storage bucket must exist and be private';
  END IF;

  UPDATE storage.buckets
  SET file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png']::text[]
  WHERE id = 'kyc-selfies';

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'kyc_selfies_owner_read'
  ) THEN
    CREATE POLICY kyc_selfies_owner_read
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'kyc-selfies'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'kyc_selfies_owner_insert'
  ) THEN
    CREATE POLICY kyc_selfies_owner_insert
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'kyc-selfies'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'kshetra_105_kyc_selfies_select_boundary'
  ) THEN
    CREATE POLICY kshetra_105_kyc_selfies_select_boundary
      ON storage.objects AS RESTRICTIVE FOR SELECT TO PUBLIC
      USING (
        bucket_id <> 'kyc-selfies'
        OR (bucket_id = 'kyc-selfies' AND (storage.foldername(name))[1] = auth.uid()::text)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'kshetra_105_kyc_selfies_insert_boundary'
  ) THEN
    CREATE POLICY kshetra_105_kyc_selfies_insert_boundary
      ON storage.objects AS RESTRICTIVE FOR INSERT TO PUBLIC
      WITH CHECK (
        bucket_id <> 'kyc-selfies'
        OR (bucket_id = 'kyc-selfies' AND (storage.foldername(name))[1] = auth.uid()::text)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'kshetra_105_kyc_selfies_delete_boundary'
  ) THEN
    CREATE POLICY kshetra_105_kyc_selfies_delete_boundary
      ON storage.objects AS RESTRICTIVE FOR DELETE TO PUBLIC
      USING (
        bucket_id <> 'kyc-selfies'
        OR (
          bucket_id = 'kyc-selfies'
          AND (storage.foldername(name))[1] = auth.uid()::text
          AND NOT EXISTS (
            SELECT 1 FROM public.creator_kyc_records AS kyc
            WHERE kyc.user_id = auth.uid() AND kyc.selfie_url = name
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'kshetra_105_kyc_selfies_update_boundary'
  ) THEN
    CREATE POLICY kshetra_105_kyc_selfies_update_boundary
      ON storage.objects AS RESTRICTIVE FOR UPDATE TO PUBLIC
      USING (bucket_id <> 'kyc-selfies')
      WITH CHECK (bucket_id <> 'kyc-selfies');
  END IF;
END
$$;
