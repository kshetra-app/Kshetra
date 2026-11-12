-- Make queued comment retries safe across timeouts, reconnects, and app restarts.
-- NULL tokens remain valid for older app versions; PostgreSQL allows multiple NULLs
-- in this unique index while preventing the same user's token from creating two rows.
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS client_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_author_client_token
  ON public.comments (author_id, client_token);
