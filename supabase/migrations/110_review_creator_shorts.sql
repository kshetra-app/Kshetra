-- Reuse political_shorts.status for publication, and audit_log for reviewer decisions.
-- Older community approvals count as reactions; only staff review can publish.
ALTER TABLE public.political_shorts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users upload shorts" ON public.political_shorts;
DROP POLICY IF EXISTS "Authors update own shorts" ON public.political_shorts;
DROP POLICY IF EXISTS "Public read approved shorts" ON public.political_shorts;
CREATE POLICY "Public read approved shorts" ON public.political_shorts
  FOR SELECT TO anon, authenticated USING (status = 'approved');
REVOKE ALL ON public.political_shorts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.political_shorts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.political_shorts TO service_role;

-- The existing interaction APIs check that the parent is published. Enforce the
-- same visibility on direct reads of interactions, including older comments.
ALTER POLICY "Public read short_comments" ON public.short_comments USING (
  EXISTS (SELECT 1 FROM public.political_shorts s WHERE s.id = short_id AND s.status = 'approved')
);
ALTER POLICY "Public read short_approvals" ON public.short_approvals USING (
  EXISTS (SELECT 1 FROM public.political_shorts s WHERE s.id = short_id AND s.status = 'approved')
);
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.short_approvals, public.short_flags, public.short_comments
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_short_approval_count() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.political_shorts SET approval_count = approval_count + 1
    WHERE id = NEW.short_id AND status = 'approved';
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.political_shorts SET approval_count = greatest(approval_count - 1, 0)
    WHERE id = OLD.short_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_creator_short(
  p_record_id uuid, p_reviewer_user_id uuid, p_decision text, p_expected_updated_at timestamptz
) RETURNS TABLE (id uuid, status text)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  decided public.political_shorts%ROWTYPE;
BEGIN
  IF p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid review decision' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.political_shorts s WHERE s.id = p_record_id AND s.uploaded_by = p_reviewer_user_id) THEN
    RAISE EXCEPTION 'The uploader cannot review their own submission' USING ERRCODE = '42501';
  END IF;
  UPDATE public.political_shorts AS s
  SET status = CASE WHEN p_decision = 'approved' THEN 'approved' ELSE 'removed' END,
      updated_at = now()
  WHERE s.id = p_record_id AND s.status = 'pending' AND s.updated_at = p_expected_updated_at
  RETURNING s.* INTO decided;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The submission changed or is no longer pending' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (p_reviewer_user_id, 'review_creator_short', 'moderation', decided.id::text,
          jsonb_build_object('status', 'pending'), jsonb_build_object('status', decided.status, 'decision', p_decision));
  RETURN QUERY SELECT decided.id, decided.status;
END;
$$;
REVOKE ALL ON FUNCTION public.review_creator_short(uuid, uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_creator_short(uuid, uuid, text, timestamptz) TO service_role;
