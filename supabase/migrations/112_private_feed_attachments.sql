-- Use post_media for attachment order, type and ownership via the parent post.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('post-media','post-media',false,26214400,
  ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm']);

CREATE FUNCTION public.can_upload_feed_media() RETURNS boolean LANGUAGE sql STABLE
SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS (SELECT 1 FROM public.creator_kyc_records WHERE user_id=auth.uid() AND status='verified')
$$;
REVOKE ALL ON FUNCTION public.can_upload_feed_media() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_upload_feed_media() TO authenticated;

CREATE POLICY feed_object_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='post-media' AND (storage.foldername(name))[1]=auth.uid()::text AND public.can_upload_feed_media());
CREATE POLICY feed_object_owner_path ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (bucket_id<>'post-media' OR ((storage.foldername(name))[1]=auth.uid()::text AND public.can_upload_feed_media()));
CREATE POLICY feed_object_no_guest_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO anon WITH CHECK (bucket_id<>'post-media');
CREATE POLICY feed_object_no_replace ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated
USING (bucket_id<>'post-media') WITH CHECK (bucket_id<>'post-media');
CREATE POLICY feed_object_no_remove ON storage.objects AS RESTRICTIVE FOR DELETE TO anon,authenticated USING (bucket_id<>'post-media');
-- post_media RLS already requires its parent to be published (migration 111).
CREATE POLICY feed_object_read ON storage.objects FOR SELECT TO anon,authenticated
USING (bucket_id='post-media' AND EXISTS (SELECT 1 FROM public.post_media m WHERE m.url=storage.objects.name AND m.media_type IN ('image','video')));
CREATE POLICY feed_object_visible_parent ON storage.objects AS RESTRICTIVE FOR SELECT TO anon,authenticated
USING (bucket_id<>'post-media' OR EXISTS (SELECT 1 FROM public.post_media m WHERE m.url=storage.objects.name AND m.media_type IN ('image','video')));
CREATE INDEX IF NOT EXISTS post_media_storage_path ON public.post_media(url) WHERE media_type IN ('image','video');

-- A reviewer must see either the complete submission or no submission.
CREATE FUNCTION public.create_post_with_media(p_post jsonb,p_media jsonb)
RETURNS SETOF public.posts LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE saved public.posts%ROWTYPE; item jsonb; pos integer:=0; mime text;
BEGIN
 IF jsonb_typeof(p_media) IS DISTINCT FROM 'array' OR jsonb_array_length(p_media) NOT BETWEEN 1 AND 5 THEN
   RAISE EXCEPTION 'Attach between one and five items' USING ERRCODE='22023';
 END IF;
 INSERT INTO public.posts(author_id,content,type,state_code,constituency_id,parent_id,language,client_token,request_hash,review_status)
 VALUES ((p_post->>'author_id')::uuid,p_post->>'content',p_post->>'type',p_post->>'state_code',p_post->>'constituency_id',
 (p_post->>'parent_id')::uuid,p_post->>'language',p_post->>'client_token',p_post->>'request_hash','pending') RETURNING * INTO saved;
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
REVOKE ALL ON FUNCTION public.create_post_with_media(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_post_with_media(jsonb,jsonb) TO service_role;
