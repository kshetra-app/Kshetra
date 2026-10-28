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
import type { DispatchResult } from './webhookDispatcher';

export interface EnqueueEventParams {
  tenantId: string;
  applicationId: string;
  eventType: string;
  idempotencyKey?: string | null;
  payload: Record<string, unknown>;
  payloadRaw: string;
  payloadSha256: string;
}

export function parseBytea(val: any): Buffer {
  if (Buffer.isBuffer(val)) return val;
  if (val instanceof Uint8Array) return Buffer.from(val);
  if (typeof val === 'string') {
    if (val.startsWith('\\x') || val.startsWith('0x')) {
      return Buffer.from(val.slice(2), 'hex');
    }
    return Buffer.from(val, 'hex');
  }
  throw new Error(`INVALID_BYTEA: Expected Buffer, Uint8Array or hex string, got ${typeof val}`);
}

export interface LeasedDeliveryJob {
  delivery: WebhookDeliveryModel;
  subscription: WebhookSubscriptionModel & {
    secretCiphertext?: Buffer;
    secretIv?: Buffer;
    secretTag?: Buffer;
    secretKeyVersion?: number;
    previousSecretCiphertext?: Buffer | null;
    previousSecretIv?: Buffer | null;
    previousSecretTag?: Buffer | null;
    previousSecretExpiresAt?: string | null;
    rawSecret?: string;
  };
  event: WebhookEventModel;
  leaseToken: string;
}

export interface WebhookQueueProvider {
  enqueueEvent(
    params: EnqueueEventParams,
  ): Promise<{ eventId: string; deduplicated: boolean; enqueuedDeliveries: number }>;
  claimBatch(batchSize: number): Promise<LeasedDeliveryJob[]>;
  completeDelivery(
    deliveryId: string,
    leaseToken: string,
    result: DispatchResult,
  ): Promise<{ updated: boolean; terminalStatus?: string }>;
  recoverExpiredLeases(): Promise<number>;
  purgeExpiredData(
    retentionDays?: number,
    batchSize?: number,
  ): Promise<{ purgedDeliveries: number; purgedEvents: number }>;
}

export const RETRY_INTERVALS_SECONDS = [
  30, // After attempt 1 fails (Retry 1)
  300, // After attempt 2 fails (Retry 2: 5 min)
  1800, // After attempt 3 fails (Retry 3: 30 min)
  7200, // After attempt 4 fails (Retry 4: 2 hours)
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
  public deliveries = new Map<
    string,
    WebhookDeliveryModel & {
      leaseToken?: string;
      leasedUntil?: Date;
      responseBodySample?: string;
      responseHeaders?: any;
      requestHeaders?: any;
    }
  >();
  public tenantIdempotencyIndex = new Set<string>();

  async enqueueEvent(
    params: EnqueueEventParams,
  ): Promise<{ eventId: string; deduplicated: boolean; enqueuedDeliveries: number }> {
    const {
      tenantId,
      applicationId,
      eventType,
      idempotencyKey,
      payload,
      payloadRaw,
      payloadSha256,
    } = params;

    // Check scoped tenant and application idempotency
    if (idempotencyKey) {
      const scopedKey = `${tenantId}:${applicationId}:${idempotencyKey}`;
      if (this.tenantIdempotencyIndex.has(scopedKey)) {
        // Find existing event
        for (const evt of this.events.values()) {
          if (
            evt.tenantId === tenantId &&
            evt.applicationId === applicationId &&
            evt.idempotencyKey === idempotencyKey
          ) {
            let existingDeliveriesCount = 0;
            for (const d of this.deliveries.values()) {
              if (d.eventId === evt.id) existingDeliveriesCount++;
            }
            return {
              eventId: evt.id,
              deduplicated: true,
              enqueuedDeliveries: existingDeliveriesCount,
            };
          }
        }
      }
      this.tenantIdempotencyIndex.add(scopedKey);
    }

    const eventId = crypto.randomUUID();
    const event: WebhookEventModel = {
      id: eventId,
      tenantId,
      applicationId,
      eventType,
      idempotencyKey,
      payload,
      payloadRaw,
      payloadSha256,
      createdAt: new Date().toISOString(),
    };
    this.events.set(eventId, event);

    // Fan out to matching active subscriptions under this tenant and application
    let enqueued = 0;
    for (const sub of this.subscriptions.values()) {
      if (
        sub.tenantId === tenantId &&
        sub.applicationId === applicationId &&
        sub.status === 'active'
      ) {
        const matchesEvent =
          sub.subscribedEvents.includes('*') || sub.subscribedEvents.includes(eventType);
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
        (delivery.status === 'retrying' &&
          delivery.nextRetryAt &&
          new Date(delivery.nextRetryAt) <= now) ||
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
    result: DispatchResult,
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

  async purgeExpiredData(
    retentionDays = 30,
    batchSize = 1000,
  ): Promise<{ purgedDeliveries: number; purgedEvents: number }> {
    const cutoff = new Date(Date.now() - retentionDays * 86400000);
    let purgedDeliv = 0;
    let purgedEvt = 0;

    // Purge terminal deliveries first
    for (const [id, d] of this.deliveries.entries()) {
      if (purgedDeliv >= batchSize) break;
      if (
        (d.status === 'delivered' || d.status === 'dead_letter') &&
        d.completedAt &&
        new Date(d.completedAt) < cutoff
      ) {
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

  async enqueueEvent(
    params: EnqueueEventParams,
  ): Promise<{ eventId: string; deduplicated: boolean; enqueuedDeliveries: number }> {
    const {
      tenantId,
      applicationId,
      eventType,
      idempotencyKey,
      payload,
      payloadRaw,
      payloadSha256,
    } = params;

    const { data, error } = await this.supabaseClient.rpc('fn_publish_webhook_event', {
      p_tenant_id: tenantId,
      p_application_id: applicationId,
      p_event_type: eventType,
      p_idempotency_key: idempotencyKey || null,
      p_payload: payload,
      p_payload_raw: payloadRaw,
      p_payload_sha256: payloadSha256,
    });

    if (error) {
      throw new Error(`DATABASE_ENQUEUE_ERROR: Failed to publish webhook event: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('DATABASE_ENQUEUE_ERROR: No rows returned from fn_publish_webhook_event');
    }

    const row = data[0];
    return {
      eventId: row.event_id,
      deduplicated: Boolean(row.is_duplicate),
      enqueuedDeliveries: Number(row.deliveries_created) || 0,
    };
  }

  async claimBatch(batchSize: number): Promise<LeasedDeliveryJob[]> {
    const { data, error } = await this.supabaseClient.rpc('fn_claim_webhook_batch', {
      p_batch_size: batchSize,
      p_lease_seconds: 30,
    });

    if (error) {
      throw new Error(`RPC_CLAIM_BATCH_FAILED: ${error.message}`);
    }

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((row: any) => {
      if (
        !row.delivery_id ||
        !row.tenant_id ||
        !row.subscription_id ||
        !row.event_id ||
        !row.lease_token
      ) {
        throw new Error(
          `MALFORMED_CLAIM_BATCH_ROW: Required field missing from fn_claim_webhook_batch row: ${JSON.stringify(row)}`,
        );
      }

      const delivery: WebhookDeliveryModel = {
        id: row.delivery_id,
        tenantId: row.tenant_id,
        subscriptionId: row.subscription_id,
        eventId: row.event_id,
        attemptCount: row.attempt_count,
        status: 'leased',
        createdAt: row.leased_until || new Date().toISOString(),
      };

      const subscription: WebhookSubscriptionModel & {
        secretCiphertext: Buffer;
        secretIv: Buffer;
        secretTag: Buffer;
        secretKeyVersion: number;
        previousSecretCiphertext?: Buffer | null;
        previousSecretIv?: Buffer | null;
        previousSecretTag?: Buffer | null;
        previousSecretExpiresAt?: string | null;
      } = {
        id: row.subscription_id,
        tenantId: row.tenant_id,
        applicationId: row.application_id || '',
        endpointUrl: row.endpoint_url,
        secretHint: '',
        secretHash: '',
        subscribedEvents: [],
        status: 'active',
        consecutiveFailureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        secretCiphertext: parseBytea(row.secret_ciphertext),
        secretIv: parseBytea(row.secret_iv),
        secretTag: parseBytea(row.secret_tag),
        secretKeyVersion: row.secret_key_version,
        previousSecretCiphertext: row.previous_secret_ciphertext
          ? parseBytea(row.previous_secret_ciphertext)
          : null,
        previousSecretIv: row.previous_secret_iv ? parseBytea(row.previous_secret_iv) : null,
        previousSecretTag: row.previous_secret_tag ? parseBytea(row.previous_secret_tag) : null,
        previousSecretExpiresAt: row.previous_secret_expires_at || null,
      };

      let parsedPayload: Record<string, unknown> = {};
      try {
        parsedPayload = JSON.parse(row.payload_raw);
      } catch (_) {
        parsedPayload = {};
      }

      const event: WebhookEventModel = {
        id: row.event_id,
        tenantId: row.tenant_id,
        applicationId: row.application_id || '',
        eventType: row.event_type,
        payload: parsedPayload,
        payloadRaw: row.payload_raw,
        payloadSha256: row.payload_sha256,
        createdAt: new Date().toISOString(),
      };

      return {
        delivery,
        subscription,
        event,
        leaseToken: row.lease_token,
      };
    });
  }

  async completeDelivery(
    deliveryId: string,
    leaseToken: string,
    result: DispatchResult,
  ): Promise<{ updated: boolean; terminalStatus?: string }> {
    // 1. Fetch existing delivery with lease token verification
    const { data: existing, error: fetchErr } = await this.supabaseClient
      .from('webhook_deliveries')
      .select('id, attempt_count, subscription_id')
      .eq('id', deliveryId)
      .eq('lease_token', leaseToken)
      .maybeSingle();

    if (fetchErr || !existing) {
      return { updated: false };
    }

    const isSuccess = result.success;
    let nextStatus: string;
    let nextRetryAt: string | null = null;
    let nextAttemptCount = existing.attempt_count;

    if (isSuccess) {
      nextStatus = 'delivered';
    } else if (existing.attempt_count >= 5) {
      nextStatus = 'dead_letter';
    } else {
      nextStatus = 'retrying';
      nextAttemptCount = existing.attempt_count + 1;
      const retryDate = calculateNextRetryAt(existing.attempt_count);
      nextRetryAt = retryDate ? retryDate.toISOString() : null;
    }

    const { data, error } = await this.supabaseClient
      .from('webhook_deliveries')
      .update({
        status: nextStatus,
        attempt_count: nextAttemptCount,
        next_retry_at: nextRetryAt,
        http_status: result.httpStatus,
        execution_duration_ms: result.executionDurationMs,
        response_headers: result.responseHeaders,
        response_body_sample: result.responseBodySample,
        error_message: result.errorMessage || null,
        completed_at: isSuccess || nextStatus === 'dead_letter' ? new Date().toISOString() : null,
        lease_token: null,
        leased_until: null,
      })
      .eq('id', deliveryId)
      .eq('lease_token', leaseToken)
      .select('id, status');

    if (error || !data || data.length === 0) {
      return { updated: false };
    }

    // 2. Update subscription circuit-breaker status
    if (existing.subscription_id) {
      if (isSuccess) {
        await this.supabaseClient
          .from('webhook_subscriptions')
          .update({ consecutive_failure_count: 0 })
          .eq('id', existing.subscription_id);
      } else {
        const { data: sub } = await this.supabaseClient
          .from('webhook_subscriptions')
          .select('consecutive_failure_count')
          .eq('id', existing.subscription_id)
          .single();
        const failures = (sub?.consecutive_failure_count || 0) + 1;
        await this.supabaseClient
          .from('webhook_subscriptions')
          .update({
            consecutive_failure_count: failures,
            ...(failures >= 20 ? { status: 'failed' } : {}),
          })
          .eq('id', existing.subscription_id);
      }
    }

    return { updated: true, terminalStatus: data[0].status };
  }

  async recoverExpiredLeases(): Promise<number> {
    const { data, error } = await this.supabaseClient
      .from('webhook_deliveries')
      .update({
        status: 'queued',
        lease_token: null,
        leased_until: null,
      })
      .eq('status', 'leased')
      .lt('leased_until', new Date().toISOString())
      .select('id');

    if (error) return 0;
    return (data || []).length;
  }

  async purgeExpiredData(
    retentionDays = 30,
    batchSize = 1000,
  ): Promise<{ purgedDeliveries: number; purgedEvents: number }> {
    const { data, error } = await this.supabaseClient.rpc('fn_purge_expired_webhook_data', {
      p_retention_days: retentionDays,
      p_batch_size: batchSize,
    });

    if (error || !data || data.length === 0) {
      return { purgedDeliveries: 0, purgedEvents: 0 };
    }

    return {
      purgedDeliveries: data[0].purged_deliveries_count || 0,
      purgedEvents: data[0].purged_events_count || 0,
    };
  }
}
