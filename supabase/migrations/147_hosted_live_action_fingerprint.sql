-- Keep hosted Live creation and contributor accountability in one transaction.
BEGIN;

ALTER TABLE public.action_fingerprints
  DROP CONSTRAINT IF EXISTS action_fingerprints_action_type_check,
  ADD CONSTRAINT action_fingerprints_action_type_check CHECK (action_type IN (
    'create_post', 'edit_post', 'delete_post', 'create_comment', 'edit_comment',
    'vote_poll', 'report_issue', 'update_issue', 'add_evidence', 'tag_mla',
    'dispute_resolution', 'submit_promise_evidence', 'follow_issue', 'upvote_issue',
    'react_post', 'share_content', 'submit_report', 'create_challenge',
    'endorse_aspirant', 'other', 'go_live'
  ));

DROP POLICY IF EXISTS "Hosted Live fingerprints require server writes" ON public.action_fingerprints;
CREATE POLICY "Hosted Live fingerprints require server writes" ON public.action_fingerprints
  AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (action_type <> 'go_live');

CREATE OR REPLACE FUNCTION public.create_hosted_live_event(
  p_reporter_id uuid,
  p_event jsonb,
  p_device_context jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event public.live_events%ROWTYPE;
  v_kyc_id uuid;
BEGIN
  SELECT id INTO v_kyc_id
  FROM public.creator_kyc_records
  WHERE user_id = p_reporter_id AND status = 'verified'
  FOR SHARE;

  IF v_kyc_id IS NULL THEN
    RAISE EXCEPTION 'A verified contributor is required to open Live Studio'
      USING ERRCODE = '42501';
  END IF;

  v_event := jsonb_populate_record(NULL::public.live_events, p_event);
  INSERT INTO public.live_events (
    id, stream_id, reporter_id, reporter_name, accreditation_tier,
    state_code, district_name, constituency_ac_no, locality, issue_category, tags, language,
    media_playback_hls, visibility_mode, buffer_state, status,
    credibility_score, buffer_seconds, viewer_count, peak_viewers
  ) VALUES (
    v_event.id, v_event.stream_id, p_reporter_id::text, v_event.reporter_name,
    v_event.accreditation_tier, v_event.state_code, v_event.district_name,
    v_event.constituency_ac_no, v_event.locality, coalesce(v_event.issue_category, 'general'),
    coalesce(v_event.tags, '{}'), coalesce(v_event.language, 'en'),
    v_event.media_playback_hls, 'public', 'buffering', 'preparing', NULL, NULL, NULL, NULL
  ) RETURNING * INTO v_event;

  INSERT INTO public.action_fingerprints (
    user_id, kyc_id, action_type, content_type, content_id,
    device_brand, device_model, device_os, device_os_version, device_unique_id,
    app_version, app_build, screen_name
  ) VALUES (
    p_reporter_id, v_kyc_id, 'go_live', 'live_stream', v_event.id::text,
    nullif(left(p_device_context->>'brand', 80), ''),
    nullif(left(p_device_context->>'model', 160), ''),
    nullif(left(p_device_context->>'os', 24), ''),
    nullif(left(p_device_context->>'osVersion', 40), ''),
    nullif(left(p_device_context->>'installationId', 128), ''),
    nullif(left(p_device_context->>'appVersion', 40), ''),
    nullif(left(p_device_context->>'appBuild', 40), ''),
    'go_live'
  );

  RETURN to_jsonb(v_event);
END;
$$;

REVOKE ALL ON FUNCTION public.create_hosted_live_event(uuid, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_hosted_live_event(uuid, jsonb, jsonb)
  TO service_role;

COMMIT;
