-- Reconcile the aspirant registration columns used by the existing API (010 and 076).
-- Preserve existing listings. New registrations are private unless their owner opts in.
ALTER TABLE public.aspirant_profiles
  ADD COLUMN IF NOT EXISTS verification_tier text NOT NULL DEFAULT 'tier1'
    CHECK (verification_tier IN ('tier1', 'tier2')),
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS manifesto_url text,
  ADD COLUMN IF NOT EXISTS vision_summary text,
  ADD COLUMN IF NOT EXISTS has_criminal_cases boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS criminal_cases_details text,
  ADD COLUMN IF NOT EXISTS handle text UNIQUE,
  ALTER COLUMN is_public SET DEFAULT false;

-- Registration, visibility and verification writes are owned by the authenticated API.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.aspirant_profiles FROM PUBLIC, anon, authenticated;

-- 020 documents the public avatar bucket. Profiles continue to point to one avatar_url.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY personal_page_avatar_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND cardinality(storage.foldername(name)) = 1
  );

CREATE POLICY personal_page_avatar_own_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE POLICY personal_page_avatar_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
