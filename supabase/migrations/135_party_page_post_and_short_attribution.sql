-- A published item refers to the existing Page. Its author/uploader remains
-- the authenticated human actor for accountability and editorial review.
ALTER TABLE public.posts ADD COLUMN publisher_page_id uuid REFERENCES public.pages(id);
ALTER TABLE public.political_shorts ADD COLUMN publisher_page_id uuid REFERENCES public.pages(id);
CREATE INDEX posts_party_page_timeline ON public.posts(publisher_page_id, created_at DESC, id DESC)
  WHERE publisher_page_id IS NOT NULL AND NOT is_deleted;
CREATE INDEX political_shorts_publisher_page ON public.political_shorts(publisher_page_id)
  WHERE publisher_page_id IS NOT NULL;

CREATE FUNCTION public.can_publish_for_party_page(p_page uuid, p_actor uuid)
RETURNS boolean LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE org_id text;
BEGIN
  SELECT id INTO org_id FROM public.political_organizations
    WHERE page_id = p_page AND org_type = 'political_party' FOR SHARE;
  RETURN FOUND AND EXISTS (
    SELECT FROM public.party_page_claims claim
    WHERE claim.organization_id = org_id AND claim.status = 'approved'
      AND EXISTS (
        SELECT FROM public.creator_kyc_records kyc WHERE kyc.user_id = p_actor AND kyc.status = 'verified'
      )
      AND (claim.claimant_id = p_actor OR EXISTS (
        SELECT FROM public.party_page_team team WHERE team.page_id = p_page AND team.user_id = p_actor
          AND team.role = 'publisher'
      ))
  );
END;
$$;

CREATE FUNCTION public.guard_party_publication()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid;
DECLARE review_state text;
DECLARE old_review_state text;
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.publisher_page_id IS DISTINCT FROM NEW.publisher_page_id) THEN
    RAISE EXCEPTION 'Publisher identity cannot be changed' USING ERRCODE = '42501';
  END IF;
  IF NEW.publisher_page_id IS NULL THEN RETURN NEW; END IF;

  IF TG_TABLE_NAME = 'posts' THEN
    actor := NEW.author_id;
    review_state := NEW.review_status;
    IF TG_OP = 'UPDATE' THEN old_review_state := OLD.review_status; END IF;
  ELSE
    actor := NEW.uploaded_by;
    review_state := NEW.status;
    IF TG_OP = 'UPDATE' THEN old_review_state := OLD.status; END IF;
  END IF;

  IF TG_OP = 'INSERT' AND (auth.uid() IS NOT NULL OR review_state IS DISTINCT FROM 'pending') THEN
    RAISE EXCEPTION 'Official Page content requires the server and the review queue' USING ERRCODE = '42501';
  END IF;
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'posts'
    AND (to_jsonb(NEW)->>'content') IS DISTINCT FROM (to_jsonb(OLD)->>'content'))
    OR (review_state IN ('approved','active','published','pending')
    AND review_state IS DISTINCT FROM old_review_state))
    AND NOT public.can_publish_for_party_page(NEW.publisher_page_id, actor) THEN
    RAISE EXCEPTION 'Active party Page publishing authority required' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log(actor_id,action,entity_type,entity_id,new_value)
    VALUES (actor,'party_page_content_submitted','post',NEW.id::text,
      jsonb_build_object('pageId',NEW.publisher_page_id,'contentType',TG_TABLE_NAME,'reviewStatus',review_state));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_party_post_publication BEFORE INSERT OR UPDATE OF publisher_page_id, review_status, content
  ON public.posts FOR EACH ROW EXECUTE FUNCTION public.guard_party_publication();
CREATE TRIGGER guard_party_short_publication BEFORE INSERT OR UPDATE OF publisher_page_id, status
  ON public.political_shorts FOR EACH ROW EXECUTE FUNCTION public.guard_party_publication();

REVOKE ALL ON FUNCTION public.can_publish_for_party_page(uuid,uuid), public.guard_party_publication()
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_publish_for_party_page(uuid,uuid) TO service_role;

CREATE FUNCTION public.is_verified_party_page(p_page uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT FROM public.political_organizations org
    JOIN public.party_page_claims claim ON claim.organization_id = org.id AND claim.status = 'approved'
    WHERE org.page_id = p_page AND org.org_type = 'political_party'
  );
$$;
REVOKE ALL ON FUNCTION public.is_verified_party_page(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_verified_party_page(uuid) TO anon, authenticated, service_role;

CREATE VIEW public.feed_posts_with_publisher WITH (security_invoker = true) AS
SELECT post.*, page.title AS publisher_title, page.avatar_url AS publisher_avatar_url,
  org.id AS publisher_party_id,
  CASE WHEN page.id IS NOT NULL THEN public.is_verified_party_page(page.id) ELSE false END AS publisher_verified,
  EXISTS (SELECT FROM public.page_followers follow
    WHERE follow.page_id = post.publisher_page_id AND follow.user_id = (SELECT auth.uid())) AS follows_publisher
FROM public.posts post
LEFT JOIN public.pages page ON page.id = post.publisher_page_id
LEFT JOIN public.political_organizations org ON org.page_id = page.id;
GRANT SELECT ON public.feed_posts_with_publisher TO anon, authenticated, service_role;
GRANT SELECT ON public.page_followers TO anon;
CREATE POLICY page_follower_no_anonymous_read ON public.page_followers AS RESTRICTIVE
  FOR SELECT TO anon USING (false);

CREATE OR REPLACE FUNCTION public.create_post_with_media(p_post jsonb,p_media jsonb)
RETURNS SETOF public.posts LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE saved public.posts%ROWTYPE; item jsonb; pos integer:=0; mime text;
BEGIN
 IF jsonb_typeof(p_media) IS DISTINCT FROM 'array' OR jsonb_array_length(p_media) NOT BETWEEN 1 AND 5 THEN
   RAISE EXCEPTION 'Attach between one and five items' USING ERRCODE='22023';
 END IF;
 INSERT INTO public.posts(author_id,content,type,state_code,constituency_id,parent_id,language,client_token,request_hash,review_status,publisher_page_id)
 VALUES ((p_post->>'author_id')::uuid,p_post->>'content',p_post->>'type',p_post->>'state_code',p_post->>'constituency_id',
 (p_post->>'parent_id')::uuid,p_post->>'language',p_post->>'client_token',p_post->>'request_hash','pending',(p_post->>'publisher_page_id')::uuid) RETURNING * INTO saved;
 FOR item IN SELECT value FROM jsonb_array_elements(p_media) LOOP
   IF item->>'mediaType' IN ('image','video') THEN
     SELECT metadata->>'mimetype' INTO mime FROM storage.objects
       WHERE bucket_id='post-media' AND name=item->>'url' AND split_part(name,'/',1)=saved.author_id::text;
     IF mime IS NULL OR split_part(mime,'/',1)<>item->>'mediaType' THEN
       RAISE EXCEPTION 'Attachment missing or type does not match' USING ERRCODE='22023';
     END IF;
   ELSIF item->>'mediaType' IS DISTINCT FROM 'link' OR (item->>'url') !~* '^https?://[^[:space:]]+$' THEN
     RAISE EXCEPTION 'Invalid attachment' USING ERRCODE='22023';
   END IF;
   INSERT INTO public.post_media(post_id,media_type,url,alt_text,sort_order)
   VALUES(saved.id,item->>'mediaType',item->>'url',item->>'altText',pos);
   pos:=pos+1;
 END LOOP;
 RETURN NEXT saved;
END $$;

CREATE FUNCTION public.is_party_page_team_member(p_page uuid,p_actor uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT FROM public.pages p WHERE p.id = p_page AND p.owner_id = p_actor)
    OR EXISTS (SELECT FROM public.party_page_team m WHERE m.page_id = p_page AND m.user_id = p_actor);
$$;
REVOKE ALL ON FUNCTION public.is_party_page_team_member(uuid,uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_party_page_team_member(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.review_creator_post(p_record_id uuid, p_reviewer_user_id uuid, p_decision text, p_expected_updated_at timestamptz)
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
  IF public.is_party_page_team_member(submission.publisher_page_id,p_reviewer_user_id) THEN
    RAISE EXCEPTION 'A reviewer cannot review their own Page submission' USING ERRCODE='42501';
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
  IF EXISTS (SELECT FROM public.political_shorts s WHERE s.id = p_record_id
    AND public.is_party_page_team_member(s.publisher_page_id,p_reviewer_user_id)) THEN
    RAISE EXCEPTION 'A reviewer cannot review their own Page submission' USING ERRCODE='42501';
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
