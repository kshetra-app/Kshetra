-- 031: Direct Messages (Tickets 3.1 & 3.2)
-- Depends on: 001_initial_schema.sql, 006_trust_safety.sql (blocked_users)

-- ─── CONVERSATIONS TABLE ───
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_one UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_two UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  initiated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_preview TEXT,
  media_accepted_by_one BOOLEAN NOT NULL DEFAULT false,
  media_accepted_by_two BOOLEAN NOT NULL DEFAULT false,
  first_notification_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_participants UNIQUE (participant_one, participant_two),
  CONSTRAINT check_different_participants CHECK (participant_one != participant_two)
);

CREATE INDEX IF NOT EXISTS idx_conversations_participant_one ON conversations(participant_one);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_two ON conversations(participant_two);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);

-- ─── MESSAGES TABLE ───
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'audio', 'document')),
  is_media_locked BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ─── ROW LEVEL SECURITY ───
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations RLS: only participants can view, insert, or update
CREATE POLICY "Participants view conversations" ON conversations
  FOR SELECT
  USING (auth.uid() = participant_one OR auth.uid() = participant_two);

CREATE POLICY "Participants insert conversations" ON conversations
  FOR INSERT
  WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);

CREATE POLICY "Participants update conversations" ON conversations
  FOR UPDATE
  USING (auth.uid() = participant_one OR auth.uid() = participant_two)
  WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);

-- Messages RLS: only conversation participants can read & send messages
CREATE POLICY "Participants view messages" ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
    )
  );

CREATE POLICY "Participants send messages" ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
    )
  );

-- ─── BLOCKLIST ENFORCEMENT TRIGGER (Ticket 3.2) ───
CREATE OR REPLACE FUNCTION check_dm_blocklist_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_other_user UUID;
  v_is_blocked BOOLEAN;
BEGIN
  -- For conversations: determine the other participant
  IF TG_TABLE_NAME = 'conversations' THEN
    IF NEW.initiated_by = NEW.participant_one THEN
      v_other_user := NEW.participant_two;
    ELSE
      v_other_user := NEW.participant_one;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = v_other_user AND blocked_id = NEW.initiated_by)
         OR (blocker_id = NEW.initiated_by AND blocked_id = v_other_user)
    ) INTO v_is_blocked;

    IF v_is_blocked THEN
      RAISE EXCEPTION 'Cannot initiate direct messaging: user is blocked.';
    END IF;

  -- For messages: find conversation participants and verify recipient block status
  ELSIF TG_TABLE_NAME = 'messages' THEN
    SELECT (CASE WHEN participant_one = NEW.sender_id THEN participant_two ELSE participant_one END)
    INTO v_other_user
    FROM conversations
    WHERE id = NEW.conversation_id;

    IF v_other_user IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM blocked_users
        WHERE (blocker_id = v_other_user AND blocked_id = NEW.sender_id)
           OR (blocker_id = NEW.sender_id AND blocked_id = v_other_user)
      ) INTO v_is_blocked;

      IF v_is_blocked THEN
        RAISE EXCEPTION 'Cannot send message: user is blocked.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_conversation_blocklist ON conversations;
CREATE TRIGGER trg_check_conversation_blocklist
  BEFORE INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION check_dm_blocklist_trigger();

DROP TRIGGER IF EXISTS trg_check_message_blocklist ON messages;
CREATE TRIGGER trg_check_message_blocklist
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION check_dm_blocklist_trigger();

-- ─── AUTO-UPDATE CONVERSATION LAST MESSAGE TRIGGER ───
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      last_message_preview = LEFT(NEW.content, 120),
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_conversation_last_message ON messages;
CREATE TRIGGER trg_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();
