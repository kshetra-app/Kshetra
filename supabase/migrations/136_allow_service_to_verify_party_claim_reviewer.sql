-- Claim review must confirm the reviewer's server-managed Supabase role.
-- The API database role may execute this workflow but cannot read auth.users.
-- Keep access to that lookup inside the existing, service-only function.
ALTER FUNCTION public.review_party_page_claim(uuid, uuid, text, text) SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.review_party_page_claim(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_party_page_claim(uuid, uuid, text, text)
  TO service_role;
