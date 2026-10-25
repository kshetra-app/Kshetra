/**
 * apps/api/src/modules/webhooks/queueProvider.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Queue State Machine, Atomic Claim (SKIP LOCKED), Lease-Token Fencing,
 * Exponential Backoff, Dead-Letter Transitions, and Crash Recovery.
 */

import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WebhookDeliveryModel, WebhookEventModel, WebhookSubscriptionModel } from './schemas';
import { sanitizeResponseHeaders, type DispatchResult } from './webhookDispatcher';

export interface EnqueueEventParams {
  tenantId: string;
  eventType: string;
  idempotencyKey?: string | null;
  payload: Record<string, unknown>;
  payloadRaw: string;
  payloadSha256: string;
}

export interface LeasedDeliveryJob {
  delivery: WebhookDeliveryModel;
  subscription: WebhookSubscriptionModel;
  event: WebhookEventModel;
  leaseToken: string;
}

export interface WebhookQueueProvider {
  enqueueEvent(params: EnqueueEventParams): Promise<{ eventId: string; deduplicated: boolean; enqueuedDeliveries: number }>;
  claimBatch(batchSize: number): Promise<LeasedDeliveryJob[]>;
  completeDelivery(deliveryId: string, leaseToken: string, result: DispatchResult): Promise<{ updated: boolean; terminalStatus?: string }>;
  recoverExpiredLeases(): Promise<number>;
  purgeExpiredData(retentionDays?: number, batchSize?: number): Promise<{ purgedDeliveries: number; purgedEvents: number }>;
}

export const RETRY_INTERVALS_SECONDS = [
  30,     // After attempt 1 fails (Retry 1)
  300,    // After attempt 2 fails (Retry 2: 5 min)
  1800,   // After attempt 3 fails (Retry 3: 30 min)
  7200,   // After attempt 4 fails (Retry 4: 2 hours)
] as const;

export const BACKOFF_SCHEDULE_SECONDS = RETRY_INTERVALS_SECONDS;
export const MAX_DELIVERY_ATTEMPTS = 5;

export function calculateBackoffDelaySeconds(attemptCount: number): number {
  const index = Math.max(0, attemptCount - 1);
  return RETRY_INTERVALS_SECONDS[index] || 7200;
}

export function calculateNextRetryAt(attemptCount: number, baseDate = new Date()): Date | null {
  if (attemptCount >= 5) {
    return null; // Terminal: moves to dead_letter
  }
  const intervalIndex = attemptCount - 1;
  const seconds = RETRY_INTERVALS_SECONDS[intervalIndex] || 7200;
  return new Date(baseDate.getTime() + seconds * 1000);
}

// ─── IN-MEMORY QUEUE PROVIDER (FOR ISOLATED TESTS & ZERO-INFRASTRUCTURE RUNS) ───

export class InMemoryQueueProvider implements WebhookQueueProvider {
  public subscriptions = new Map<string, WebhookSubscriptionModel>();
  public events = new Map<string, WebhookEventModel>();
  public deliveries = new Map<string, WebhookDeliveryModel & { leaseToken?: string; leasedUntil?: Date; responseBodySample?: string; responseHeaders?: any; requestHeaders?: any }>();
  public tenantIdempotencyIndex = new Set<string>();

  async enqueueEvent(params: EnqueueEventParams): Promise<{ eventId: string; deduplicated: boolean; enqueuedDeliveries: number }> {
    const { tenantId, eventType, idempotencyKey, payload, payloadRaw, payloadSha256 } = params;

    // Check scoped tenant idempotency
    if (idempotencyKey) {
      const scopedKey = `${tenantId}:${idempotencyKey}`;
      if (this.tenantIdempotencyIndex.has(scopedKey)) {
        // Find existing event
        for (const evt of this.events.values()) {
          if (evt.tenantId === tenantId && evt.idempotencyKey === idempotencyKey) {
            return { eventId: evt.id, deduplicated: true, enqueuedDeliveries: 0 };
          }
        }
      }
      this.tenantIdempotencyIndex.add(scopedKey);
    }

    const eventId = crypto.randomUUID();
    const event: WebhookEventModel = {
      id: eventId,
      tenantId,
      eventType,
      idempotencyKey,
      payload,
      payloadRaw,
      payloadSha256,
      createdAt: new Date().toISOString(),
    };
    this.events.set(eventId, event);

    // Fan out to matching active subscriptions
    let enqueued = 0;
    for (const sub of this.subscriptions.values()) {
      if (sub.tenantId === tenantId && sub.status === 'active') {
        const matchesEvent = sub.subscribedEvents.includes('*') || sub.subscribedEvents.includes(eventType);
        if (matchesEvent) {
          const deliveryId = crypto.randomUUID();
          this.deliveries.set(deliveryId, {
            id: deliveryId,
            tenantId,
            subscriptionId: sub.id,
            eventId,
            attemptCount: 1,
            status: 'queued',
            createdAt: new Date().toISOString(),
          });
          enqueued++;
        }
      }
    }

    return { eventId, deduplicated: false, enqueuedDeliveries: enqueued };
  }

  async claimBatch(batchSize: number): Promise<LeasedDeliveryJob[]> {
    const now = new Date();
    const claimed: LeasedDeliveryJob[] = [];

    for (const delivery of this.deliveries.values()) {
      if (claimed.length >= batchSize) break;

      const isClaimable =
        delivery.status === 'queued' ||
        (delivery.status === 'retrying' && delivery.nextRetryAt && new Date(delivery.nextRetryAt) <= now) ||
        (delivery.status === 'leased' && delivery.leasedUntil && delivery.leasedUntil < now);

      if (isClaimable) {
        const leaseToken = crypto.randomUUID();
        const leasedUntil = new Date(now.getTime() + 30000); // 30s lease
        const sub = this.subscriptions.get(delivery.subscriptionId);
        const evt = this.events.get(delivery.eventId);

        if (sub && evt) {
          delivery.status = 'leased';
          delivery.leaseToken = leaseToken;
          delivery.leasedUntil = leasedUntil;

          claimed.push({
            delivery,
            subscription: sub,
            event: evt,
            leaseToken,
          });
        }
      }
    }

    return claimed;
  }

  async completeDelivery(
    deliveryId: string,
    leaseToken: string,
    result: DispatchResult
  ): Promise<{ updated: boolean; terminalStatus?: string }> {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return { updated: false };

    // Lease token fence: Stale worker update dropped
    if (delivery.leaseToken !== leaseToken) {
      console.warn(`[Queue] LEASE_FENCE_VIOLATION_UPDATE_DROPPED: delivery ${deliveryId}`);
      return { updated: false };
    }

    delivery.httpStatus = result.httpStatus;
    delivery.executionDurationMs = result.executionDurationMs;
    delivery.responseBodySample = result.responseBodySample;
    delivery.responseHeaders = result.responseHeaders;
    delivery.requestHeaders = result.requestHeaders;
    delivery.errorMessage = result.errorMessage || null;
    delete delivery.leaseToken;
    delete delivery.leasedUntil;

    const sub = this.subscriptions.get(delivery.subscriptionId);

    if (result.success) {
      delivery.status = 'delivered';
      delivery.completedAt = new Date().toISOString();
      delivery.nextRetryAt = null;

      if (sub) {
        sub.consecutiveFailureCount = 0;
      }
      return { updated: true, terminalStatus: 'delivered' };
    }

    // Failure path: check attempt bounds (1..5)
    if (delivery.attemptCount >= 5) {
      delivery.status = 'dead_letter';
      delivery.completedAt = new Date().toISOString();
      delivery.nextRetryAt = null;

      if (sub) {
        sub.consecutiveFailureCount = (sub.consecutiveFailureCount || 0) + 1;
        if (sub.consecutiveFailureCount >= 20) {
          sub.status = 'failed';
        }
      }
      return { updated: true, terminalStatus: 'dead_letter' };
    }

    // Schedule retry
    const nextRetry = calculateNextRetryAt(delivery.attemptCount);
    delivery.status = 'retrying';
    delivery.attemptCount += 1;
    delivery.nextRetryAt = nextRetry ? nextRetry.toISOString() : null;

    if (sub) {
      sub.consecutiveFailureCount = (sub.consecutiveFailureCount || 0) + 1;
      if (sub.consecutiveFailureCount >= 20) {
        sub.status = 'failed';
      }
    }

    return { updated: true, terminalStatus: 'retrying' };
  }

  async recoverExpiredLeases(): Promise<number> {
    const now = new Date();
    let recovered = 0;

    for (const delivery of this.deliveries.values()) {
      if (delivery.status === 'leased' && delivery.leasedUntil && delivery.leasedUntil < now) {
        delivery.status = 'queued';
        delete delivery.leaseToken;
        delete delivery.leasedUntil;
        recovered++;
      }
    }

    return recovered;
  }

  async purgeExpiredData(retentionDays = 30, batchSize = 1000): Promise<{ purgedDeliveries: number; purgedEvents: number }> {
    const cutoff = new Date(Date.now() - retentionDays * 86400000);
    let purgedDeliv = 0;
    let purgedEvt = 0;

    // Purge terminal deliveries first
    for (const [id, d] of this.deliveries.entries()) {
      if (purgedDeliv >= batchSize) break;
      if ((d.status === 'delivered' || d.status === 'dead_letter') && d.completedAt && new Date(d.completedAt) < cutoff) {
        this.deliveries.delete(id);
        purgedDeliv++;
      }
    }

    // Purge orphaned events second
    for (const [id, e] of this.events.entries()) {
      if (purgedEvt >= batchSize) break;
      if (new Date(e.createdAt) < cutoff) {
        let hasActive = false;
        for (const d of this.deliveries.values()) {
          if (d.eventId === id) {
            hasActive = true;
            break;
          }
        }
        if (!hasActive) {
          this.events.delete(id);
          purgedEvt++;
        }
      }
    }

    return { purgedDeliveries: purgedDeliv, purgedEvents: purgedEvt };
  }
}

// ─── POSTGRES / SUPABASE QUEUE PROVIDER (FOR DEPLOYED RUNTIMES) ───

export class PostgresQueueProvider implements WebhookQueueProvider {
  constructor(private readonly supabaseClient: SupabaseClient) {}

  async enqueueEvent(params: EnqueueEventParams): Promise<{ eventId: string; deduplicated: boolean; enqueuedDeliveries: number }> {
    const { tenantId, eventType, idempotencyKey, payload, payloadRaw, payloadSha256 } = params;
    const { data, error } = await this.supabaseClient.rpc('fn_enqueue_webhook_event', {
      p_tenant_id: tenantId,
      p_event_type: eventType,
      p_idempotency_key: idempotencyKey ?? null,
      p_payload: payload,
      p_payload_raw: payloadRaw,
      p_payload_sha256: payloadSha256,
    });

    if (error) {
      throw new Error(`DATABASE_ENQUEUE_ERROR: Atomic webhook enqueue failed: ${error.message}`);
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.event_id) {
      throw new Error('DATABASE_ENQUEUE_ERROR: Atomic enqueue returned no event identifier.');
    }
    return {
      eventId: row.event_id,
      deduplicated: row.deduplicated === true,
      enqueuedDeliveries: Number(row.enqueued_deliveries ?? 0),
    };
  }

  async claimBatch(batchSize: number): Promise<LeasedDeliveryJob[]> {
    const normalizedBatchSize = Math.max(1, Math.min(50, Math.trunc(batchSize)));
    const { data, error } = await this.supabaseClient.rpc('fn_claim_webhook_batch', {
      p_batch_size: normalizedBatchSize,
      p_lease_seconds: 60,
    });

    if (error) {
      throw new Error(`DATABASE_CLAIM_ERROR: Atomic webhook claim failed: ${error.message}`);
    }
    if (!Array.isArray(data)) return [];

    return data.map((row: any) => ({
      delivery: {
        id: row.delivery_id,
        tenantId: row.tenant_id,
        subscriptionId: row.subscription_id,
        eventId: row.event_id,
        attemptCount: Number(row.attempt_count),
        status: 'leased' as const,
        createdAt: row.delivery_created_at,
        httpStatus: null,
        executionDurationMs: null,
        errorMessage: null,
        nextRetryAt: null,
        completedAt: null,
      },
      subscription: {
        id: row.subscription_id,
        tenantId: row.tenant_id,
        applicationId: row.application_id,
        endpointUrl: row.endpoint_url,
        secretHint: row.secret_hint,
        secretHash: row.secret_hash,
        subscribedEvents: Array.isArray(row.subscribed_events) ? row.subscribed_events : [],
        status: row.subscription_status,
        consecutiveFailureCount: Number(row.consecutive_failure_count ?? 0),
        createdAt: row.subscription_created_at,
        updatedAt: row.subscription_updated_at,
      },
      event: {
        id: row.event_id,
        tenantId: row.tenant_id,
        eventType: row.event_type,
        payload: row.event_payload,
        payloadRaw: row.payload_raw,
        payloadSha256: row.payload_sha256,
        createdAt: row.event_created_at,
      },
      leaseToken: row.lease_token,
    }));
  }

  async completeDelivery(
    deliveryId: string,
    leaseToken: string,
    result: DispatchResult
  ): Promise<{ updated: boolean; terminalStatus?: string }> {
    const { data, error } = await this.supabaseClient.rpc('fn_complete_webhook_delivery', {
      p_delivery_id: deliveryId,
      p_lease_token: leaseToken,
      p_success: result.success,
      p_http_status: result.httpStatus,
      p_execution_duration_ms: result.executionDurationMs,
      p_response_headers: sanitizeResponseHeaders(result.responseHeaders),
      p_response_body_sample: result.responseBodySample.slice(0, 1024),
      p_error_message: result.errorMessage?.slice(0, 1024) ?? null,
    });

    if (error) {
      throw new Error(`DATABASE_COMPLETION_ERROR: Lease-fenced delivery completion failed: ${error.message}`);
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('DATABASE_COMPLETION_ERROR: Completion RPC returned no result.');
    return row.terminal_status == null ? { updated: row.updated === true } : { updated: row.updated === true, terminalStatus: row.terminal_status };
  }

  async recoverExpiredLeases(): Promise<number> {
    const { data, error } = await this.supabaseClient.rpc('fn_recover_expired_webhook_leases');
    if (error) {
      throw new Error(`DATABASE_LEASE_RECOVERY_ERROR: Expired lease recovery failed: ${error.message}`);
    }
    return Number(data ?? 0);
  }

  async purgeExpiredData(retentionDays = 30, batchSize = 1000): Promise<{ purgedDeliveries: number; purgedEvents: number }> {
    const { data, error } = await this.supabaseClient.rpc('fn_purge_expired_webhook_data', {
      p_retention_days: retentionDays,
      p_batch_size: batchSize,
    });
    if (error) {
      throw new Error(`DATABASE_RETENTION_ERROR: Webhook retention failed: ${error.message}`);
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('DATABASE_RETENTION_ERROR: Retention RPC returned no result.');
    return {
      purgedDeliveries: Number(row.purged_deliveries_count ?? 0),
      purgedEvents: Number(row.purged_events_count ?? 0),
    };
  }
}
