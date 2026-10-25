/**
 * W022 durable webhook worker. Delivery is opt-in; secrets and payloads are not logged.
 */
import type { FastifyBaseLogger } from 'fastify';
import type { DispatchParams, DispatchResult } from './webhookDispatcher';
import { dispatchWebhook } from './webhookDispatcher';
import type { WebhookQueueProvider } from './queueProvider';

export type WebhookDispatchFunction = (params: DispatchParams) => Promise<DispatchResult>;
export interface WebhookWorkerOutcome {
  deliveryId: string; updated: boolean; terminalStatus?: string; success: boolean; errorMessage?: string;
}
export async function runWebhookWorkerBatch(
  provider: WebhookQueueProvider, batchSize = 10, dispatch: WebhookDispatchFunction = dispatchWebhook
): Promise<WebhookWorkerOutcome[]> {
  const jobs = await provider.claimBatch(batchSize);
  return Promise.all(jobs.map(async (job): Promise<WebhookWorkerOutcome> => {
    let result: DispatchResult;
    if (job.secretError || !job.secret) {
      result = { success: false, httpStatus: null, executionDurationMs: 0, requestHeaders: {}, responseHeaders: {},
        responseBodySample: '', errorMessage: job.secretError ?? 'WEBHOOK_SECRET_UNAVAILABLE' };
    } else {
      try {
        result = await dispatch({ endpointUrl: job.subscription.endpointUrl, secret: job.secret,
          previousSecret: job.previousSecret, eventId: job.event.id, deliveryId: job.delivery.id,
          payloadRaw: job.event.payloadRaw, payloadSha256: job.event.payloadSha256 });
      } catch (error) {
        result = { success: false, httpStatus: null, executionDurationMs: 0, requestHeaders: {}, responseHeaders: {},
          responseBodySample: '', errorMessage: error instanceof Error ? error.message : 'WEBHOOK_DISPATCH_FAILED' };
      }
    }
    const completion = await provider.completeDelivery(job.delivery.id, job.leaseToken, result);
    return { deliveryId: job.delivery.id, updated: completion.updated,
      ...(completion.terminalStatus ? { terminalStatus: completion.terminalStatus } : {}),
      success: result.success, ...(result.errorMessage ? { errorMessage: result.errorMessage } : {}) };
  }));
}
export function startWebhookWorker(
  provider: WebhookQueueProvider, logger: FastifyBaseLogger,
  options: { pollIntervalMs?: number; batchSize?: number } = {}
): () => void {
  const pollIntervalMs = options.pollIntervalMs ?? 2000;
  const batchSize = options.batchSize ?? 10;
  if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 250 || pollIntervalMs > 60000 ||
      !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) throw new Error('INVALID_WEBHOOK_WORKER_CONFIGURATION');
  let closed = false, running = false, lastRecoveryAt = 0;
  const tick = async (): Promise<void> => {
    if (closed || running) return;
    running = true;
    try {
      if (Date.now() - lastRecoveryAt >= 30000) {
        const recovered = await provider.recoverExpiredLeases();
        lastRecoveryAt = Date.now();
        if (recovered > 0) logger.info({ recovered }, 'W022 recovered expired webhook leases');
      }
      const outcomes = await runWebhookWorkerBatch(provider, batchSize);
      if (outcomes.length > 0) logger.info({
        claimed: outcomes.length, delivered: outcomes.filter(x => x.updated && x.success).length,
        completionRejected: outcomes.filter(x => !x.updated).length,
      }, 'W022 webhook batch processed');
    } catch (error) { logger.error({ err: error }, 'W022 webhook worker iteration failed'); }
    finally { running = false; }
  };
  const timer = setInterval(() => { void tick(); }, pollIntervalMs);
  timer.unref(); void tick();
  return () => { closed = true; clearInterval(timer); };
}
