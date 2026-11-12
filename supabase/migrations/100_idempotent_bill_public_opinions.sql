-- Store one current public opinion per authenticated account and bill.
-- Counts are derived from these rows so repeated requests cannot inflate totals.
BEGIN;

CREATE TABLE IF NOT EXISTS public.bill_opinions (
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  support BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (bill_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bill_opinions_user ON public.bill_opinions(user_id);
ALTER TABLE public.bill_opinions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.bill_opinions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.bill_opinions TO service_role;

CREATE OR REPLACE FUNCTION public.record_bill_opinion(
  p_bill_id UUID,
  p_user_id UUID,
  p_support BOOLEAN
)
RETURNS TABLE (bill_id UUID, support BIGINT, oppose BIGINT, neutral BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'An authenticated user is required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.bill_opinions (bill_id, user_id, support)
  VALUES (p_bill_id, p_user_id, p_support)
  ON CONFLICT ON CONSTRAINT bill_opinions_pkey DO UPDATE
    SET support = EXCLUDED.support,
        updated_at = NOW()
    WHERE public.bill_opinions.support IS DISTINCT FROM EXCLUDED.support;

  RETURN QUERY
  SELECT
    p_bill_id,
    COUNT(*) FILTER (WHERE opinion.support),
    COUNT(*) FILTER (WHERE NOT opinion.support),
    0::BIGINT
  FROM public.bill_opinions AS opinion
  WHERE opinion.bill_id = p_bill_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_bill_opinion_counts(p_bill_ids UUID[])
RETURNS TABLE (bill_id UUID, support BIGINT, oppose BIGINT, neutral BIGINT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    requested.bill_id,
    COUNT(opinion.user_id) FILTER (WHERE opinion.support),
    COUNT(opinion.user_id) FILTER (WHERE NOT opinion.support),
    0::BIGINT
  FROM UNNEST(COALESCE(p_bill_ids, '{}'::UUID[])) AS requested(bill_id)
  LEFT JOIN public.bill_opinions AS opinion ON opinion.bill_id = requested.bill_id
  GROUP BY requested.bill_id;
$$;

REVOKE ALL ON FUNCTION public.record_bill_opinion(UUID, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_bill_opinion(UUID, UUID, BOOLEAN) TO service_role;
REVOKE ALL ON FUNCTION public.get_bill_opinion_counts(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_bill_opinion_counts(UUID[]) TO service_role;

COMMIT;
