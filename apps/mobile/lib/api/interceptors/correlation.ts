/**
 * Correlation & Telemetry Interceptor
 * Master Execution Framework — JOB W007
 * 
 * Enforces:
 * 1. Fastify genReqId compatible request IDs (RFC4122 v4 UUID or validated custom ID).
 * 2. Strict response correlation validation (fails closed with ApiCorrelationError).
 * 3. Privacy-preserving network breadcrumbs (ZERO Authorization headers or payload bodies).
 */

import { telemetry } from '../../telemetry';
import { ApiCorrelationError, ApiValidationError } from '../errors';

const REQUEST_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
const MAX_REQUEST_ID_LENGTH = 128;

/**
 * Validates or generates a Fastify-compliant correlation request ID.
 */
export function resolveRequestId(customRequestId?: string): string {
  if (customRequestId) {
    const trimmed = customRequestId.trim();
    if (!trimmed || trimmed.length > MAX_REQUEST_ID_LENGTH || !REQUEST_ID_REGEX.test(trimmed)) {
      throw new ApiValidationError(
        `Invalid customRequestId: must be 1-${MAX_REQUEST_ID_LENGTH} characters matching ${REQUEST_ID_REGEX}`,
        400,
      );
    }
    return trimmed;
  }
  return telemetry.generateRequestId();
}

/**
 * Injects tracing headers for Fastify compatibility.
 */
export function injectTracingHeaders(
  headers: Record<string, string>,
  requestId: string,
): Record<string, string> {
  return {
    ...headers,
    'x-request-id': requestId,
    'x-client-platform': 'mobile-react-native',
    'x-client-version': '0.1.0',
  };
}

/**
 * Validates that the server response echoed back the exact request ID.
 * Throws ApiCorrelationError on missing or mismatched ID.
 */
export function validateResponseCorrelation(
  responseHeaders: Headers,
  sentRequestId: string,
): string {
  const echoedId = responseHeaders.get('x-request-id');

  if (!echoedId) {
    throw new ApiCorrelationError(
      `Protocol error: server response missing mandatory x-request-id header (sent: ${sentRequestId})`,
      sentRequestId,
    );
  }

  if (echoedId !== sentRequestId) {
    throw new ApiCorrelationError(
      `Protocol error: correlation ID mismatch (sent: ${sentRequestId}, received: ${echoedId})`,
      sentRequestId,
    );
  }

  return echoedId;
}

/**
 * Records a privacy-safe network breadcrumb in mobile telemetry.
 * GUARANTEE: Never logs Authorization headers, bearer tokens, request bodies, or response bodies.
 */
export function recordNetworkBreadcrumb(
  method: string,
  path: string,
  statusCode: number,
  requestId: string,
  durationMs: number,
): void {
  // Strip any sensitive query parameters or URL credentials if present
  let sanitizedPath = path;
  try {
    const parsed = new URL(path, 'https://placeholder.local');
    // Drop known sensitive query keys if any
    parsed.searchParams.delete('token');
    parsed.searchParams.delete('secret');
    parsed.searchParams.delete('key');
    sanitizedPath = parsed.pathname + (parsed.search ? parsed.search : '');
  } catch {
    // Keep as is if relative
  }

  telemetry.addBreadcrumb({
    category: 'network',
    message: `${method.toUpperCase()} ${sanitizedPath} [${statusCode}]`,
    data: {
      method: method.toUpperCase(),
      path: sanitizedPath,
      statusCode,
      requestId,
      durationMs,
    },
  });
}
