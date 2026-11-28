-- The existing restrictive policy still checks that the parent is visible.
-- An authenticated viewer also needs a permissive SELECT policy to restore
-- their own selected reaction when reopening a public post or comment.
CREATE POLICY "Users read own published reactions"
  ON public.reactions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
