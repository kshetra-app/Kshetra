INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('short-videos','short-videos',false,26214400,ARRAY['video/mp4']);

ALTER TABLE public.political_shorts
  ADD COLUMN media_metadata jsonb,
  ADD COLUMN rights_confirmed_at timestamptz,
  ADD COLUMN language text;

CREATE POLICY short_video_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='short-videos' AND split_part(name,'/',1)=auth.uid()::text
  AND name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.mp4$' AND public.can_upload_feed_media());
CREATE POLICY short_video_owner_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (bucket_id<>'short-videos' OR (split_part(name,'/',1)=auth.uid()::text
  AND name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.mp4$' AND public.can_upload_feed_media()));
CREATE POLICY short_video_guest_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO anon
WITH CHECK (bucket_id<>'short-videos');
CREATE POLICY short_video_immutable ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated
USING (bucket_id<>'short-videos') WITH CHECK (bucket_id<>'short-videos');
CREATE POLICY short_video_keep_reviewed ON storage.objects AS RESTRICTIVE FOR DELETE TO anon,authenticated
USING (bucket_id<>'short-videos');

-- Use the existing video_url field for the one approved storage object.
CREATE INDEX original_short_object ON public.political_shorts(video_url) WHERE status='approved';
CREATE POLICY short_video_read ON storage.objects FOR SELECT TO anon,authenticated
USING (bucket_id='short-videos' AND EXISTS (
  SELECT 1 FROM public.political_shorts s WHERE s.video_url=storage.objects.name AND s.status='approved'));
CREATE POLICY short_video_published ON storage.objects AS RESTRICTIVE FOR SELECT TO anon,authenticated
USING (bucket_id<>'short-videos' OR EXISTS (
  SELECT 1 FROM public.political_shorts s WHERE s.video_url=storage.objects.name AND s.status='approved'));

-- Keep version-checked review and require original, inspected media for approval.
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
    AND (p_decision = 'rejected' OR (
      s.video_url = s.uploaded_by::text || '/' || s.id::text || '.mp4'
      AND s.media_metadata IS NOT NULL
      AND s.rights_confirmed_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id='short-videos' AND o.name=s.video_url)
    ))
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
