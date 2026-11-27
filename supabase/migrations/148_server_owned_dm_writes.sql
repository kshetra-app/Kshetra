-- Message reads remain under participant RLS. All writes go through the DM API.
BEGIN;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.conversations, public.messages
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_dm_request_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conversation public.conversations%ROWTYPE;
BEGIN
  SELECT * INTO v_conversation
  FROM public.conversations
  WHERE id = NEW.conversation_id
  FOR UPDATE;

  IF NOT FOUND OR NEW.sender_id NOT IN (v_conversation.participant_one, v_conversation.participant_two) THEN
    RAISE EXCEPTION 'The sender is not a conversation participant' USING ERRCODE = '42501';
  END IF;

  IF v_conversation.status = 'declined' THEN
    RAISE EXCEPTION 'This conversation is unavailable' USING ERRCODE = 'P4112';
  END IF;

  IF v_conversation.status = 'pending' AND (
    NEW.sender_id <> v_conversation.initiated_by
    OR NEW.media_url IS NOT NULL
    OR char_length(NEW.content) > 2000
    OR EXISTS (SELECT 1 FROM public.messages WHERE conversation_id = v_conversation.id)
  ) THEN
    RAISE EXCEPTION 'A message request allows one text message until it is accepted' USING ERRCODE = 'P4111';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_dm_request_on_message ON public.messages;
CREATE TRIGGER enforce_dm_request_on_message
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_dm_request_on_message();

COMMIT;
