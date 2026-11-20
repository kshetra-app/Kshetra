BEGIN;

-- Block concurrent vote writes while rebuilding counts from the existing votes.
LOCK TABLE public.polls, public.poll_votes, public.poll_options IN EXCLUSIVE MODE NOWAIT;

WITH totals AS (
  SELECT p.id, count(v.id)::integer AS votes
  FROM public.polls p LEFT JOIN public.poll_votes v ON v.poll_id = p.id
  GROUP BY p.id
)
UPDATE public.polls p SET total_votes = totals.votes
FROM totals WHERE p.id = totals.id AND p.total_votes IS DISTINCT FROM totals.votes;

WITH totals AS (
  SELECT o.id, count(v.id)::integer AS votes
  FROM public.poll_options o LEFT JOIN public.poll_votes v ON v.option_id = o.id
  GROUP BY o.id
)
UPDATE public.poll_options o SET vote_count = totals.votes
FROM totals WHERE o.id = totals.id AND o.vote_count IS DISTINCT FROM totals.votes;

COMMIT;
