-- Leadership Academy progress is counted from persisted completed module rows.
-- The quiz RPC keeps attempt, progress, and badge writes in one transaction.

CREATE OR REPLACE FUNCTION public.fn_sync_aspirant_module_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_user_id UUID;
BEGIN
  affected_user_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END;

  UPDATE public.aspirant_profiles
  SET modules_completed = (
    SELECT count(*)::INTEGER
    FROM public.module_progress
    WHERE user_id = affected_user_id AND completed = TRUE
  )
  WHERE user_id = affected_user_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_aspirant_module_count ON public.module_progress;
CREATE TRIGGER trg_sync_aspirant_module_count
AFTER INSERT OR UPDATE OF completed OR DELETE ON public.module_progress
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_aspirant_module_count();

UPDATE public.aspirant_profiles AS profiles
SET modules_completed = (
  SELECT count(*)::INTEGER
  FROM public.module_progress AS progress
  WHERE progress.user_id = profiles.user_id AND progress.completed = TRUE
);

CREATE OR REPLACE FUNCTION public.record_academy_quiz_result(
  p_user_id UUID,
  p_module_id UUID,
  p_score_percentage INTEGER,
  p_passed BOOLEAN,
  p_answers_summary JSONB,
  p_award_badge BOOLEAN
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_attempt_number INTEGER;
BEGIN
  IF p_score_percentage < 0 OR p_score_percentage > 100 THEN
    RAISE EXCEPTION 'INVALID_QUIZ_SCORE';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT || ':' || p_module_id::TEXT, 0));

  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO next_attempt_number
  FROM public.module_quiz_attempts
  WHERE user_id = p_user_id AND module_id = p_module_id;

  INSERT INTO public.module_quiz_attempts (
    user_id, module_id, score_percentage, passed, answers_summary, attempt_number
  ) VALUES (
    p_user_id, p_module_id, p_score_percentage, p_passed,
    COALESCE(p_answers_summary, '[]'::JSONB), next_attempt_number
  );

  INSERT INTO public.module_progress (user_id, module_id, quiz_score)
  VALUES (p_user_id, p_module_id, p_score_percentage)
  ON CONFLICT (user_id, module_id)
  DO UPDATE SET quiz_score = EXCLUDED.quiz_score;

  IF p_passed AND p_award_badge THEN
    INSERT INTO public.civic_badges (user_id, badge_type, earned_at)
    VALUES (p_user_id, 'election_scholar', NOW())
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  RETURN next_attempt_number;
END;
$$;

REVOKE ALL ON FUNCTION public.record_academy_quiz_result(UUID, UUID, INTEGER, BOOLEAN, JSONB, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_academy_quiz_result(UUID, UUID, INTEGER, BOOLEAN, JSONB, BOOLEAN) TO service_role;
