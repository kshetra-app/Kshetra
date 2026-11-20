BEGIN;

CREATE INDEX IF NOT EXISTS idx_feed_comments_page
  ON public.comments(post_id, created_at DESC, id DESC) WHERE NOT is_deleted;

-- Keep one vote per person and let the existing insert/delete triggers update totals.
CREATE FUNCTION public.set_feed_poll_choice(p_poll_id uuid, p_user_id uuid, p_option_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  target public.polls%ROWTYPE;
  previous_choice uuid;
  snapshot jsonb;
BEGIN
  SELECT poll.* INTO target
  FROM public.polls poll JOIN public.posts post ON post.id = poll.post_id
  WHERE poll.id = p_poll_id AND post.review_status IN ('approved', 'previously_published') AND NOT post.is_deleted
  FOR UPDATE OF poll;
  IF NOT FOUND THEN RAISE EXCEPTION 'Poll not found' USING ERRCODE = 'P0002'; END IF;
  IF target.is_closed OR target.expires_at <= now() THEN
    RAISE EXCEPTION 'Poll is closed' USING ERRCODE = '55000';
  END IF;
  IF p_option_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.poll_options WHERE id = p_option_id AND poll_id = p_poll_id
  ) THEN RAISE EXCEPTION 'Option does not belong to this poll' USING ERRCODE = '22023'; END IF;

  SELECT option_id INTO previous_choice FROM public.poll_votes
  WHERE poll_id = p_poll_id AND user_id = p_user_id;
  IF previous_choice IS DISTINCT FROM p_option_id THEN
    DELETE FROM public.poll_votes WHERE poll_id = p_poll_id AND user_id = p_user_id;
    IF p_option_id IS NOT NULL THEN
      INSERT INTO public.poll_votes(poll_id, user_id, option_id)
      VALUES (p_poll_id, p_user_id, p_option_id);
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'totalVotes', p.total_votes,
    'options', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'voteCount', vote_count)
        ORDER BY sort_order, id), '[]'::jsonb)
      FROM public.poll_options o WHERE o.poll_id = p.id
    )
  ) INTO snapshot FROM public.polls p WHERE p.id = p_poll_id;
  RETURN snapshot;
END;
$$;

REVOKE ALL ON FUNCTION public.set_feed_poll_choice(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_feed_poll_choice(uuid, uuid, uuid) TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.poll_votes FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'polls'
    ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.polls; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'poll_options'
    ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options; END IF;
  END IF;
END;
$$;

COMMIT;
