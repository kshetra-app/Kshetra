BEGIN;

LOCK TABLE public.reactions, public.comments IN SHARE ROW EXCLUSIVE MODE NOWAIT;

-- Extend the existing trigger so comment reactions are counted the same way as post reactions.
CREATE OR REPLACE FUNCTION public.update_post_reaction_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.post_id IS NOT NULL THEN
      UPDATE public.posts SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id;
    ELSE
      UPDATE public.comments SET reaction_count = reaction_count + 1 WHERE id = NEW.comment_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE public.posts SET reaction_count = greatest(reaction_count - 1, 0) WHERE id = OLD.post_id;
    ELSE
      UPDATE public.comments SET reaction_count = greatest(reaction_count - 1, 0) WHERE id = OLD.comment_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

WITH totals AS (
  SELECT c.id, count(r.id)::integer AS reactions
  FROM public.comments c LEFT JOIN public.reactions r ON r.comment_id = c.id
  GROUP BY c.id
)
UPDATE public.comments c SET reaction_count = totals.reactions
FROM totals WHERE c.id = totals.id AND c.reaction_count IS DISTINCT FROM totals.reactions;

COMMIT;
