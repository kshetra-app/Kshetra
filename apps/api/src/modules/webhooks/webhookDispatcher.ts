/**
 * apps/api/src/modules/webhooks/webhookDispatcher.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Egress Dispatcher with Socket Pinning, Strict Timeouts,
 * Stable Byte Transmission, and Bounded Response Capture.
 */

import http from 'node:http';
import https from 'node:https';
import { validateAndPinEgressTarget } from './antiSsrfGuard';
import { generateWebhookSignature, formatSignatureHeader, computePayloadSha256 } from './crypto';

export interface DispatchParams {
  endpointUrl: string;
  secret: string;
  previousSecret?: string | null;
  eventId: string;
  deliveryId: string;
  payloadRaw: string;
  payloadSha256?: string;
  mockDnsResolver?: (hostname: string) => Promise<string[]>;
  allowLocalhostInTest?: boolean;
}

export interface DispatchResult {
  success: boolean;
  httpStatus: number | null;
  executionDurationMs: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  responseBodySample: string;
  errorMessage?: string;
}

export const MAX_WEBHOOK_PAYLOAD_BYTES = 256 * 1024; // 256 KB max outbound payload
export const MAX_RESPONSE_SAMPLE_BYTES = 1024; // 1 KB max stored response sample
export const MAX_RESPONSE_STREAM_BYTES = 64 * 1024; // 64 KB max response stream before aborting socket

/**
 * Dispatches an outbound webhook HTTP POST request.
 * Transmits the exact persisted canonical UTF-8 bytes.
 */
export async function dispatchWebhook(params: DispatchParams): Promise<DispatchResult> {
  const startTime = Date.now();
  const timestamp = Math.floor(startTime / 1000);

  // 1. Enforce payload size limit & compute stable payload bytes & signature
  const bodyBuffer = Buffer.from(params.payloadRaw, 'utf8');
  if (bodyBuffer.length > MAX_WEBHOOK_PAYLOAD_BYTES) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      httpStatus: null,
      executionDurationMs: duration,
      requestHeaders: {},
      responseHeaders: {},
      responseBodySample: '',
      errorMessage: `PAYLOAD_SIZE_LIMIT_EXCEEDED: Payload length ${bodyBuffer.length} bytes exceeds maximum allowed limit of ${MAX_WEBHOOK_PAYLOAD_BYTES} bytes.`,
    };
  }

  const payloadSha256 = params.payloadSha256 || computePayloadSha256(bodyBuffer);

  const primarySig = generateWebhookSignature(params.secret, params.payloadRaw, timestamp);
  const previousSig = params.previousSecret
    ? generateWebhookSignature(params.previousSecret, params.payloadRaw, timestamp)
    : null;
  const signatureHeader = formatSignatureHeader(timestamp, primarySig, previousSig);

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': String(bodyBuffer.length),
    'User-Agent': 'PanIN-Webhook-Dispatcher/1.0 (+https://kshetra.app)',
    'X-PanIN-Signature': signatureHeader,
    'X-PanIN-Timestamp': String(timestamp),
    'X-PanIN-Event-ID': params.eventId,
    'X-PanIN-Delivery-ID': params.deliveryId,
    'X-PanIN-Payload-SHA256': payloadSha256,
  };

  // 2. Validate and pin egress target
  let target;
  try {
    target = await validateAndPinEgressTarget(params.endpointUrl, {
      mockDnsResolver: params.mockDnsResolver,
      allowLocalhostInTest: params.allowLocalhostInTest,
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      httpStatus: null,
      executionDurationMs: duration,
      requestHeaders,
      responseHeaders: {},
      responseBodySample: '',
      errorMessage: err.message || 'SSRF_VALIDATION_FAILED',
    };
  }

  // 3. Execute HTTP request with socket pinning
  return new Promise<DispatchResult>((resolve) => {
    const isHttps = target.parsedUrl.protocol.toLowerCase() === 'https:';
    const requestFn = isHttps ? https.request : http.request;

    const requestOptions = {
      method: 'POST',
      agent: target.agent,
      hostname: target.hostname,
      port: target.port,
      path: `${target.parsedUrl.pathname}${target.parsedUrl.search}`,
      headers: requestHeaders,
      timeout: 10000, // Total timeout 10 seconds
    };

    let settled = false;
    const finish = (result: DispatchResult) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };

    const req = requestFn(requestOptions, (res) => {
      const statusCode = res.statusCode || 0;
      const responseHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.headers)) {
        if (typeof v === 'string') {
          responseHeaders[k.toLowerCase()] = v;
        } else if (Array.isArray(v)) {
          responseHeaders[k.toLowerCase()] = v.join(', ');
        }
      }

      // Check for 3xx redirect: Strictly prohibited (no follow)
      if (statusCode >= 300 && statusCode < 400) {
        req.destroy();
        const duration = Date.now() - startTime;
        return finish({
          success: false,
          httpStatus: statusCode,
          executionDurationMs: duration,
          requestHeaders,
          responseHeaders,
          responseBodySample: '',
          errorMessage: 'REDIRECTS_FORBIDDEN: Endpoint returned redirect. Webhook dispatcher does not follow redirects.',
        });
      }

      const chunks: Buffer[] = [];
      let totalSampleBytes = 0;
      let totalStreamBytes = 0;

      res.on('data', (chunk: Buffer) => {
        totalStreamBytes += chunk.length;
        if (totalStreamBytes > MAX_RESPONSE_STREAM_BYTES) {
          // Abort socket to prevent runaway memory/streaming from malicious remote receiver
          res.destroy();
          return;
        }

        if (totalSampleBytes < MAX_RESPONSE_SAMPLE_BYTES) {
          const sliceSize = Math.min(chunk.length, MAX_RESPONSE_SAMPLE_BYTES - totalSampleBytes);
          chunks.push(chunk.subarray(0, sliceSize));
          totalSampleBytes += sliceSize;
        }
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;
        const responseBodySample = Buffer.concat(chunks).toString('utf8');
        const success = statusCode >= 200 && statusCode < 300;

        finish({
          success,
          httpStatus: statusCode,
          executionDurationMs: duration,
          requestHeaders,
          responseHeaders,
          responseBodySample,
          errorMessage: success ? undefined : `HTTP_STATUS_${statusCode}`,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const duration = Date.now() - startTime;
      finish({
        success: false,
        httpStatus: null,
        executionDurationMs: duration,
        requestHeaders,
        responseHeaders: {},
        responseBodySample: '',
        errorMessage: 'DELIVERY_TIMEOUT: Request timed out after 10000 ms',
      });
    });

    req.on('error', (err: any) => {
      const duration = Date.now() - startTime;
      finish({
        success: false,
        httpStatus: null,
        executionDurationMs: duration,
        requestHeaders,
        responseHeaders: {},
        responseBodySample: '',
        errorMessage: err.message || 'NETWORK_CONNECTION_ERROR',
      });
    });

    // Transmit exact persisted bytes
    req.write(bodyBuffer);
    req.end();
  });
}
