BEGIN;

CREATE INDEX IF NOT EXISTS idx_issue_comments_page
  ON public.issue_comments(issue_id, created_at DESC, id DESC);

-- Personal follows use the existing "Own follows" policy. Public counts stay on election_promises.
DROP POLICY IF EXISTS "Public read promise_follows" ON public.promise_follows;

COMMIT;
