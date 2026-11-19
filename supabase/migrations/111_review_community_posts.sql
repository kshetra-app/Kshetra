-- Forward reconciliation of 092/093. Mobile retries use these existing contracts.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS client_token text,
  ADD COLUMN IF NOT EXISTS request_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_author_client_token ON public.posts(author_id, client_token);
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS client_token text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_author_client_token ON public.comments(author_id, client_token);

-- Existing public posts keep their visibility without manufacturing review decisions.
ALTER TABLE public.posts ADD COLUMN review_status text NOT NULL DEFAULT 'previously_published'
  CHECK (review_status IN ('previously_published','pending','approved','rejected'));
ALTER TABLE public.posts ALTER COLUMN review_status SET DEFAULT 'pending',
  ALTER COLUMN state_code DROP NOT NULL,
  ADD CONSTRAINT posts_national_scope CHECK (state_code IS NOT NULL OR constituency_id IS NULL);
CREATE INDEX posts_pending_review_idx ON public.posts(created_at,id)
  WHERE review_status='pending' AND NOT is_deleted;

-- All creator writes use the authenticated API. This includes poll text/media,
-- which must never be changeable after a reviewer has inspected a submission.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.posts,public.polls,public.poll_options,
  public.post_media,public.post_hashtags,public.hashtags FROM PUBLIC,anon,authenticated;

CREATE POLICY published_posts_only ON public.posts AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (review_status IN ('approved','previously_published') AND NOT is_deleted);

CREATE POLICY published_post_media ON public.post_media AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id=post_id));
CREATE POLICY published_post_polls ON public.polls AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id=post_id));
CREATE POLICY published_poll_options ON public.poll_options AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (EXISTS (SELECT 1 FROM public.polls p WHERE p.id=poll_id));
CREATE POLICY published_poll_votes ON public.poll_votes AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (EXISTS (SELECT 1 FROM public.polls p WHERE p.id=poll_id));
CREATE POLICY published_post_comments ON public.comments AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id=post_id));
CREATE POLICY published_post_reactions ON public.reactions AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id=post_id)
      OR EXISTS (SELECT 1 FROM public.comments c WHERE c.id=comment_id));
CREATE POLICY published_post_hashtags ON public.post_hashtags AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id=post_id));
CREATE POLICY published_hashtags ON public.hashtags AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (EXISTS (SELECT 1 FROM public.post_hashtags ph WHERE ph.hashtag_id=hashtags.id));
-- Preserve the legacy view's existing column order, including fts on Staging.
DO $$
DECLARE old_columns text;
BEGIN
  SELECT string_agg(format('p.%I',attname),', ' ORDER BY attnum) INTO old_columns
    FROM pg_attribute WHERE attrelid='public.state_feed'::regclass AND attnum>0 AND NOT attisdropped
      AND attname<>'feed_state';
  EXECUTE format('CREATE OR REPLACE VIEW public.state_feed WITH (security_invoker=true) AS
    SELECT %s, COALESCE(p.state_code,''IN'') AS feed_state FROM public.posts p
    WHERE NOT p.is_deleted AND p.review_status IN (''approved'',''previously_published'') ORDER BY p.created_at DESC',old_columns);
END
$$;

-- Keep the original RPC signatures, grants, and authoritative profile join.
-- The same publication filter applies even when called by a privileged backend.
CREATE OR REPLACE FUNCTION get_feed(
  p_state_code TEXT,
  p_constituency_id TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_cursor TIMESTAMPTZ DEFAULT now(),
  p_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  author_display_name TEXT,
  author_avatar_url TEXT,
  author_role TEXT,
  author_is_verified BOOLEAN,
  constituency_id TEXT,
  state_code TEXT,
  content TEXT,
  type TEXT,
  parent_id UUID,
  reply_count INTEGER,
  reaction_count INTEGER,
  is_pinned BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- Poll data (NULL if not a poll)
  poll_id UUID,
  poll_question TEXT,
  poll_total_votes INTEGER,
  poll_is_closed BOOLEAN,
  poll_options JSONB,
  -- Media
  media JSONB,
  -- Hashtags
  hashtags TEXT[],
  -- Current user's reaction (NULL if none)
  user_reaction TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.author_id,
    COALESCE(up.display_name, 'Anonymous') AS author_display_name,
    up.avatar_url AS author_avatar_url,
    COALESCE(up.role, 'citizen') AS author_role,
    EXISTS(SELECT 1 FROM user_verification uv WHERE uv.user_id = p.author_id AND uv.status = 'approved') AS author_is_verified,
    p.constituency_id,
    p.state_code,
    p.content,
    p.type,
    p.parent_id,
    p.reply_count,
    p.reaction_count,
    p.is_pinned,
    p.created_at,
    p.updated_at,
    pl.id AS poll_id,
    pl.question AS poll_question,
    pl.total_votes AS poll_total_votes,
    pl.is_closed AS poll_is_closed,
    (SELECT jsonb_agg(jsonb_build_object('id', po.id, 'label', po.label, 'vote_count', po.vote_count, 'sort_order', po.sort_order) ORDER BY po.sort_order)
     FROM poll_options po WHERE po.poll_id = pl.id) AS poll_options,
    (SELECT jsonb_agg(jsonb_build_object('id', pm.id, 'media_type', pm.media_type, 'url', pm.url, 'alt_text', pm.alt_text) ORDER BY pm.sort_order)
     FROM post_media pm WHERE pm.post_id = p.id) AS media,
    (SELECT array_agg(h.tag) FROM post_hashtags ph JOIN hashtags h ON h.id = ph.hashtag_id WHERE ph.post_id = p.id) AS hashtags,
    r.type AS user_reaction
  FROM posts p
  LEFT JOIN user_profiles up ON up.user_id = p.author_id
  LEFT JOIN polls pl ON pl.post_id = p.id
  LEFT JOIN reactions r ON r.post_id = p.id AND r.user_id = auth.uid()
  WHERE p.is_deleted = false AND p.review_status IN ('approved','previously_published')
    AND p.state_code IS NOT DISTINCT FROM NULLIF(p_state_code, 'IN')
    AND (p_constituency_id IS NULL OR p.constituency_id = p_constituency_id)
    AND (p_type IS NULL OR p.type = p_type)
    AND p.parent_id IS NULL  -- top-level only
    AND p.created_at < p_cursor
  ORDER BY p.is_pinned DESC, p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp;

CREATE OR REPLACE FUNCTION get_trending_hashtags(
  p_state_code TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  tag TEXT,
  post_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT h.tag, COUNT(ph.post_id) AS post_count
  FROM hashtags h
  JOIN post_hashtags ph ON ph.hashtag_id = h.id
  JOIN posts p ON p.id = ph.post_id
  WHERE p.is_deleted = false AND p.review_status IN ('approved','previously_published')
    AND p.created_at > now() - INTERVAL '7 days'
    AND (p_state_code IS NULL OR p.state_code IS NOT DISTINCT FROM NULLIF(p_state_code, 'IN'))
  GROUP BY h.tag
  ORDER BY post_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp;

-- Before applying any decision the expected version must still be pending.
-- Author changes always return to review; counters and moderator takedowns do not.
CREATE FUNCTION public.require_post_rereview() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT NEW.is_deleted AND (OLD.content, OLD.state_code, OLD.constituency_id, OLD.type, OLD.language, OLD.parent_id)
    IS DISTINCT FROM (NEW.content, NEW.state_code, NEW.constituency_id, NEW.type, NEW.language, NEW.parent_id) THEN
    NEW.review_status := 'pending';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER posts_content_changed BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.require_post_rereview();

CREATE FUNCTION public.review_creator_post(p_record_id uuid, p_reviewer_user_id uuid, p_decision text, p_expected_updated_at timestamptz)
RETURNS TABLE(id uuid,status text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  submission public.posts%ROWTYPE;
BEGIN
  IF p_decision IS NULL OR p_decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'Invalid review decision' USING ERRCODE='22023';
  END IF;
  SELECT * INTO submission FROM public.posts p
    WHERE p.id=p_record_id AND p.review_status='pending' AND NOT p.is_deleted
      AND p.updated_at=p_expected_updated_at FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission changed. Refresh the queue.' USING ERRCODE='P0002'; END IF;
  IF submission.author_id=p_reviewer_user_id THEN
    RAISE EXCEPTION 'A different person must review this submission' USING ERRCODE='42501';
  END IF;
  IF p_decision='approved' AND submission.type='poll' AND NOT EXISTS (
    SELECT 1 FROM public.polls p JOIN public.poll_options o ON o.poll_id=p.id
      WHERE p.post_id=submission.id GROUP BY p.id HAVING count(*) BETWEEN 2 AND 5
  ) THEN RAISE EXCEPTION 'Poll options are incomplete' USING ERRCODE='P0002'; END IF;

  UPDATE public.posts p SET review_status=p_decision WHERE p.id=p_record_id;
  INSERT INTO public.audit_log(actor_id,action,entity_type,entity_id,old_value,new_value)
    VALUES(p_reviewer_user_id,'post_publication_review','post',p_record_id::text,
      jsonb_build_object('status','pending','updated_at',submission.updated_at),
      jsonb_build_object('status',p_decision));
  RETURN QUERY SELECT p_record_id,p_decision;
END
$$;
REVOKE ALL ON FUNCTION public.review_creator_post(uuid,uuid,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_creator_post(uuid,uuid,text,timestamptz) TO service_role;

-- Service-role API writes bypass RLS. Check the visible parent even on that path.
CREATE FUNCTION public.require_published_post_for_interaction() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE target_id uuid;
BEGIN
  IF TG_TABLE_NAME='poll_votes' THEN
    SELECT p.post_id INTO target_id FROM public.polls p JOIN public.poll_options o ON o.poll_id=p.id
      WHERE p.id=NEW.poll_id AND o.id=NEW.option_id AND NOT p.is_closed;
  ELSIF TG_TABLE_NAME='posts' THEN
    target_id:=NEW.parent_id;
    IF target_id IS NULL THEN RETURN NEW; END IF;
  ELSIF TG_TABLE_NAME='reactions' THEN
    IF NEW.post_id IS NULL THEN
      SELECT c.post_id INTO target_id FROM public.comments c WHERE c.id=NEW.comment_id AND NOT c.is_deleted;
    ELSE target_id:=NEW.post_id; END IF;
  ELSE target_id:=NEW.post_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.posts p WHERE p.id=target_id AND NOT p.is_deleted
    AND p.review_status IN ('approved','previously_published')) THEN
    RAISE EXCEPTION 'Published target unavailable' USING ERRCODE='P0002';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER posts_reply_public_parent BEFORE INSERT ON public.posts FOR EACH ROW
  EXECUTE FUNCTION public.require_published_post_for_interaction();
CREATE TRIGGER comments_require_published_post BEFORE INSERT OR UPDATE OF post_id ON public.comments FOR EACH ROW
  EXECUTE FUNCTION public.require_published_post_for_interaction();
CREATE TRIGGER reactions_require_published_post BEFORE INSERT OR UPDATE ON public.reactions FOR EACH ROW
  EXECUTE FUNCTION public.require_published_post_for_interaction();
CREATE TRIGGER votes_require_published_poll BEFORE INSERT OR UPDATE ON public.poll_votes FOR EACH ROW
  EXECUTE FUNCTION public.require_published_post_for_interaction();

-- Keep the poll's question identical to the reviewed post text after an edit.
CREATE FUNCTION public.sync_edited_poll_question() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  UPDATE public.polls SET question=NEW.content WHERE post_id=NEW.id;
  RETURN NEW;
END
$$;
CREATE TRIGGER posts_poll_question AFTER UPDATE OF content ON public.posts FOR EACH ROW
  WHEN (NEW.type='poll' AND NOT NEW.is_deleted AND NEW.content IS DISTINCT FROM OLD.content)
  EXECUTE FUNCTION public.sync_edited_poll_question();
