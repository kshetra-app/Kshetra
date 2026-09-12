/**
 * Canonical API Error Hierarchy
 * Master Execution Framework — JOB W007
 */

import type { FastifyErrorEnvelope } from './types';

export class ApiError extends Error {
  readonly statusCode: number;
  readonly requestId?: string;
  readonly data?: unknown;

  constructor(message: string, statusCode: number, requestId?: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.requestId = requestId;
    this.data = data;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ApiNetworkError extends ApiError {
  constructor(message: string = 'Network connection failed', requestId?: string, originalError?: unknown) {
    super(message, 0, requestId, originalError);
    this.name = 'ApiNetworkError';
  }
}

export class ApiAuthError extends ApiError {
  constructor(message: string = 'Authentication required', statusCode: number = 401, requestId?: string) {
    super(message, statusCode, requestId);
    this.name = 'ApiAuthError';
  }
}

export class ApiTimeoutError extends ApiError {
  constructor(message: string = 'Request timed out', requestId?: string) {
    super(message, 408, requestId);
    this.name = 'ApiTimeoutError';
  }
}

export class ApiValidationError extends ApiError {
  constructor(message: string = 'Validation failed', statusCode: number = 400, requestId?: string, data?: unknown) {
    super(message, statusCode, requestId, data);
    this.name = 'ApiValidationError';
  }
}

export class ApiNotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', requestId?: string) {
    super(message, 404, requestId);
    this.name = 'ApiNotFoundError';
  }
}

export class ApiServerError extends ApiError {
  constructor(message: string = 'Internal server error', statusCode: number = 500, requestId?: string, data?: unknown) {
    super(message, statusCode, requestId, data);
    this.name = 'ApiServerError';
  }
}

export class ApiCorrelationError extends ApiError {
  constructor(message: string = 'Protocol error: correlation ID missing or mismatch', requestId?: string) {
    super(message, 500, requestId);
    this.name = 'ApiCorrelationError';
  }
}

/**
 * Maps HTTP status code and response payload into the appropriate ApiError subclass.
 */
export function createApiErrorFromResponse(
  statusCode: number,
  payload: unknown,
  headerRequestId?: string,
): ApiError {
  let message = `Request failed with status ${statusCode}`;
  let envelopeRequestId = headerRequestId;

  if (payload && typeof payload === 'object') {
    const env = payload as FastifyErrorEnvelope;
    if (env.message) {
      message = env.message;
    } else if (env.error) {
      message = env.error;
    }
    if (env.requestId) {
      envelopeRequestId = env.requestId;
    }
  } else if (typeof payload === 'string' && payload.length > 0) {
    message = payload;
  }

  if (statusCode === 401 || statusCode === 403) {
    return new ApiAuthError(message, statusCode, envelopeRequestId);
  }
  if (statusCode === 400 || statusCode === 422) {
    return new ApiValidationError(message, statusCode, envelopeRequestId, payload);
  }
  if (statusCode === 404) {
    return new ApiNotFoundError(message, envelopeRequestId);
  }
  if (statusCode === 408 || statusCode === 504) {
    return new ApiTimeoutError(message, envelopeRequestId);
  }
  if (statusCode >= 500) {
    return new ApiServerError(message, statusCode, envelopeRequestId, payload);
  }

  return new ApiError(message, statusCode, envelopeRequestId, payload);
}
