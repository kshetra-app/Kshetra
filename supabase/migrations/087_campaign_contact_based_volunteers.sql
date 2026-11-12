-- Allow campaign owners to register a contact before that person has a Poligram account.
-- Registered members still bind to auth.users through user_id; unregistered contacts
-- remain campaign-only records and do not receive account access.

ALTER TABLE campaign_volunteers
  ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN campaign_volunteers.user_id IS
  'Linked Poligram account when the volunteer has registered; NULL for a campaign contact who has not registered.';

CREATE INDEX IF NOT EXISTS idx_campaign_volunteers_campaign_phone
  ON campaign_volunteers (campaign_id, phone);
