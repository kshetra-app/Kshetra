/**
 * Executive product metrics. Production values come from the database RPC added
 * in migration 097; caller-provided event reconstruction is a local diagnostic
 * only and is never presented as verified production data.
 */

import type { ProductDashboardMetricsDTO, UniversalAnalyticsEventDTO } from '@kshetra/shared';
import { isProductionLikeRuntime } from '../lib/runtimeEnvironment';
import { isSupabaseAvailable, isUsingServiceRole, supabase } from '../lib/supabase';

export class ProductDashboardDataUnavailableError extends Error {
  constructor() {
    super('Durable product analytics are unavailable. Apply the dashboard migration and verify the database connection.');
    this.name = 'ProductDashboardDataUnavailableError';
  }
}

const SIGNUP_EVENTS = new Set(['signup_completed', 'user_registered']);
const VERIFIED_EVENTS = new Set(['otp_verified', 'kyc_verified']);
const GEOGRAPHY_EVENTS = new Set(['constituency_selected', 'geography_selected']);
const FIRST_ACTION_EVENTS = new Set([
  'issue_created',
  'issue_upvoted',
  'representative_followed',
  'pledge_signed',
]);
const CIVIC_INTERACTION_EVENTS = new Set([
  ...FIRST_ACTION_EVENTS,
  'comment_posted',
  'video_shared',
]);

export class ProductDashboardService {
  /** Read a single database-side aggregation over durable source tables. */
  static async getExecutiveMetrics(): Promise<ProductDashboardMetricsDTO> {
    if (!isSupabaseAvailable() || !isUsingServiceRole) {
      throw new ProductDashboardDataUnavailableError();
    }

    try {
      const { data, error } = await supabase.rpc('get_product_dashboard_metrics');
      if (error || !data || typeof data !== 'object') {
        throw new ProductDashboardDataUnavailableError();
      }
      return data as ProductDashboardMetricsDTO;
    } catch {
      throw new ProductDashboardDataUnavailableError();
    }
  }

  /**
   * Diagnostic calculation for non-production use. It intentionally leaves
   * cohort retention, duration, catalogue coverage, and monetization unknown.
   */
  static reconstructMetricsFromEvents(
    events: UniversalAnalyticsEventDTO[],
  ): ProductDashboardMetricsDTO {
    if (isProductionLikeRuntime()) throw new ProductDashboardDataUnavailableError();

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const recentEvents = events.filter((event) => {
      const timestamp = Date.parse(event.timestamp);
      return Number.isFinite(timestamp) && timestamp <= now && timestamp >= now - 30 * day;
    });
    const actor = (event: UniversalAnalyticsEventDTO) => event.userId || event.anonymousId;
    const distinctActors = (rows: UniversalAnalyticsEventDTO[]) =>
      new Set(rows.map(actor)).size;

    const signupUsers = new Set(
      events.filter((event) => SIGNUP_EVENTS.has(event.eventName)).map(actor),
    );
    const activatedUsers = new Set(
      events
        .filter((event) => FIRST_ACTION_EVENTS.has(event.eventName) && signupUsers.has(actor(event)))
        .map(actor),
    );
    const totalSignups = signupUsers.size;
    const verifiedUsers = distinctActors(
      events.filter((event) => VERIFIED_EVENTS.has(event.eventName)),
    );
    const geographySelectedCount = distinctActors(
      events.filter((event) => GEOGRAPHY_EVENTS.has(event.eventName)),
    );
    const identitiesByWindow = (windowDays: number) => {
      const cutoff = now - windowDays * day;
      return new Set(
        events
          .filter((event) => {
            const timestamp = Date.parse(event.timestamp);
            return Number.isFinite(timestamp) && timestamp >= cutoff && timestamp <= now;
          })
          .map(actor),
      );
    };
    const dau = identitiesByWindow(1).size;
    const wau = identitiesByWindow(7).size;
    const mau = identitiesByWindow(30).size;
    const sessionIds = new Set(recentEvents.map((event) => event.sessionId));
    const activeAcs = new Map<string, { users: Set<string>; eventCount: number }>();
    for (const event of recentEvents) {
      const acId = event.geography?.acId;
      if (!acId) continue;
      const aggregate = activeAcs.get(acId) || { users: new Set<string>(), eventCount: 0 };
      aggregate.users.add(actor(event));
      aggregate.eventCount++;
      activeAcs.set(acId, aggregate);
    }
    const topActiveConstituencies = [...activeAcs.entries()]
      .sort((left, right) => right[1].eventCount - left[1].eventCount)
      .slice(0, 10)
      .map(([acId, aggregate]) => ({
        acId,
        name: acId,
        activeUsers: aggregate.users.size,
        eventCount: aggregate.eventCount,
      }));
    const firstEventTimestamp = events
      .map((event) => Date.parse(event.timestamp))
      .filter(Number.isFinite)
      .sort((left, right) => left - right)[0];

    return {
      activation: {
        totalSignups,
        verifiedUsers,
        geographySelectedCount,
        firstCivicActionCount: activatedUsers.size,
        activationRatePercent:
          totalSignups > 0
            ? Number(((activatedUsers.size / totalSignups) * 100).toFixed(2))
            : null,
      },
      retention: {
        dau,
        wau,
        mau,
        stickinessRatioPercent: mau > 0 ? Number(((dau / mau) * 100).toFixed(2)) : null,
        day7RetentionRatePercent: null,
        day30RetentionRatePercent: null,
      },
      engagement: {
        totalSessions: sessionIds.size,
        avgSessionDurationSeconds: null,
        avgInteractionsPerSession:
          sessionIds.size > 0
            ? Number((recentEvents.length / sessionIds.size).toFixed(2))
            : null,
        totalCivicInteractions: recentEvents.filter((event) =>
          CIVIC_INTERACTION_EVENTS.has(event.eventName),
        ).length,
      },
      geographyDensity: {
        totalConstituencies: null,
        activeConstituencies: activeAcs.size,
        penetrationPercentage: null,
        topActiveConstituencies,
      },
      revenue: {
        b2bSubscriptionMrrINR: null,
        adRevenueINR: null,
        totalPrepaidBalancesINR: null,
        arpuINR: null,
      },
      dataQuality: {
        source: 'local_development_buffer',
        metricWindowDays: 30,
        eventsInMetricWindow: recentEvents.length,
        analyticsCoverageStart: Number.isFinite(firstEventTimestamp)
          ? new Date(firstEventTimestamp).toISOString()
          : null,
        notes: [
          'Diagnostic values use only caller-provided or process-local events and are not production-verified.',
          'Core mobile emitters cover authentication, issue creation and upvotes, comments, and saved constituency selections; other flows remain uninstrumented and telemetry is best effort.',
          'Client telemetry is not anti-fraud verified and must not be used for billing, election compliance, or financial reporting.',
          'Anonymous-to-authenticated identity stitching is unavailable.',
          'Cohort retention, session duration, constituency catalogue coverage, and monetization are unavailable.',
        ],
      },
      generatedAt: new Date().toISOString(),
    };
  }
}

export const productDashboardService = ProductDashboardService;
