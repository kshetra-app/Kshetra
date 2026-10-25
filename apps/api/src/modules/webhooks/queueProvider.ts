/**
 * apps/api/src/modules/webhooks/queueProvider.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Queue State Machine, Atomic Claim (SKIP LOCKED), Lease-Token Fencing,
 * Exponential Backoff, Dead-Letter Transitions, and Crash Recovery.
 */

import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { decodePostgrestBytea, decryptSecret } from './crypto';
import { getWebhookWorkerClient } from './webhookWorkerAuth';
import type { WebhookDeliveryModel, WebhookEventModel, WebhookSubscriptionModel } from './schemas';
import type { DispatchResult } from './webhookDispatcher';

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
  /** Internal-only signing material; never serialize a leased job in an API response. */
  secret: string;
  previousSecret?: string | null;
  previousSecretExpiresAt?: string | null;
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
          const previousSecretExpiresAt = (sub as any)._previousSecretExpiresAt as string | undefined;
          const previousSecret =
            typeof (sub as any)._previousSecret === 'string' &&
            previousSecretExpiresAt &&
            Date.parse(previousSecretExpiresAt) > now.getTime()
              ? (sub as any)._previousSecret as string
              : null;

          delivery.status = 'leased';
          delivery.leaseToken = leaseToken;
          delivery.leasedUntil = leasedUntil;

          claimed.push({
            delivery,
            subscription: sub,
            event: evt,
            leaseToken,
            secret: typeof (sub as any)._rawSecret === 'string' ? (sub as any)._rawSecret : '',
            previousSecret,
            previousSecretExpiresAt: previousSecretExpiresAt ?? null,
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
  constructor(
    private readonly supabaseClient: SupabaseClient,
    private readonly workerClientFactory: () => SupabaseClient = getWebhookWorkerClient,
  ) {}

  async enqueueEvent(params: EnqueueEventParams): Promise<{ eventId: string; deduplicated: boolean; enqueuedDeliveries: number }> {
    const { tenantId, eventType, idempotencyKey, payload, payloadRaw, payloadSha256 } = params;
    // Atomic event + fan-out: independent REST requests can strand an event without deliveries.
    const { data, error } = await this.supabaseClient.rpc('fn_enqueue_webhook_event', {
      p_tenant_id: tenantId, p_event_type: eventType, p_idempotency_key: idempotencyKey ?? null,
      p_payload: payload, p_payload_raw: payloadRaw, p_payload_sha256: payloadSha256,
    });
    if (error) throw new Error(`DATABASE_ENQUEUE_ERROR: Atomic event enqueue failed: ${error.message}`);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.event_id || typeof row.deduplicated !== 'boolean') {
      throw new Error('DATABASE_ENQUEUE_ERROR: Atomic enqueue RPC returned an invalid result.');
    }
    return { eventId: String(row.event_id), deduplicated: row.deduplicated, enqueuedDeliveries: Number(row.enqueued_deliveries) || 0 };
  }

  async claimBatch(batchSize: number): Promise<LeasedDeliveryJob[]> {
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
      throw new Error('INVALID_BATCH_SIZE: Batch size must be between 1 and 100.');
    }
    const { data, error } = await this.workerClientFactory().rpc('fn_claim_webhook_batch', {
      p_batch_size: batchSize, p_lease_seconds: 30,
    });
    if (error) throw new Error(`DATABASE_CLAIM_ERROR: Failed to claim webhook deliveries: ${error.message}`);

    return (Array.isArray(data) ? data : []).map((row: any): LeasedDeliveryJob => {
      const tenantId = String(row.tenant_id);
      const subscriptionId = String(row.subscription_id);
      const eventId = String(row.event_id);
      const previousSecretExpiresAt = row.previous_secret_expires_at ? String(row.previous_secret_expires_at) : null;
      const secret = decryptSecret({
        ciphertext: decodePostgrestBytea(row.secret_ciphertext),
        iv: decodePostgrestBytea(row.secret_iv),
        tag: decodePostgrestBytea(row.secret_tag),
      }, tenantId, subscriptionId);
      let previousSecret: string | null = null;
      if (row.previous_secret_ciphertext && row.previous_secret_iv && row.previous_secret_tag &&
          previousSecretExpiresAt && Date.parse(previousSecretExpiresAt) > Date.now()) {
        previousSecret = decryptSecret({
          ciphertext: decodePostgrestBytea(row.previous_secret_ciphertext),
          iv: decodePostgrestBytea(row.previous_secret_iv),
          tag: decodePostgrestBytea(row.previous_secret_tag),
        }, tenantId, subscriptionId);
      }
      const payload = row.payload && typeof row.payload === 'object'
        ? row.payload as Record<string, unknown>
        : JSON.parse(String(row.payload_raw)) as Record<string, unknown>;
      return {
        delivery: {
          id: String(row.delivery_id), tenantId, subscriptionId, eventId,
          attemptCount: Number(row.attempt_count), status: 'leased',
          httpStatus: row.http_status == null ? null : Number(row.http_status),
          executionDurationMs: row.execution_duration_ms == null ? null : Number(row.execution_duration_ms),
          errorMessage: row.error_message == null ? null : String(row.error_message),
          nextRetryAt: row.next_retry_at == null ? null : String(row.next_retry_at),
          createdAt: String(row.delivery_created_at),
          completedAt: row.completed_at == null ? null : String(row.completed_at),
        },
        subscription: {
          id: subscriptionId, tenantId, applicationId: String(row.application_id),
          endpointUrl: String(row.endpoint_url), secretHint: String(row.secret_hint), secretHash: String(row.secret_hash),
          subscribedEvents: Array.isArray(row.subscribed_events) ? row.subscribed_events.map(String) : [],
          status: row.subscription_status, consecutiveFailureCount: Number(row.consecutive_failure_count) || 0,
          createdAt: String(row.subscription_created_at), updatedAt: String(row.subscription_updated_at),
        },
        event: {
          id: eventId, tenantId, eventType: String(row.event_type),
          idempotencyKey: row.idempotency_key == null ? null : String(row.idempotency_key),
          payload, payloadRaw: String(row.payload_raw), payloadSha256: String(row.payload_sha256),
          createdAt: String(row.event_created_at),
        },
        leaseToken: String(row.lease_token), secret, previousSecret, previousSecretExpiresAt,
      };
    });
  }

  async completeDelivery(
    deliveryId: string, leaseToken: string, result: DispatchResult
  ): Promise<{ updated: boolean; terminalStatus?: string }> {
    const { data, error } = await this.workerClientFactory().rpc('fn_complete_webhook_delivery', {
      p_delivery_id: deliveryId, p_lease_token: leaseToken, p_success: result.success,
      p_http_status: result.httpStatus, p_execution_duration_ms: Math.max(0, Math.trunc(result.executionDurationMs || 0)),
      p_request_headers: result.requestHeaders || {}, p_response_headers: result.responseHeaders || {},
      p_response_body_sample: (result.responseBodySample || '').slice(0, 1024),
      p_error_message: result.errorMessage ? result.errorMessage.slice(0, 1024) : null,
    });
    if (error) throw new Error(`DATABASE_COMPLETION_ERROR: Fenced completion RPC failed: ${error.message}`);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { updated: false };
    return { updated: row.updated === true, terminalStatus: row.terminal_status == null ? undefined : String(row.terminal_status) };
  }

  async recoverExpiredLeases(): Promise<number> {
    const { data, error } = await this.workerClientFactory().rpc('fn_recover_expired_webhook_leases', { p_batch_size: 100 });
    if (error) throw new Error(`DATABASE_LEASE_RECOVERY_ERROR: Failed to recover expired leases: ${error.message}`);
    return Number(data) || 0;
  }

  async purgeExpiredData(retentionDays = 30, batchSize = 1000): Promise<{ purgedDeliveries: number; purgedEvents: number }> {
    const { data, error } = await this.workerClientFactory().rpc('fn_purge_expired_webhook_data', {
      p_retention_days: retentionDays, p_batch_size: batchSize,
    });
    if (error) throw new Error(`DATABASE_RETENTION_PURGE_ERROR: Failed to purge expired webhook data: ${error.message}`);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { purgedDeliveries: 0, purgedEvents: 0 };
    return { purgedDeliveries: Number(row.purged_deliveries_count) || 0, purgedEvents: Number(row.purged_events_count) || 0 };
  }
}
