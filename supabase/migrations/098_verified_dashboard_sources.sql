-- Dashboard metrics backed by durable, explicitly defined source records.
-- MRR uses verified paid subscription orders for currently active periods.
-- Ad revenue stays unavailable until the durable delivery ledger is enabled.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ad_platform_configuration (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  enabled_at TIMESTAMPTZ,
  enabled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (NOT enabled OR (enabled_at IS NOT NULL AND enabled_by IS NOT NULL))
);

INSERT INTO public.ad_platform_configuration (singleton, enabled)
VALUES (TRUE, FALSE)
ON CONFLICT (singleton) DO NOTHING;

ALTER TABLE public.ad_platform_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_platform_configuration FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.ad_platform_configuration FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ad_platform_configuration TO service_role;

CREATE TABLE IF NOT EXISTS public.ad_delivery_revenue_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_event_id UUID NOT NULL UNIQUE,
  ad_id UUID NOT NULL,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('political', 'commercial')),
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click', 'flight_charge')),
  amount_inr NUMERIC(14, 2) NOT NULL CHECK (amount_inr > 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  recognized_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_delivery_revenue_recognized_at
  ON public.ad_delivery_revenue_ledger (recognized_at DESC);

ALTER TABLE public.ad_delivery_revenue_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_delivery_revenue_ledger FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.ad_delivery_revenue_ledger FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ad_delivery_revenue_ledger TO service_role;

CREATE OR REPLACE FUNCTION public.get_product_dashboard_metrics()
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH utc_clock AS (
    SELECT (NOW() AT TIME ZONE 'UTC')::DATE AS today
  ),
  signup_users AS MATERIALIZED (
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
  signup_cohorts AS MATERIALIZED (
    SELECT
      user_id AS actor_id,
      MIN((timestamp AT TIME ZONE 'UTC')::DATE) AS signup_date
    FROM public.universal_analytics_events
    WHERE event_name IN ('signup_completed', 'user_registered')
      AND NULLIF(user_id, '') IS NOT NULL
      AND timestamp <= NOW()
    GROUP BY user_id
  ),
  activity_days AS MATERIALIZED (
    SELECT DISTINCT
      user_id AS actor_id,
      (timestamp AT TIME ZONE 'UTC')::DATE AS activity_date
    FROM public.universal_analytics_events
    WHERE NULLIF(user_id, '') IS NOT NULL
      AND event_name NOT IN ('signup_completed', 'user_registered')
      AND timestamp <= NOW()
  ),
  retention_cohorts AS (
    SELECT
      COUNT(*) FILTER (WHERE s.signup_date + 8 <= clock.today) AS day7_size,
      COUNT(*) FILTER (
        WHERE s.signup_date + 8 <= clock.today
          AND EXISTS (
            SELECT 1 FROM activity_days a
            WHERE a.actor_id = s.actor_id
              AND a.activity_date = s.signup_date + 7
          )
      ) AS day7_returned,
      COUNT(*) FILTER (WHERE s.signup_date + 31 <= clock.today) AS day30_size,
      COUNT(*) FILTER (
        WHERE s.signup_date + 31 <= clock.today
          AND EXISTS (
            SELECT 1 FROM activity_days a
            WHERE a.actor_id = s.actor_id
              AND a.activity_date = s.signup_date + 30
          )
      ) AS day30_returned
    FROM signup_cohorts s
    CROSS JOIN utc_clock clock
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
  latest_stream_telemetry AS MATERIALIZED (
    SELECT DISTINCT ON (stream_id)
      stream_id,
      captured_at,
      health_status
    FROM public.broadcast_telemetry_snapshots
    ORDER BY stream_id, captured_at DESC
  ),
  stream_rows AS MATERIALIZED (
    SELECT
      s.id,
      s.title,
      COALESCE(c.title, 'Unknown channel') AS channel_title,
      s.state_code,
      s.actual_start_time,
      s.scheduled_start_time,
      s.status,
      s.viewer_count_current,
      t.captured_at AS telemetry_at,
      t.health_status,
      COALESCE((
        s.status = 'LIVE'
        AND s.actual_start_time IS NOT NULL
        AND s.actual_end_time IS NULL
        AND t.captured_at >= NOW() - INTERVAL '120 seconds'
        AND t.health_status IN ('EXCELLENT', 'GOOD', 'DEGRADED')
      ), FALSE) AS verified_live
    FROM public.broadcast_streams s
    LEFT JOIN public.broadcast_channels c ON c.id = s.channel_id
    LEFT JOIN latest_stream_telemetry t ON t.stream_id = s.id
  ),
  stream_metrics AS (
    SELECT
      COUNT(*) FILTER (WHERE verified_live) AS verified_live_count,
      COUNT(*) FILTER (WHERE status = 'LIVE' AND NOT verified_live) AS stale_reported_count,
      COUNT(*) FILTER (
        WHERE status = 'SCHEDULED' AND scheduled_start_time >= NOW()
      ) AS scheduled_count,
      COALESCE(SUM(viewer_count_current) FILTER (WHERE verified_live), 0) AS current_viewer_count,
      MAX(telemetry_at) FILTER (WHERE status = 'LIVE') AS latest_heartbeat_at,
      COALESCE(
        (
          SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
            'id', i.id,
            'title', i.title,
            'channelTitle', i.channel_title,
            'stateCode', i.state_code,
            'startedAt', i.actual_start_time,
            'currentViewers', i.viewer_count_current,
            'telemetryAt', i.telemetry_at
          ) ORDER BY i.actual_start_time DESC)
          FROM (
            SELECT * FROM stream_rows
            WHERE verified_live
            ORDER BY actual_start_time DESC
            LIMIT 20
          ) i
        ),
        '[]'::JSONB
      ) AS inventory
    FROM stream_rows
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
  ),
  active_subscriptions AS (
    SELECT
      COUNT(*) AS subscription_count,
      COALESCE(SUM(
        CASE o.billing_cycle
          WHEN 'monthly' THEN o.amount_paise::NUMERIC / 100
          WHEN 'annual' THEN o.amount_paise::NUMERIC / 1200
          ELSE 0
        END
      ), 0)::NUMERIC(14, 2) AS mrr_inr
    FROM public.saas_tenants t
    JOIN public.saas_billing_orders o
      ON o.tenant_id = t.id
     AND o.provider_order_id = t.metadata #>> '{billing,lastOrderId}'
     AND o.target_tier = t.tier
     AND o.status = 'paid'
     AND o.currency = 'INR'
    WHERE t.status = 'active'
      AND t.metadata #>> '{billing,status}' = 'active'
      AND CASE
        WHEN t.metadata #>> '{billing,currentPeriodEnd}' ~
          '^[0-9]{4}-[0-9]{2}-[0-9]{2}T.*(Z|[+-][0-9]{2}:[0-9]{2})$'
        THEN (t.metadata #>> '{billing,currentPeriodEnd}')::TIMESTAMPTZ > NOW()
        ELSE FALSE
      END
  ),
  ad_delivery AS (
    SELECT COALESCE((
      SELECT enabled FROM public.ad_platform_configuration WHERE singleton = TRUE
    ), FALSE) AS enabled
  ),
  recognized_ad_revenue AS (
    SELECT COALESCE(SUM(amount_inr), 0)::NUMERIC(14, 2) AS amount_inr
    FROM public.ad_delivery_revenue_ledger
    WHERE recognized_at >= NOW() - INTERVAL '30 days'
      AND recognized_at <= NOW()
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
      'day7RetentionRatePercent', CASE
        WHEN retention_cohorts.day7_size > 0
        THEN ROUND(retention_cohorts.day7_returned::NUMERIC * 100 / retention_cohorts.day7_size, 2)
        ELSE NULL
      END,
      'day30RetentionRatePercent', CASE
        WHEN retention_cohorts.day30_size > 0
        THEN ROUND(retention_cohorts.day30_returned::NUMERIC * 100 / retention_cohorts.day30_size, 2)
        ELSE NULL
      END,
      'day7MaturedCohortSize', retention_cohorts.day7_size,
      'day30MaturedCohortSize', retention_cohorts.day30_size
    ),
    'liveStreams', JSONB_BUILD_OBJECT(
      'verifiedLiveCount', stream_metrics.verified_live_count,
      'staleReportedCount', stream_metrics.stale_reported_count,
      'scheduledCount', stream_metrics.scheduled_count,
      'currentViewerCount', stream_metrics.current_viewer_count,
      'freshnessWindowSeconds', 120,
      'latestHeartbeatAt', stream_metrics.latest_heartbeat_at,
      'inventory', stream_metrics.inventory
    ),
    'engagement', JSONB_BUILD_OBJECT(
      'totalSessions', engagement.total_sessions,
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
      'b2bSubscriptionMrrINR', active_subscriptions.mrr_inr,
      'activeB2bSubscriptions', active_subscriptions.subscription_count,
      'adDeliveryEnabled', ad_delivery.enabled,
      'adRevenueINR', CASE
        WHEN ad_delivery.enabled THEN recognized_ad_revenue.amount_inr
        ELSE NULL
      END,
      'totalPrepaidBalancesINR', prepaid.balance_inr,
      'arpuINR', CASE
        WHEN ad_delivery.enabled AND retention.mau > 0
        THEN ROUND((active_subscriptions.mrr_inr + recognized_ad_revenue.amount_inr) / retention.mau, 2)
        ELSE NULL
      END
    ),
    'dataQuality', JSONB_BUILD_OBJECT(
      'source', 'durable_database',
      'metricWindowDays', 30,
      'eventsInMetricWindow', engagement.event_count,
      'analyticsCoverageStart', coverage.first_event_at,
      'notes', JSONB_BUILD_ARRAY(
        'Event-based activity covers records captured by analytics instrumentation; it is not a verified census of all users.',
        'DAU, WAU, and MAU include authenticated and anonymous event actors; cross-device identity stitching is unavailable.',
        'Day-7 and day-30 retention use authenticated signup events and activity on the exact UTC calendar day 7 or 30 after signup; only fully matured cohorts are included.',
        'Cohort denominator coverage is limited to signups captured by the analytics instrumentation; no historical signup reconstruction is performed.',
        'Session duration remains unavailable because session start and end signals are not persisted consistently.',
        'B2B MRR uses the latest provider-verified paid order for each active tenant whose billed period has not expired; annual amounts are divided by 12.',
        'Ad revenue is the prior 30 days of recognized delivery charges from the durable ad ledger; it remains unavailable while ad delivery is disabled.',
        'ARPU is (active B2B subscription MRR plus the prior 30 days of recognized ad revenue) divided by MAU; it is unavailable while ad revenue is unavailable.',
        'Only streams with a LIVE database state and a healthy media telemetry heartbeat within 120 seconds count as verified live; stale LIVE rows are reported separately.',
        'Prepaid campaign and commercial ad balances are customer liabilities and are not revenue.'
      )
    ),
    'generatedAt', NOW()
  )
  FROM activation, retention, retention_cohorts, engagement, geography_metrics,
       stream_metrics, coverage, prepaid, active_subscriptions, ad_delivery,
       recognized_ad_revenue;
$$;

REVOKE ALL ON FUNCTION public.get_product_dashboard_metrics() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_product_dashboard_metrics() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_dashboard_metrics() TO service_role;

COMMENT ON FUNCTION public.get_product_dashboard_metrics() IS
  'Returns durable product analytics with exact UTC signup cohorts, heartbeat-verified stream inventory, current paid subscription MRR, and ledger-backed ad revenue.';

COMMIT;
