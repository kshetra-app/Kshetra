-- Keep submissions, engagement and their audit trail in the existing tables.
ALTER TABLE public.issue_status_history ADD COLUMN IF NOT EXISTS actor_role text;

-- 007 and 020 registered two triggers for the same counter functions.
DROP TRIGGER IF EXISTS issue_comment_count_trigger ON public.issue_comments;
DROP TRIGGER IF EXISTS issue_follow_count_trigger ON public.issue_follows;

UPDATE public.civic_issues AS issue
SET comment_count = actual.comments, follow_count = actual.follows
FROM (
  SELECT i.id,
    (SELECT count(*) FROM public.issue_comments c WHERE c.issue_id = i.id)::integer AS comments,
    (SELECT count(*) FROM public.issue_follows f WHERE f.issue_id = i.id)::integer AS follows
  FROM public.civic_issues i
) AS actual
WHERE issue.id = actual.id
  AND (issue.comment_count, issue.follow_count) IS DISTINCT FROM (actual.comments, actual.follows);

-- The API is the existing moderated write path. Public reads still use the same tables.
REVOKE INSERT, UPDATE, DELETE ON public.civic_issues, public.issue_status_history,
  public.issue_comments, public.issue_upvotes, public.issue_follows, public.issue_disputes
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.create_civic_issue_record(p_issue jsonb)
RETURNS uuid LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  issue_id uuid := COALESCE((p_issue->>'id')::uuid, gen_random_uuid());
  actor_id uuid := (p_issue->>'reporter_id')::uuid;
  attachments text[] := ARRAY(SELECT jsonb_array_elements_text(p_issue->'media_urls'));
  attachment text;
  saved_id uuid;
BEGIN
  IF cardinality(attachments) > 3 OR cardinality(attachments) <>
    (SELECT count(DISTINCT path) FROM unnest(attachments) AS path) THEN
    RAISE EXCEPTION 'Select up to three different attachments' USING ERRCODE = '22023';
  END IF;
  FOREACH attachment IN ARRAY attachments LOOP
    IF split_part(attachment, '/', 1) <> actor_id::text OR NOT EXISTS (
      SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'post-media' AND o.name = attachment
    ) THEN
      RAISE EXCEPTION 'An attachment is missing or belongs to another account' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  INSERT INTO public.civic_issues (
    id, reporter_id, reporter_name, constituency_id, state_code, title, description, category,
    severity, status, media_urls, evidence_count, latitude, longitude
  ) VALUES (
    issue_id, actor_id, p_issue->>'reporter_name', p_issue->>'constituency_id',
    p_issue->>'state_code', p_issue->>'title', p_issue->>'description', p_issue->>'category',
    p_issue->>'severity', 'open', attachments, cardinality(attachments),
    (p_issue->>'latitude')::double precision, (p_issue->>'longitude')::double precision
  )
  ON CONFLICT (id) DO NOTHING RETURNING id INTO saved_id;

  IF saved_id IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.civic_issues i
      WHERE i.id = issue_id AND i.reporter_id = actor_id AND i.title = p_issue->>'title'
        AND i.description = p_issue->>'description' AND i.state_code = p_issue->>'state_code'
        AND i.category = p_issue->>'category' AND i.severity = p_issue->>'severity'
        AND i.constituency_id IS NOT DISTINCT FROM (p_issue->>'constituency_id')
        AND i.media_urls IS NOT DISTINCT FROM attachments
        AND i.latitude IS NOT DISTINCT FROM (p_issue->>'latitude')::double precision
        AND i.longitude IS NOT DISTINCT FROM (p_issue->>'longitude')::double precision
    ) THEN
      RETURN issue_id;
    END IF;
    RAISE EXCEPTION 'Submission ID is already in use' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.issue_status_history
    (issue_id, from_status, to_status, changed_by, changed_by_name, actor_role, note)
  VALUES (saved_id, 'open', 'open', actor_id, p_issue->>'reporter_name', 'reporter', 'Issue reported');
  RETURN saved_id;
END;
$$;

CREATE FUNCTION public.record_civic_issue_status(
  p_issue_id uuid, p_expected_status text, p_status text,
  p_actor_id uuid, p_actor_name text, p_actor_role text, p_note text
)
RETURNS boolean LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF p_status = 'acknowledged' AND p_actor_role IS DISTINCT FROM 'authority' THEN
    RAISE EXCEPTION 'Acknowledgment requires a verified authority' USING ERRCODE = '42501';
  END IF;
  UPDATE public.civic_issues
  SET status = p_status,
      resolution_note = CASE WHEN p_status = 'resolved' THEN p_note END,
      resolved_at = CASE WHEN p_status = 'resolved' THEN now() END,
      resolved_by = CASE WHEN p_status = 'resolved' THEN p_actor_id END
  WHERE id = p_issue_id AND status = p_expected_status;
  IF NOT FOUND THEN RETURN false; END IF;

  INSERT INTO public.issue_status_history
    (issue_id, from_status, to_status, changed_by, changed_by_name, actor_role, note)
  VALUES (p_issue_id, p_expected_status, p_status, p_actor_id, p_actor_name, p_actor_role, p_note);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_civic_issue_record(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_civic_issue_status(uuid,text,text,uuid,text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_civic_issue_record(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_civic_issue_status(uuid,text,text,uuid,text,text,text)
  TO service_role;

-- One transaction owns reopening, its count and the audit record.
CREATE OR REPLACE FUNCTION public.update_issue_dispute_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE current_count integer;
BEGIN
  UPDATE public.civic_issues
  SET dispute_count = dispute_count + 1
  WHERE id = NEW.issue_id
  RETURNING dispute_count INTO current_count;
  IF current_count >= 5 THEN
    UPDATE public.civic_issues
    SET status = 'open', resolved_at = NULL, resolved_by = NULL, resolution_note = NULL
    WHERE id = NEW.issue_id AND status = 'resolved';
    IF FOUND THEN
      INSERT INTO public.issue_status_history
        (issue_id, from_status, to_status, changed_by_name, actor_role, note)
      VALUES (NEW.issue_id, 'resolved', 'open', 'Poligram', 'system', 'Reopened after community disputes');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
