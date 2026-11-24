-- Extend the existing publication records. The controlled test stays unique per Page.
ALTER TABLE public.campaign_facebook_test_publications
  ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN client_request_id uuid,
  ADD COLUMN message text,
  ADD COLUMN media_path text,
  ADD COLUMN media_type text,
  ADD COLUMN publish_at timestamptz,
  ADD COLUMN claimed_at timestamptz,
  ADD COLUMN next_check_at timestamptz;

ALTER TABLE public.campaign_facebook_test_publications
  DROP CONSTRAINT campaign_facebook_test_publications_pkey,
  ADD PRIMARY KEY (id),
  DROP CONSTRAINT campaign_facebook_test_publications_status_check,
  ADD CONSTRAINT campaign_facebook_publication_status CHECK (
    status IN ('scheduled', 'sending', 'processing', 'published', 'rejected', 'verifying', 'cancelled')
  ),
  DROP CONSTRAINT campaign_facebook_receipt_consistent,
  ADD CONSTRAINT campaign_facebook_receipt_consistent CHECK (
    (status = 'published' AND provider_post_id IS NOT NULL AND published_at IS NOT NULL)
    OR (status = 'processing' AND provider_post_id IS NOT NULL AND published_at IS NULL AND permalink_url IS NULL)
    OR (status = 'verifying' AND published_at IS NULL AND permalink_url IS NULL)
    OR (status NOT IN ('published', 'processing', 'verifying')
      AND provider_post_id IS NULL AND published_at IS NULL AND permalink_url IS NULL)
  ),
  ADD CONSTRAINT campaign_facebook_publication_payload CHECK (
    (client_request_id IS NULL AND message IS NULL AND publish_at IS NULL
      AND media_path IS NULL AND media_type IS NULL AND claimed_at IS NULL AND next_check_at IS NULL
      AND status IN ('sending', 'published', 'rejected', 'verifying'))
    OR (client_request_id IS NOT NULL AND message IS NOT NULL AND char_length(message) <= 5000
      AND publish_at IS NOT NULL
      AND ((media_type IS NULL AND media_path IS NULL AND char_length(btrim(message)) > 0)
        OR (media_type IS NOT NULL AND media_type IN ('image', 'video') AND media_path IS NOT NULL))
      AND (status NOT IN ('sending', 'processing', 'published') OR claimed_at IS NOT NULL))
  );

CREATE UNIQUE INDEX campaign_facebook_controlled_test_per_page
  ON public.campaign_facebook_test_publications (page_id)
  WHERE client_request_id IS NULL;
CREATE UNIQUE INDEX campaign_facebook_publication_client_request
  ON public.campaign_facebook_test_publications (campaign_id, client_request_id)
  WHERE client_request_id IS NOT NULL;
CREATE INDEX campaign_facebook_publication_due
  ON public.campaign_facebook_test_publications (publish_at, id)
  WHERE status = 'scheduled';
CREATE INDEX campaign_facebook_publication_processing
  ON public.campaign_facebook_test_publications (next_check_at, id)
  WHERE status = 'processing';
