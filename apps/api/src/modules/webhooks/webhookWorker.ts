/**
 * W022 background delivery worker.
 * Disabled by default and explicitly enabled with WEBHOOK_WORKER_ENABLED=true.
 */
import type { FastifyBaseLogger } from 'fastify';
import { webhookService, type WebhookService } from './webhookService';

export interface WebhookWorkerOptions {
  batchSize?: number;
  pollIntervalMs?: number;
}
type WorkerService = Pick<WebhookService, 'getQueueProvider' | 'dispatchPendingBatch'>;

export function startWebhookWorker(
  logger: FastifyBaseLogger,
  service: WorkerService = webhookService,
  options: WebhookWorkerOptions = {},
): () => Promise<void> {
  const batchSize = options.batchSize ?? 10;
  const pollIntervalMs = options.pollIntervalMs ?? 1000;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
    throw new Error('INVALID_WEBHOOK_WORKER_BATCH_SIZE: Expected an integer between 1 and 100.');
  }
  if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 100 || pollIntervalMs > 60000) {
    throw new Error('INVALID_WEBHOOK_WORKER_POLL_INTERVAL: Expected an integer between 100 and 60000 milliseconds.');
  }

  let stopping = false;
  let inFlight: Promise<void> | undefined;
  const tick = async (): Promise<void> => {
    if (stopping || inFlight) return;
    inFlight = (async () => {
      try {
        await service.getQueueProvider().recoverExpiredLeases();
        const result = await service.dispatchPendingBatch(batchSize);
        if (result.claimed > 0) {
          logger.info({ event: 'W022_WEBHOOK_BATCH_COMPLETED', ...result }, 'Webhook worker batch completed.');
        }
      } catch (err: unknown) {
        logger.error({ event: 'W022_WEBHOOK_WORKER_TICK_FAILED', err }, 'Webhook worker tick failed; delivery leases will recover after expiry.');
      } finally {
        inFlight = undefined;
      }
    })();
    await inFlight;
  };
  const timer = setInterval(() => { void tick(); }, pollIntervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  void tick();
  return async (): Promise<void> => {
    stopping = true;
    clearInterval(timer);
    if (inFlight) await inFlight;
  };
}
