-- Durable executive dashboard metrics. Values are derived only from persisted
-- events and existing constituency/wallet records; unsupported commercial
-- metrics remain NULL until a reconciled billing ledger exists.

CREATE INDEX IF NOT EXISTS idx_analytics_timestamp_desc
  ON public.universal_analytics_events (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_ac_timestamp
  ON public.universal_analytics_events ((geography ->> 'acId'), timestamp DESC);

CREATE OR REPLACE FUNCTION public.get_product_dashboard_metrics()
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH signup_users AS MATERIALIZED (
    SELECT DISTINCT COALESCE(NULLIF(user_id, ''), anonymous_id) AS actor_id
    FROM public.universal_analytics_events
    WHERE event_name IN ('signup_completed', 'user_registered')
      AND timestamp <= NOW()
  ),
  window_events AS MATERIALIZED (
    SELECT
      event_name,
      COALESCE(NULLIF(user_id, ''), anonymous_id) AS actor_id,
      session_id,
      timestamp,
      geography ->> 'acId' AS ac_id
    FROM public.universal_analytics_events
    WHERE timestamp >= NOW() - INTERVAL '30 days'
      AND timestamp <= NOW()
  ),
  activation AS (
    SELECT
      (SELECT COUNT(*) FROM signup_users) AS total_signups,
      (SELECT COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), anonymous_id))
       FROM public.universal_analytics_events
       WHERE event_name IN ('otp_verified', 'kyc_verified') AND timestamp <= NOW()) AS verified_users,
      (SELECT COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), anonymous_id))
       FROM public.universal_analytics_events
       WHERE event_name IN ('constituency_selected', 'geography_selected') AND timestamp <= NOW()) AS geography_selected,
      (SELECT COUNT(DISTINCT COALESCE(NULLIF(e.user_id, ''), e.anonymous_id))
       FROM public.universal_analytics_events e
       JOIN signup_users s ON s.actor_id = COALESCE(NULLIF(e.user_id, ''), e.anonymous_id)
       WHERE e.event_name IN (
         'issue_created', 'issue_upvoted', 'representative_followed', 'pledge_signed'
       ) AND e.timestamp <= NOW()) AS activated_users
  ),
  retention AS (
    SELECT
      COUNT(DISTINCT actor_id) FILTER (WHERE timestamp >= NOW() - INTERVAL '1 day') AS dau,
      COUNT(DISTINCT actor_id) FILTER (WHERE timestamp >= NOW() - INTERVAL '7 days') AS wau,
      COUNT(DISTINCT actor_id) FILTER (WHERE timestamp >= NOW() - INTERVAL '30 days') AS mau
    FROM window_events
  ),
  engagement AS (
    SELECT
      COUNT(DISTINCT session_id) AS total_sessions,
      COUNT(*) FILTER (WHERE event_name IN (
        'issue_created', 'issue_upvoted', 'representative_followed', 'pledge_signed',
        'comment_posted', 'video_shared'
      )) AS civic_interactions,
      COUNT(*) AS event_count
    FROM window_events
  ),
  active_ac AS (
    SELECT
      c.id AS ac_id,
      c.name,
      COUNT(DISTINCT e.actor_id) AS active_users,
      COUNT(*) AS event_count
    FROM window_events e
    JOIN public.constituencies c ON c.id = e.ac_id
    WHERE e.ac_id IS NOT NULL AND e.ac_id <> ''
    GROUP BY c.id, c.name
  ),
  geography_metrics AS (
    SELECT
      (SELECT COUNT(*) FROM public.constituencies) AS total_constituencies,
      COUNT(*) AS active_constituencies,
      COALESCE(
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'acId', ac_id,
            'name', name,
            'activeUsers', active_users,
            'eventCount', event_count
          ) ORDER BY event_count DESC, ac_id ASC
        ) FILTER (WHERE rank <= 10),
        '[]'::JSONB
      ) AS top_active_constituencies
    FROM (
      SELECT *, ROW_NUMBER() OVER (ORDER BY event_count DESC, ac_id ASC) AS rank
      FROM active_ac
    ) ranked_ac
  ),
  coverage AS (
    SELECT MIN(timestamp) AS first_event_at
    FROM public.universal_analytics_events
    WHERE timestamp <= NOW()
  ),
  prepaid AS (
    SELECT (
      (SELECT COALESCE(SUM(balance_inr), 0) FROM public.campaign_wallets) +
      (SELECT COALESCE(SUM(wallet_balance_inr), 0) FROM public.commercial_ad_accounts)
    )::NUMERIC(14, 2) AS balance_inr
  )
  SELECT JSONB_BUILD_OBJECT(
    'activation', JSONB_BUILD_OBJECT(
      'totalSignups', activation.total_signups,
      'verifiedUsers', activation.verified_users,
      'geographySelectedCount', activation.geography_selected,
      'firstCivicActionCount', activation.activated_users,
      'activationRatePercent', CASE
        WHEN activation.total_signups > 0
        THEN ROUND(activation.activated_users::NUMERIC * 100 / activation.total_signups, 2)
        ELSE NULL
      END
    ),
    'retention', JSONB_BUILD_OBJECT(
      'dau', retention.dau,
      'wau', retention.wau,
      'mau', retention.mau,
      'stickinessRatioPercent', CASE
        WHEN retention.mau > 0 THEN ROUND(retention.dau::NUMERIC * 100 / retention.mau, 2)
        ELSE NULL
      END,
      -- Cohort-based retention cannot be reconstructed from activity windows alone.
      'day7RetentionRatePercent', NULL,
      'day30RetentionRatePercent', NULL
    ),
    'engagement', JSONB_BUILD_OBJECT(
      'totalSessions', engagement.total_sessions,
      -- Session start/end signals are not currently persisted consistently.
      'avgSessionDurationSeconds', NULL,
      'avgInteractionsPerSession', CASE
        WHEN engagement.total_sessions > 0
        THEN ROUND(engagement.event_count::NUMERIC / engagement.total_sessions, 2)
        ELSE NULL
      END,
      'totalCivicInteractions', engagement.civic_interactions
    ),
    'geographyDensity', JSONB_BUILD_OBJECT(
      'totalConstituencies', geography_metrics.total_constituencies,
      'activeConstituencies', geography_metrics.active_constituencies,
      'penetrationPercentage', CASE
        WHEN geography_metrics.total_constituencies > 0
        THEN ROUND(
          geography_metrics.active_constituencies::NUMERIC * 100 /
          geography_metrics.total_constituencies,
          2
        )
        ELSE NULL
      END,
      'topActiveConstituencies', geography_metrics.top_active_constituencies
    ),
    'revenue', JSONB_BUILD_OBJECT(
      -- No reconciled subscription/ad billing ledger is connected to this dashboard.
      'b2bSubscriptionMrrINR', NULL,
      'adRevenueINR', NULL,
      'totalPrepaidBalancesINR', prepaid.balance_inr,
      'arpuINR', NULL
    ),
    'dataQuality', JSONB_BUILD_OBJECT(
      'source', 'durable_database',
      'metricWindowDays', 30,
      'eventsInMetricWindow', engagement.event_count,
      'analyticsCoverageStart', coverage.first_event_at,
      'notes', JSONB_BUILD_ARRAY(
        'Event-based counts cover only records captured by the analytics instrumentation; they are not a verified census of all users.',
        'Mobile emitters now cover authenticated session start, successful signup sessions, issue creation, issue upvotes, comments, and saved constituency selection; other product flows remain uninstrumented and these events are best effort.',
        'Client telemetry is not anti-fraud verified and must not be used for billing, election compliance, or financial reporting.',
        'Anonymous-to-authenticated identity stitching is not available, so a person may be counted under both identifiers.',
        'Constituency totals mean rows currently present in the platform catalogue, not an independently verified national total.',
        'Day-7 and day-30 cohort retention, session duration, subscription MRR, ad revenue, and ARPU are unavailable because their required source data is not connected.',
        'Prepaid balances combine campaign and commercial ad-account wallets; these customer balances are liabilities and are not revenue.'
      )
    ),
    'generatedAt', NOW()
  )
  FROM activation, retention, engagement, geography_metrics, coverage, prepaid;
$$;

REVOKE ALL ON FUNCTION public.get_product_dashboard_metrics() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_product_dashboard_metrics() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_dashboard_metrics() TO service_role;

COMMENT ON FUNCTION public.get_product_dashboard_metrics() IS
  'Returns sourced product analytics; unsupported cohort, duration, and revenue figures are NULL.';
