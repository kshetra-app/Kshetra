/**
 * PANIN W022 — dedicated outbound webhook dispatch worker.
 * Uses a dedicated PostgreSQL role and stored procedures only; never the Supabase service-role key.
 */
import { Pool } from 'pg';
import type { DispatchResult } from './webhookDispatcher';
import { dispatchWebhook, sanitizeResponseHeaders } from './webhookDispatcher';
import { decodeBytea, decryptSecret, getMasterEncryptionKey } from './crypto';

export interface WorkerQueryResult<Row = Record<string, unknown>> { rows: Row[]; }
export interface WorkerDatabase {
  query<Row = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<WorkerQueryResult<Row>>;
  end(): Promise<void>;
}
export interface WebhookWorkerOptions {
  batchSize?: number;
  leaseSeconds?: number;
  concurrency?: number;
  dispatch?: typeof dispatchWebhook;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}
export interface ClaimedWebhookRow {
  delivery_id: string;
  tenant_id: string;
  subscription_id: string;
  application_id: string;
  event_id: string;
  attempt_count: number;
  lease_token: string;
  leased_until: string | Date;
  endpoint_url: string;
  secret_ciphertext: Buffer | string;
  secret_iv: Buffer | string;
  secret_tag: Buffer | string;
  previous_secret_ciphertext: Buffer | string | null;
  previous_secret_iv: Buffer | string | null;
  previous_secret_tag: Buffer | string | null;
  previous_secret_expires_at: string | Date | null;
  event_type: string;
  event_payload: Record<string, unknown>;
  payload_raw: string;
  payload_sha256: string;
}

const sleepDefault = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number, name: string): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error('INVALID_WORKER_CONFIGURATION: ' + name + ' must be an integer from ' + minimum + ' to ' + maximum);
  }
  return parsed;
}

/** Enforce dedicated runtime identity and force TLS certificate validation. Never log the returned URL. */
export function normalizeWebhookWorkerConnectionString(raw: string): string {
  let url: URL;
  try { url = new URL(raw); }
  catch { throw new Error('INVALID_WORKER_DATABASE_URL: A valid PostgreSQL connection URL is required.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('INVALID_WORKER_DATABASE_URL: URL scheme must be postgres:// or postgresql://.');
  }
  let username = '';
  try { username = decodeURIComponent(url.username); }
  catch { throw new Error('INVALID_WORKER_DATABASE_URL: Invalid encoded database username.'); }
  if (username !== 'webhook_worker') {
    throw new Error('INVALID_WORKER_DATABASE_IDENTITY: WEBHOOK_WORKER_DATABASE_URL must authenticate as webhook_worker.');
  }
  if (!url.hostname || !url.pathname || url.pathname === '/' || !url.password) {
    throw new Error('INVALID_WORKER_DATABASE_URL: Host, database name, and password are required.');
  }
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  return url.toString();
}

export function createWebhookWorkerPool(connectionString = process.env.WEBHOOK_WORKER_DATABASE_URL): WorkerDatabase {
  if (!connectionString) throw new Error('FATAL_WORKER_CONFIGURATION: WEBHOOK_WORKER_DATABASE_URL is required.');
  getMasterEncryptionKey();
  const safeConnectionString = normalizeWebhookWorkerConnectionString(connectionString);
  return new Pool({
    connectionString: safeConnectionString,
    ssl: { rejectUnauthorized: true },
    max: 10,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
    query_timeout: 20000,
    application_name: 'panin-webhook-worker',
    keepAlive: true,
  }) as unknown as WorkerDatabase;
}

export class WebhookWorker {
  private readonly batchSize: number;
  private readonly leaseSeconds: number;
  private readonly concurrency: number;
  private readonly dispatch: typeof dispatchWebhook;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly database: WorkerDatabase, options: WebhookWorkerOptions = {}) {
    this.batchSize = options.batchSize ?? 10;
    this.leaseSeconds = options.leaseSeconds ?? 60;
    this.concurrency = options.concurrency ?? 10;
    if (!Number.isInteger(this.batchSize) || this.batchSize < 1 || this.batchSize > 20) {
      throw new Error('INVALID_WORKER_CONFIGURATION: batchSize must be 1..20.');
    }
    if (!Number.isInteger(this.leaseSeconds) || this.leaseSeconds < 15 || this.leaseSeconds > 300) {
      throw new Error('INVALID_WORKER_CONFIGURATION: leaseSeconds must be 15..300.');
    }
    if (!Number.isInteger(this.concurrency) || this.concurrency < 1 || this.concurrency > 20) {
      throw new Error('INVALID_WORKER_CONFIGURATION: concurrency must be 1..20.');
    }
    if (this.batchSize > this.concurrency) {
      throw new Error('INVALID_WORKER_CONFIGURATION: batchSize must not exceed concurrency so each claim can start before its lease ages.');
    }
    this.dispatch = options.dispatch ?? dispatchWebhook;
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? sleepDefault;
  }

  async runOnce(): Promise<number> {
    const result = await this.database.query<ClaimedWebhookRow>(
      'SELECT * FROM panin_webhook_worker.claim_webhook_batch($1::integer, $2::integer)',
      [this.batchSize, this.leaseSeconds],
    );
    const rows = result.rows ?? [];
    if (rows.length === 0) return 0;
    let nextIndex = 0;
    const runners = Array.from({ length: Math.min(this.concurrency, rows.length) }, async () => {
      while (nextIndex < rows.length) {
        const index = nextIndex++;
        await this.processClaimedDelivery(rows[index]);
      }
    });
    await Promise.all(runners);
    return rows.length;
  }

  private async processClaimedDelivery(row: ClaimedWebhookRow): Promise<void> {
    let result: DispatchResult;
    try {
      const tenantId = row.tenant_id;
      const subscriptionId = row.subscription_id;
      const secret = decryptSecret({
        ciphertext: decodeBytea(row.secret_ciphertext, 'secret_ciphertext'),
        iv: decodeBytea(row.secret_iv, 'secret_iv'),
        tag: decodeBytea(row.secret_tag, 'secret_tag'),
      }, tenantId, subscriptionId);

      let previousSecret: string | null = null;
      const previousExpiry = row.previous_secret_expires_at ? new Date(row.previous_secret_expires_at).getTime() : 0;
      if (
        row.previous_secret_ciphertext && row.previous_secret_iv && row.previous_secret_tag &&
        Number.isFinite(previousExpiry) && previousExpiry > this.now()
      ) {
        previousSecret = decryptSecret({
          ciphertext: decodeBytea(row.previous_secret_ciphertext, 'previous_secret_ciphertext'),
          iv: decodeBytea(row.previous_secret_iv, 'previous_secret_iv'),
          tag: decodeBytea(row.previous_secret_tag, 'previous_secret_tag'),
        }, tenantId, subscriptionId);
      }

      result = await this.dispatch({
        endpointUrl: row.endpoint_url,
        secret,
        previousSecret,
        eventId: row.event_id,
        deliveryId: row.delivery_id,
        payloadRaw: row.payload_raw,
        payloadSha256: row.payload_sha256,
      });
    } catch {
      result = {
        success: false, httpStatus: null, executionDurationMs: 0,
        requestHeaders: {}, responseHeaders: {}, responseBodySample: '',
        errorMessage: 'WEBHOOK_WORKER_JOB_FAILURE',
      };
    }

    try {
      const completionSql = [
        'SELECT * FROM panin_webhook_worker.complete_webhook_delivery(',
        '$1::uuid, $2::uuid, $3::boolean, $4::integer, $5::integer, $6::jsonb, $7::text, $8::text',
        ')',
      ].join(' ');
      const completion = await this.database.query<{ updated: boolean; terminal_status: string | null }>(
        completionSql,
        [
          row.delivery_id,
          row.lease_token,
          result.success,
          result.httpStatus,
          result.executionDurationMs,
          JSON.stringify(sanitizeResponseHeaders(result.responseHeaders)),
          result.responseBodySample.slice(0, 1024),
          result.errorMessage?.slice(0, 1024) ?? null,
        ],
      );
      const receipt = completion.rows?.[0];
      if (!receipt?.updated) {
        console.warn('[WebhookWorker] completion ignored: lease expired or token no longer current.');
      } else {
        console.info('[WebhookWorker] delivery ' + row.delivery_id + ' completed with status ' + (receipt.terminal_status ?? 'unknown') + '.');
      }
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : 'UNKNOWN';
      console.error('[WebhookWorker] completion database error (code ' + code + '); lease recovery will permit safe redelivery.');
    }
  }

  async run(shouldStop: () => boolean = () => false): Promise<void> {
    while (!shouldStop()) {
      try {
        const claimed = await this.runOnce();
        if (claimed === 0) await this.sleep(1000);
      } catch (error) {
        const code = error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : 'UNKNOWN';
        console.error('[WebhookWorker] poll error (code ' + code + '); retrying after backoff.');
        await this.sleep(2000);
      }
    }
  }
}

async function main(): Promise<void> {
  const database = createWebhookWorkerPool();
  const worker = new WebhookWorker(database, {
    batchSize: boundedInteger(process.env.WEBHOOK_WORKER_BATCH_SIZE, 10, 1, 20, 'WEBHOOK_WORKER_BATCH_SIZE'),
    leaseSeconds: boundedInteger(process.env.WEBHOOK_WORKER_LEASE_SECONDS, 60, 15, 300, 'WEBHOOK_WORKER_LEASE_SECONDS'),
    concurrency: boundedInteger(process.env.WEBHOOK_WORKER_CONCURRENCY, 10, 1, 20, 'WEBHOOK_WORKER_CONCURRENCY'),
  });
  let stopping = false;
  const stop = () => { stopping = true; };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try { await worker.run(() => stopping); }
  finally { await database.end(); }
}

if (require.main === module) {
  main().catch(() => {
    console.error('[WebhookWorker] startup failed; verify worker configuration and database privileges.');
    process.exitCode = 1;
  });
}
