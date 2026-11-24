-- Keep the optional Facebook connection scoped to the existing campaign.
CREATE TABLE public.campaign_facebook_connections (
  campaign_id uuid PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
  oauth_state_hash text UNIQUE,
  oauth_actor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  oauth_expires_at timestamptz,
  oauth_claimed_at timestamptz,
  page_id text,
  page_name text,
  sealed_page_token text,
  connected_at timestamptz,
  CONSTRAINT campaign_facebook_state_consistent CHECK (
    (oauth_state_hash IS NULL AND oauth_actor_id IS NULL AND oauth_expires_at IS NULL AND oauth_claimed_at IS NULL)
    OR (oauth_state_hash IS NOT NULL AND oauth_actor_id IS NOT NULL AND oauth_expires_at IS NOT NULL)
  ),
  CONSTRAINT campaign_facebook_connection_consistent CHECK (
    (page_id IS NULL AND page_name IS NULL AND sealed_page_token IS NULL AND connected_at IS NULL)
    OR (page_id IS NOT NULL AND page_name IS NOT NULL AND sealed_page_token IS NOT NULL AND connected_at IS NOT NULL)
  )
);

-- One narrowly scoped Staging test post per Page. The provider receipt is
-- retained if the campaign connection is subsequently disconnected.
CREATE TABLE public.campaign_facebook_test_publications (
  page_id text PRIMARY KEY,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('sending', 'published', 'rejected', 'verifying')),
  provider_post_id text UNIQUE,
  permalink_url text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CONSTRAINT campaign_facebook_receipt_consistent CHECK (
    (status = 'published' AND provider_post_id IS NOT NULL AND published_at IS NOT NULL)
    OR (status <> 'published' AND provider_post_id IS NULL AND published_at IS NULL AND permalink_url IS NULL)
  )
);
CREATE INDEX campaign_facebook_test_publications_campaign
  ON public.campaign_facebook_test_publications (campaign_id);

ALTER TABLE public.campaign_facebook_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_facebook_test_publications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.campaign_facebook_connections, public.campaign_facebook_test_publications
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.campaign_facebook_connections, public.campaign_facebook_test_publications TO service_role;
