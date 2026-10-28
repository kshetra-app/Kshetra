/**
 * apps/api/src/workers/webhookWorker.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Persistent Background Queue Worker
 *
 * Capabilities:
 * - Claims batches using atomic fn_claim_webhook_batch (FOR UPDATE SKIP LOCKED)
 * - Converts flat database rows into strongly typed models
 * - Decrypts subscription secrets using AES-256-GCM with tenant/subscription AAD
 * - Respects previous-secret grace-period expiry
 * - Dispatches via SSRF-guarded HTTP dispatcher with strict timeout bounds
 * - Persists outcomes using lease-token-fenced completion
 * - Recovers expired leases and handles bounded failures
 * - Applies bounded concurrency, observable logging, and graceful shutdown (SIGINT/SIGTERM)
 */

import { supabase } from '../lib/supabase';
import {
  type WebhookQueueProvider,
  type LeasedDeliveryJob,
  PostgresQueueProvider,
  InMemoryQueueProvider,
} from '../modules/webhooks/queueProvider';
import { decryptSecret, getMasterEncryptionKey } from '../modules/webhooks/crypto';
import { dispatchWebhook, type DispatchResult } from '../modules/webhooks/webhookDispatcher';

export interface WebhookWorkerOptions {
  queueProvider?: WebhookQueueProvider;
  batchSize?: number;
  pollIntervalMs?: number;
  leaseSeconds?: number;
  concurrency?: number;
  allowLocalhostInTest?: boolean;
  onJobProcessed?: (job: LeasedDeliveryJob, result: DispatchResult) => void;
}

export class WebhookWorker {
  private queueProvider: WebhookQueueProvider;
  private batchSize: number;
  private pollIntervalMs: number;
  private leaseSeconds: number;
  private concurrency: number;
  private allowLocalhostInTest: boolean;
  private onJobProcessed?: (job: LeasedDeliveryJob, result: DispatchResult) => void;

  private isRunning = false;
  private stopRequested = false;
  private activeJobs = new Set<Promise<any>>();
  private loopPromise: Promise<void> | null = null;
  private lastLeaseRecoveryAt = 0;

  constructor(options: WebhookWorkerOptions = {}) {
    if (options.queueProvider) {
      this.queueProvider = options.queueProvider;
    } else if (process.env.NODE_ENV === 'test') {
      this.queueProvider = new InMemoryQueueProvider();
    } else {
      if (!process.env.DATABASE_URL) {
        throw new Error(
          'CONFIG_ERROR: DATABASE_URL must be configured for WebhookWorker in non-test mode',
        );
      }
      getMasterEncryptionKey();
      this.queueProvider = new PostgresQueueProvider(supabase);
    }

    this.batchSize = options.batchSize || Number(process.env.WEBHOOK_WORKER_BATCH_SIZE) || 10;
    this.pollIntervalMs =
      options.pollIntervalMs || Number(process.env.WEBHOOK_WORKER_POLL_INTERVAL_MS) || 1000;
    this.leaseSeconds = options.leaseSeconds || 30;
    this.concurrency = options.concurrency || 5;
    this.allowLocalhostInTest = options.allowLocalhostInTest ?? process.env.NODE_ENV === 'test';
    this.onJobProcessed = options.onJobProcessed;
  }

  public getQueueProvider(): WebhookQueueProvider {
    return this.queueProvider;
  }

  public isActive(): boolean {
    return this.isRunning;
  }

  public getActiveJobCount(): number {
    return this.activeJobs.size;
  }

  /**
   * Starts the continuous background polling worker loop.
   */
  public start(): Promise<void> {
    if (this.isRunning) return Promise.resolve();

    this.isRunning = true;
    this.stopRequested = false;
    console.log(
      `[WebhookWorker] Started background worker (PID: ${process.pid}, BatchSize: ${this.batchSize}, PollInterval: ${this.pollIntervalMs}ms)`,
    );

    this.loopPromise = this.runLoop();
    return Promise.resolve();
  }

  /**
   * Gracefully requests the worker to stop and awaits in-flight dispatches.
   */
  public async stop(graceTimeoutMs = 5000): Promise<void> {
    if (!this.isRunning) return;

    console.log('[WebhookWorker] Initiating graceful shutdown...');
    this.stopRequested = true;

    if (this.loopPromise) {
      await Promise.race([
        this.loopPromise,
        new Promise((resolve) => setTimeout(resolve, graceTimeoutMs)),
      ]);
    }

    // Await any remaining active jobs
    if (this.activeJobs.size > 0) {
      console.log(`[WebhookWorker] Awaiting ${this.activeJobs.size} active delivery jobs...`);
      await Promise.race([
        Promise.all(Array.from(this.activeJobs)),
        new Promise((resolve) => setTimeout(resolve, graceTimeoutMs)),
      ]);
    }

    this.isRunning = false;
    console.log('[WebhookWorker] Shutdown complete.');
  }

  /**
   * Executes a single polling and dispatch tick (useful for test orchestration).
   */
  public async tick(): Promise<number> {
    // 1. Periodically recover expired leases (every 60 seconds)
    const now = Date.now();
    if (now - this.lastLeaseRecoveryAt > 60000) {
      try {
        const recovered = await this.queueProvider.recoverExpiredLeases();
        if (recovered > 0) {
          console.log(`[WebhookWorker] Recovered ${recovered} expired leases.`);
        }
        this.lastLeaseRecoveryAt = now;
      } catch (err: any) {
        console.error('[WebhookWorker] Lease recovery failed:', err.message);
      }
    }

    // 2. Claim batch of claimable deliveries
    let jobs: LeasedDeliveryJob[];
    try {
      jobs = await this.queueProvider.claimBatch(this.batchSize);
    } catch (claimErr: any) {
      console.error('[WebhookWorker] Batch claim failed:', claimErr.message);
      return 0;
    }

    if (!jobs || jobs.length === 0) {
      return 0;
    }

    // 3. Process jobs with bounded concurrency
    const chunks: LeasedDeliveryJob[][] = [];
    for (let i = 0; i < jobs.length; i += this.concurrency) {
      chunks.push(jobs.slice(i, i + this.concurrency));
    }

    for (const chunk of chunks) {
      if (this.stopRequested) break;

      const promises = chunk.map((job) => {
        const p = this.processDeliveryJob(job).finally(() => {
          this.activeJobs.delete(p);
        });
        this.activeJobs.add(p);
        return p;
      });

      await Promise.all(promises);
    }

    return jobs.length;
  }

  /**
   * Processes a single claimed delivery job end-to-end.
   */
  public async processDeliveryJob(job: LeasedDeliveryJob): Promise<DispatchResult> {
    const { delivery, subscription, event, leaseToken } = job;
    let primarySecret: string;
    let previousSecret: string | null = null;

    try {
      // 1. Decrypt signing secret using AES-256-GCM with tenant/subscription AAD
      if (subscription.secretCiphertext && subscription.secretIv && subscription.secretTag) {
        primarySecret = decryptSecret(
          {
            ciphertext: subscription.secretCiphertext,
            iv: subscription.secretIv,
            tag: subscription.secretTag,
          },
          delivery.tenantId,
          delivery.subscriptionId,
        );
      } else if (subscription.rawSecret) {
        primarySecret = subscription.rawSecret;
      } else {
        throw new Error(
          'MISSING_SECRET_CIPHERTEXT: Subscription ciphertext or rawSecret is missing',
        );
      }

      // Check previous secret grace period
      if (
        subscription.previousSecretCiphertext &&
        subscription.previousSecretIv &&
        subscription.previousSecretTag &&
        subscription.previousSecretExpiresAt
      ) {
        const expiry = new Date(subscription.previousSecretExpiresAt).getTime();
        if (expiry > Date.now()) {
          try {
            previousSecret = decryptSecret(
              {
                ciphertext: subscription.previousSecretCiphertext,
                iv: subscription.previousSecretIv,
                tag: subscription.previousSecretTag,
              },
              delivery.tenantId,
              delivery.subscriptionId,
            );
          } catch (prevErr: any) {
            console.warn(
              `[WebhookWorker] Failed to decrypt previous secret for sub ${subscription.id}: ${prevErr.message}`,
            );
          }
        }
      }

      // 2. Dispatch via SSRF-guarded HTTP dispatcher
      const dispatchResult = await dispatchWebhook({
        endpointUrl: subscription.endpointUrl,
        secret: primarySecret,
        previousSecret,
        eventId: event.id,
        deliveryId: delivery.id,
        payloadRaw: event.payloadRaw,
        payloadSha256: event.payloadSha256,
        allowLocalhostInTest: this.allowLocalhostInTest,
      });

      // 3. Complete delivery with lease-token fence
      const completion = await this.queueProvider.completeDelivery(
        delivery.id,
        leaseToken,
        dispatchResult,
      );
      if (!completion.updated) {
        console.warn(
          `[WebhookWorker] Lease token fencing dropped stale completion for delivery ${delivery.id}`,
        );
      }

      if (this.onJobProcessed) {
        this.onJobProcessed(job, dispatchResult);
      }

      return dispatchResult;
    } catch (err: any) {
      console.error(
        `[WebhookWorker] Unhandled error processing delivery ${delivery.id}:`,
        err.message,
      );

      const errorResult: DispatchResult = {
        success: false,
        httpStatus: null,
        executionDurationMs: 0,
        requestHeaders: {},
        responseHeaders: {},
        responseBodySample: '',
        errorMessage: err.message || 'UNHANDLED_WORKER_ERROR',
      };

      try {
        await this.queueProvider.completeDelivery(delivery.id, leaseToken, errorResult);
      } catch (completeErr: any) {
        console.error(
          `[WebhookWorker] Failed to record error state for delivery ${delivery.id}:`,
          completeErr.message,
        );
      }

      if (this.onJobProcessed) {
        this.onJobProcessed(job, errorResult);
      }

      return errorResult;
    }
  }

  private async runLoop(): Promise<void> {
    while (this.isRunning && !this.stopRequested) {
      try {
        const processedCount = await this.tick();
        if (processedCount === 0 && !this.stopRequested) {
          await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
        }
      } catch (loopErr: any) {
        console.error('[WebhookWorker] Error in worker loop tick:', loopErr.message);
        if (!this.stopRequested) {
          await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
        }
      }
    }
  }
}

// ─── STANDALONE WORKER ENTRYPOINT ───

export function startStandaloneWorker(): WebhookWorker {
  const worker = new WebhookWorker();

  const shutdown = async (signal: string) => {
    console.log(`\n[WebhookWorker] Received ${signal}. Shutting down gracefully...`);
    await worker.stop(5000);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  worker.start().catch((err) => {
    console.error('[WebhookWorker] Fatal worker startup error:', err);
    process.exit(1);
  });

  return worker;
}

// Auto-run if executed directly as entrypoint
if (typeof require !== 'undefined' && require.main === module) {
  startStandaloneWorker();
}
