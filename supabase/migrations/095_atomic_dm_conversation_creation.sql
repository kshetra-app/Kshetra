-- Make conversation creation and its first message one durable operation.
-- A failed initial-message insert now rolls back the new conversation as well.

BEGIN;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS client_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_sender_client_token
  ON public.messages(sender_id, client_token)
  WHERE client_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_dm_conversation_with_initial_message(
  p_participant_one UUID,
  p_participant_two UUID,
  p_initiated_by UUID,
  p_status TEXT,
  p_initial_message TEXT DEFAULT NULL,
  p_client_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conversation public.conversations%ROWTYPE;
  v_message public.messages%ROWTYPE;
  v_created BOOLEAN := false;
  v_message_created BOOLEAN := false;
  v_notification_triggered BOOLEAN := false;
  v_recipient_id UUID;
  v_content TEXT := nullif(btrim(p_initial_message), '');
BEGIN
  IF p_participant_one IS NULL
     OR p_participant_two IS NULL
     OR p_participant_one = p_participant_two
     OR p_initiated_by IS NULL
     OR p_initiated_by NOT IN (p_participant_one, p_participant_two)
     OR p_status IS NULL
     OR p_status NOT IN ('pending', 'accepted') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_CONVERSATION');
  END IF;

  IF p_participant_one > p_participant_two THEN
    RETURN jsonb_build_object('success', false, 'code', 'PARTICIPANTS_NOT_CANONICAL');
  END IF;

  IF v_content IS NOT NULL AND length(v_content) > 2000 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INITIAL_MESSAGE_TOO_LONG');
  END IF;

  IF p_client_token IS NOT NULL AND (length(p_client_token) < 1 OR length(p_client_token) > 128) THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_CLIENT_TOKEN');
  END IF;

  IF v_content IS NULL THEN
    p_client_token := NULL;
  END IF;

  -- A client retry after a lost response must resolve to the original message.
  IF p_client_token IS NOT NULL THEN
    SELECT * INTO v_message
    FROM public.messages
    WHERE sender_id = p_initiated_by
      AND client_token = p_client_token;

    IF FOUND THEN
      SELECT * INTO v_conversation
      FROM public.conversations
      WHERE id = v_message.conversation_id;

      IF v_conversation.participant_one <> p_participant_one
         OR v_conversation.participant_two <> p_participant_two
         OR v_message.content <> v_content THEN
        RETURN jsonb_build_object('success', false, 'code', 'IDEMPOTENCY_KEY_REUSE');
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'created', false,
        'messageCreated', false,
        'notificationTriggered', false,
        'conversation', to_jsonb(v_conversation),
        'initialMessage', to_jsonb(v_message) - 'client_token'
      );
    END IF;
  END IF;

  INSERT INTO public.conversations (
    participant_one,
    participant_two,
    status,
    initiated_by,
    last_message_preview
  ) VALUES (
    p_participant_one,
    p_participant_two,
    p_status,
    p_initiated_by,
    CASE WHEN v_content IS NULL THEN NULL ELSE left(v_content, 100) END
  )
  ON CONFLICT (participant_one, participant_two) DO NOTHING
  RETURNING * INTO v_conversation;

  v_created := FOUND;

  IF NOT v_created THEN
    SELECT * INTO v_conversation
    FROM public.conversations
    WHERE participant_one = p_participant_one
      AND participant_two = p_participant_two;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'code', 'CONVERSATION_RECONCILIATION_FAILED');
    END IF;

    -- Two first-contact requests may race after both read an empty inbox. Preserve
    -- each distinct initial message while allowing a replay of the same token to
    -- return the original message without inserting a duplicate.
    IF v_content IS NOT NULL AND p_client_token IS NOT NULL THEN
      SELECT * INTO v_message
      FROM public.messages
      WHERE sender_id = p_initiated_by
        AND client_token = p_client_token;

      IF FOUND THEN
        IF v_message.conversation_id <> v_conversation.id OR v_message.content <> v_content THEN
          RETURN jsonb_build_object('success', false, 'code', 'IDEMPOTENCY_KEY_REUSE');
        END IF;
        RETURN jsonb_build_object(
          'success', true,
          'created', false,
          'messageCreated', false,
          'notificationTriggered', false,
          'conversation', to_jsonb(v_conversation),
          'initialMessage', to_jsonb(v_message) - 'client_token'
        );
      END IF;
    END IF;
  END IF;

  IF v_content IS NOT NULL THEN
    INSERT INTO public.messages (
      conversation_id,
      sender_id,
      content,
      client_token
    ) VALUES (
      v_conversation.id,
      p_initiated_by,
      v_content,
      p_client_token
    )
    RETURNING * INTO v_message;
    v_message_created := true;

    SELECT * INTO v_conversation
    FROM public.conversations
    WHERE id = v_conversation.id;

    v_recipient_id := CASE
      WHEN p_initiated_by = p_participant_one THEN p_participant_two
      ELSE p_participant_one
    END;

    -- Record the in-app notification in the same transaction as the message.
    -- Notification storage failures do not roll back a message the recipient can
    -- still retrieve from their inbox.
    IF v_conversation.status = 'accepted' THEN
      BEGIN
        INSERT INTO public.notification_log (user_id, trigger_type, title, body, data, read)
        VALUES (
          v_recipient_id,
          'system',
          'New Message',
          left(v_content, 100),
          jsonb_build_object(
            'conversationId', v_conversation.id,
            'messageId', v_message.id,
            'senderId', p_initiated_by
          ),
          false
        );
        v_notification_triggered := true;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Could not record DM notification (SQLSTATE %): %', SQLSTATE, SQLERRM;
      END;
    ELSIF v_conversation.status = 'pending' AND NOT v_conversation.first_notification_sent THEN
      BEGIN
        UPDATE public.conversations
        SET first_notification_sent = true
        WHERE id = v_conversation.id
          AND first_notification_sent = false
        RETURNING * INTO v_conversation;

        IF FOUND THEN
          INSERT INTO public.notification_log (user_id, trigger_type, title, body, data, read)
          VALUES (
            v_recipient_id,
            'system',
            'New Message Request',
            'You have received a new message request',
            jsonb_build_object(
              'conversationId', v_conversation.id,
              'messageId', v_message.id,
              'senderId', p_initiated_by
            ),
            false
          );
          v_notification_triggered := true;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Could not record DM request notification (SQLSTATE %): %', SQLSTATE, SQLERRM;
      END;
    END IF;

    SELECT * INTO v_conversation
    FROM public.conversations
    WHERE id = v_conversation.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'created', v_created,
    'messageCreated', v_message_created,
    'notificationTriggered', v_notification_triggered,
    'conversation', to_jsonb(v_conversation),
    'initialMessage', CASE WHEN v_message.id IS NULL THEN NULL ELSE to_jsonb(v_message) - 'client_token' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_dm_conversation_with_initial_message(UUID, UUID, UUID, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_dm_conversation_with_initial_message(UUID, UUID, UUID, TEXT, TEXT, TEXT)
  TO service_role;

COMMIT;
