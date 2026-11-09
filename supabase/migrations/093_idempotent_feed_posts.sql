-- Safe replay for queued post creation after timeouts and reconnect races.
-- Existing post rows keep NULL tokens and are unaffected.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS client_token TEXT,
  ADD COLUMN IF NOT EXISTS request_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_author_client_token
  ON public.posts (author_id, client_token);
