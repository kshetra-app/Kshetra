-- A verified campaign publishing purchase has its own receipt and does not credit the campaign wallet.
CREATE TABLE public.campaign_publishing_orders (
  provider_order_id text PRIMARY KEY CHECK (provider_order_id ~ '^order_[A-Za-z0-9]+$'),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount_paise integer NOT NULL CHECK (amount_paise >= 100),
  access_days integer NOT NULL CHECK (access_days BETWEEN 1 AND 366),
  checkout_hash text NOT NULL UNIQUE CHECK (checkout_hash ~ '^[0-9a-f]{64}$'),
  checkout_expires_at timestamptz NOT NULL,
  provider_payment_id text UNIQUE CHECK (provider_payment_id ~ '^pay_[A-Za-z0-9]+$'),
  captured_at timestamptz,
  access_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_publishing_capture_consistent CHECK (
    (provider_payment_id IS NULL AND captured_at IS NULL AND access_until IS NULL)
    OR (provider_payment_id IS NOT NULL AND captured_at IS NOT NULL
      AND access_until IS NOT NULL AND access_until > captured_at)
  )
);
CREATE INDEX campaign_publishing_access_lookup
  ON public.campaign_publishing_orders (campaign_id, access_until DESC)
  WHERE access_until IS NOT NULL;
ALTER TABLE public.campaign_publishing_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.campaign_publishing_orders FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.campaign_publishing_orders TO service_role;

CREATE FUNCTION public.activate_campaign_publishing_access(
  p_campaign_id uuid,
  p_provider_order_id text,
  p_provider_payment_id text,
  p_amount_paise integer
) RETURNS timestamptz
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  selected public.campaign_publishing_orders%ROWTYPE;
  verified_at timestamptz := now();
  new_expiry timestamptz;
BEGIN
  -- Serialize renewals for this campaign even if separate orders were paid concurrently.
  PERFORM 1 FROM public.campaigns WHERE id = p_campaign_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO selected FROM public.campaign_publishing_orders
    WHERE provider_order_id = p_provider_order_id AND campaign_id = p_campaign_id
    FOR UPDATE;
  IF NOT FOUND OR selected.amount_paise <> p_amount_paise THEN RETURN NULL; END IF;
  IF selected.provider_payment_id IS NOT NULL THEN
    IF selected.provider_payment_id = p_provider_payment_id THEN RETURN selected.access_until; END IF;
    RETURN NULL;
  END IF;

  SELECT greatest(verified_at, max(access_until)) + make_interval(days => selected.access_days)
    INTO new_expiry FROM public.campaign_publishing_orders WHERE campaign_id = p_campaign_id;
  UPDATE public.campaign_publishing_orders SET
    provider_payment_id = p_provider_payment_id, captured_at = verified_at, access_until = new_expiry
    WHERE provider_order_id = selected.provider_order_id;
  RETURN new_expiry;
END;
$$;
REVOKE ALL ON FUNCTION public.activate_campaign_publishing_access(uuid, text, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_campaign_publishing_access(uuid, text, text, integer)
  TO service_role;
