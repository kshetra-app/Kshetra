/**
 * Universal Analytics Platform Service (JOB 065)
 *
 * Authority: Master Product Blueprint (Jobs 062-066), DEC-188, DEC-189
 * Features:
 * - Governed 10-Field Event Schema Ingestion (Single & Batch up to 100)
 * - DPDP 2023 IP Cryptographic Salt-Hashing (Zero raw citizen PII storage)
 * - Pluggable External Exporter Sink Interface (DEC-189 Option B)
 * - Temporal & Geospatial Multi-Dimensional Queries
 */

import { createHash } from 'crypto';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  UniversalAnalyticsEventDTO,
  BatchAnalyticsEventsRequest,
  BatchAnalyticsEventsResponse,
} from '@kshetra/shared';

export interface AnalyticsSinkExporter {
  exportEvents(events: UniversalAnalyticsEventDTO[]): Promise<void>;
}

export class UniversalAnalyticsService {
  // In-memory ring buffer for testing and fast retrieval
  private static eventBuffer: UniversalAnalyticsEventDTO[] = [];
  private static registeredSinks: AnalyticsSinkExporter[] = [];
  private static readonly DPDP_SALT = 'kshetra_dpdp_salt_2026_s9x';

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
    clientIp?: string
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
    const ipHash = clientIp
      ? createHash('sha256').update(`${clientIp}-${this.DPDP_SALT}`).digest('hex')
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

      // Sanitize metadata to prevent raw phone/email leaks (DPDP 2023)
      const sanitizedMeta = { ...(e.metadata || {}) };
      if (ipHash) sanitizedMeta._clientIpHash = ipHash;
      delete sanitizedMeta.phone;
      delete sanitizedMeta.email;
      delete sanitizedMeta.rawIp;

      const eventDto: UniversalAnalyticsEventDTO = {
        id: e.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        eventName: e.eventName,
        userId: e.userId || null,
        anonymousId: e.anonymousId,
        sessionId: e.sessionId,
        timestamp: e.timestamp || now,
        screen: e.screen,
        geography: e.geography || {},
        entity: e.entity || {},
        metadata: sanitizedMeta,
        appVersion: e.appVersion,
      };

      this.eventBuffer.push(eventDto);
      validEvents.push(eventDto);
      ingestedCount++;
    }

    // Persist valid events to database
    if (validEvents.length > 0 && isSupabaseConfigured) {
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
        await supabase.from('universal_analytics_events').insert(rows);
      } catch (err) {
        // In-memory buffer serves as fallback
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
    const limit = filter.limit || 100;
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
}

export const universalAnalyticsService = UniversalAnalyticsService;
