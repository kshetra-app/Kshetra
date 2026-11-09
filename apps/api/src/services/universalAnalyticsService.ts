/**
 * Universal Analytics Platform Service (JOB 065)
 *
 * Authority: Master Product Blueprint (Jobs 062-066), DEC-188, DEC-189
 * Features:
 * - Governed 10-Field Event Schema Ingestion (Single & Batch up to 100)
 * - Optional keyed HMAC pseudonymization for request IPs
 * - Removes common raw phone/email fields from event metadata; this is not comprehensive PII detection
 * - Pluggable External Exporter Sink Interface (DEC-189 Option B)
 * - Temporal & Geospatial Multi-Dimensional Queries
 */

import { createHmac, randomUUID } from 'crypto';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { isProductionLikeRuntime } from '../lib/runtimeEnvironment';
import type {
  UniversalAnalyticsEventDTO,
  BatchAnalyticsEventsRequest,
  BatchAnalyticsEventsResponse,
} from '@kshetra/shared';

export interface AnalyticsSinkExporter {
  exportEvents(events: UniversalAnalyticsEventDTO[]): Promise<void>;
}

export class AnalyticsStorageUnavailableError extends Error {
  constructor() {
    super('Analytics storage is unavailable. Events were not accepted.');
    this.name = 'AnalyticsStorageUnavailableError';
  }
}

export class UniversalAnalyticsService {
  // In-memory ring buffer for testing and fast retrieval
  private static eventBuffer: UniversalAnalyticsEventDTO[] = [];
  private static registeredSinks: AnalyticsSinkExporter[] = [];

  static resetForTesting(): void {
    this.eventBuffer = [];
    this.registeredSinks = [];
  }

  static registerSinkExporter(sink: AnalyticsSinkExporter): void {
    this.registeredSinks.push(sink);
  }

  // --- 1. EVENT INGESTION (SINGLE & BATCH) ---

  static async ingestBatch(
    req: BatchAnalyticsEventsRequest,
    clientIp?: string,
    authenticatedUserId?: string | null,
  ): Promise<BatchAnalyticsEventsResponse> {
    if (!req.events || !Array.isArray(req.events)) {
      return {
        success: false,
        ingestedCount: 0,
        rejectedCount: 0,
        errors: ['INVALID_PAYLOAD: events array required'],
      };
    }

    if (req.events.length > 100) {
      return {
        success: false,
        ingestedCount: 0,
        rejectedCount: req.events.length,
        errors: ['BATCH_SIZE_EXCEEDED: Maximum 100 events allowed per batch request'],
      };
    }

    let ingestedCount = 0;
    let rejectedCount = 0;
    const errors: string[] = [];
    const validEvents: UniversalAnalyticsEventDTO[] = [];

    const now = new Date().toISOString();
    // Set ANALYTICS_IP_HASH_SECRET per deployment to enable keyed IP pseudonymization.
    const configuredHashSecret = process.env.ANALYTICS_IP_HASH_SECRET?.trim();
    const ipHashSecret = configuredHashSecret ||
      (!isProductionLikeRuntime() ? 'local-development-only' : '');
    const ipHash = clientIp && ipHashSecret
      ? createHmac('sha256', ipHashSecret).update(clientIp).digest('hex')
      : undefined;

    for (let i = 0; i < req.events.length; i++) {
      const e = req.events[i];
      // Canonical 10-field schema validation
      if (!e.eventName || typeof e.eventName !== 'string') {
        rejectedCount++;
        errors.push(`Event at index ${i} missing required eventName`);
        continue;
      }
      if (!e.anonymousId || typeof e.anonymousId !== 'string') {
        rejectedCount++;
        errors.push(`Event at index ${i} missing required anonymousId`);
        continue;
      }
      if (!e.sessionId || typeof e.sessionId !== 'string') {
        rejectedCount++;
        errors.push(`Event at index ${i} missing required sessionId`);
        continue;
      }
      if (!e.screen || typeof e.screen !== 'string') {
        rejectedCount++;
        errors.push(`Event at index ${i} missing required screen`);
        continue;
      }
      if (!e.appVersion || typeof e.appVersion !== 'string') {
        rejectedCount++;
        errors.push(`Event at index ${i} missing required appVersion`);
        continue;
      }

      // Remove common raw phone/email fields; arbitrary nested metadata needs separate privacy review.
      const sanitizedMeta = { ...(e.metadata || {}) };
      // Never preserve a client-supplied value under this server-owned field.
      delete sanitizedMeta._clientIpHash;
      if (ipHash) sanitizedMeta._clientIpHash = ipHash;
      delete sanitizedMeta.phone;
      delete sanitizedMeta.email;
      delete sanitizedMeta.rawIp;

      const eventDto: UniversalAnalyticsEventDTO = {
        // The database primary key is UUID. Do not trust arbitrary client IDs here.
        id: randomUUID(),
        eventName: e.eventName,
        // Never trust user identity asserted in an event payload. The API route
        // supplies this only after validating the bearer token with Supabase.
        userId: authenticatedUserId || null,
        anonymousId: e.anonymousId,
        sessionId: e.sessionId,
        // The client timestamp is not trusted for time-window reporting.
        timestamp: now,
        screen: e.screen,
        geography: e.geography || {},
        entity: e.entity || {},
        metadata: sanitizedMeta,
        appVersion: e.appVersion,
      };

      validEvents.push(eventDto);
      ingestedCount++;
    }

    // A production success response means the durable write completed. The
    // process-local buffer is only an isolated development/test fallback.
    if (validEvents.length > 0 && !isSupabaseAvailable()) {
      if (isProductionLikeRuntime()) throw new AnalyticsStorageUnavailableError();
      this.cacheForLocalUse(validEvents);
    } else if (validEvents.length > 0) {
      try {
        const rows = validEvents.map((v) => ({
          id: v.id,
          event_name: v.eventName,
          user_id: v.userId,
          anonymous_id: v.anonymousId,
          session_id: v.sessionId,
          timestamp: v.timestamp,
          screen: v.screen,
          geography: v.geography,
          entity: v.entity,
          metadata: v.metadata,
          app_version: v.appVersion,
          ingested_at: now,
        }));
        const { error } = await supabase.from('universal_analytics_events').insert(rows);
        if (error) throw error;
        if (!isProductionLikeRuntime()) this.cacheForLocalUse(validEvents);
      } catch {
        throw new AnalyticsStorageUnavailableError();
      }
    }

    // Export to registered third-party sinks (DEC-189 Option B)
    if (validEvents.length > 0 && this.registeredSinks.length > 0) {
      for (const sink of this.registeredSinks) {
        sink.exportEvents(validEvents).catch(() => {});
      }
    }

    return {
      success: rejectedCount === 0,
      ingestedCount,
      rejectedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // --- 2. MULTI-DIMENSIONAL QUERY ENGINE ---

  static async queryEvents(filter: {
    eventName?: string;
    userId?: string;
    acId?: string;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<UniversalAnalyticsEventDTO[]> {
    const requestedLimit = Number.isFinite(filter.limit) ? Math.trunc(filter.limit!) : 100;
    const limit = Math.max(1, Math.min(requestedLimit || 100, 500));

    if (isSupabaseAvailable()) {
      let query = supabase
        .from('universal_analytics_events')
        .select('id, event_name, user_id, anonymous_id, session_id, timestamp, screen, geography, entity, metadata, app_version');
      if (filter.eventName) query = query.eq('event_name', filter.eventName);
      if (filter.userId) query = query.eq('user_id', filter.userId);
      if (filter.acId) query = query.filter('geography->>acId', 'eq', filter.acId);
      if (filter.from) query = query.gte('timestamp', filter.from);
      if (filter.to) query = query.lte('timestamp', filter.to);

      const { data, error } = await query
        .order('timestamp', { ascending: false })
        .limit(limit);
      if (error) throw new AnalyticsStorageUnavailableError();

      return (data || []).map((row: any) => ({
        id: String(row.id),
        eventName: String(row.event_name),
        userId: row.user_id ? String(row.user_id) : null,
        anonymousId: String(row.anonymous_id),
        sessionId: String(row.session_id),
        timestamp: String(row.timestamp),
        screen: String(row.screen),
        geography: row.geography || {},
        entity: row.entity || {},
        metadata: row.metadata || {},
        appVersion: String(row.app_version),
      }));
    }

    if (isProductionLikeRuntime()) throw new AnalyticsStorageUnavailableError();

    let results = [...this.eventBuffer];

    if (filter.eventName) {
      results = results.filter((e) => e.eventName === filter.eventName);
    }
    if (filter.userId) {
      results = results.filter((e) => e.userId === filter.userId);
    }
    if (filter.acId) {
      results = results.filter((e) => e.geography?.acId === filter.acId);
    }
    if (filter.from) {
      const fromTs = new Date(filter.from).getTime();
      results = results.filter((e) => new Date(e.timestamp).getTime() >= fromTs);
    }
    if (filter.to) {
      const toTs = new Date(filter.to).getTime();
      results = results.filter((e) => new Date(e.timestamp).getTime() <= toTs);
    }

    return results.slice(0, limit);
  }

  static getRawEventBuffer(): UniversalAnalyticsEventDTO[] {
    return this.eventBuffer;
  }

  private static cacheForLocalUse(events: UniversalAnalyticsEventDTO[]): void {
    this.eventBuffer.push(...events);
    if (this.eventBuffer.length > 5000) {
      this.eventBuffer.splice(0, this.eventBuffer.length - 5000);
    }
  }
}

export const universalAnalyticsService = UniversalAnalyticsService;
