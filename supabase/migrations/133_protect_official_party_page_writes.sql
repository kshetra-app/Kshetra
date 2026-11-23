-- An official party Page may only be changed by a server-side workflow that
-- checks the party's verified organization authority. Keep public reads and
-- the existing permissions for other Page categories.
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY pages_party_insert_requires_server
  ON public.pages AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (role <> 'party');

CREATE POLICY pages_party_update_requires_server
  ON public.pages AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (role <> 'party')
  WITH CHECK (role <> 'party');

CREATE POLICY pages_party_delete_requires_server
  ON public.pages AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (role <> 'party');
