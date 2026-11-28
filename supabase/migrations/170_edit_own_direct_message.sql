BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;

CREATE OR REPLACE FUNCTION public.edit_own_direct_message(
  p_conversation_id uuid,
  p_message_id uuid,
  p_actor_id uuid,
  p_content text,
  p_previous_edit timestamptz
) RETURNS public.messages
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conversation public.conversations%ROWTYPE;
  v_message public.messages%ROWTYPE;
  v_latest_id uuid;
BEGIN
  IF p_actor_id IS NULL OR p_content IS NULL OR char_length(btrim(p_content)) NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'Invalid message edit' USING ERRCODE = '22023';
  END IF;

  -- Sends also lock the conversation before writing. Keep the inbox preview in the same transaction.
  SELECT * INTO v_conversation FROM public.conversations
  WHERE id = p_conversation_id AND p_actor_id IN (participant_one, participant_two)
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_conversation.status <> 'accepted' OR EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = v_conversation.participant_one AND blocked_id = v_conversation.participant_two)
       OR (blocker_id = v_conversation.participant_two AND blocked_id = v_conversation.participant_one)
  ) THEN
    RAISE EXCEPTION 'Conversation is unavailable' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_message FROM public.messages
  WHERE id = p_message_id AND conversation_id = p_conversation_id
    AND sender_id = p_actor_id AND media_url IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_message.content = p_content THEN
    RETURN v_message;
  END IF;
  IF clock_timestamp() >= v_message.created_at + interval '15 minutes'
     OR v_message.edited_at IS DISTINCT FROM p_previous_edit THEN
    RAISE EXCEPTION 'Edit expired or message has changed' USING ERRCODE = 'P4113';
  END IF;

  UPDATE public.messages SET content = p_content, edited_at = clock_timestamp()
  WHERE id = v_message.id RETURNING * INTO v_message;

  SELECT id INTO v_latest_id FROM public.messages WHERE conversation_id = p_conversation_id
  ORDER BY created_at DESC, id DESC LIMIT 1;
  IF v_latest_id = v_message.id THEN
    UPDATE public.conversations SET last_message_preview = left(p_content, 120), updated_at = clock_timestamp()
    WHERE id = p_conversation_id;
  END IF;
  RETURN v_message;
END;
$$;

REVOKE ALL ON FUNCTION public.edit_own_direct_message(uuid, uuid, uuid, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edit_own_direct_message(uuid, uuid, uuid, text, timestamptz)
  TO service_role;

COMMIT;
