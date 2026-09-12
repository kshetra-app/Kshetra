import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ApiErrorEnvelope, ApiErrorDetail } from '@kshetra/shared';

export interface SendErrorOptions {
  code?: string;
  details?: ApiErrorDetail[];
}

/**
 * Sends a standardized Fastify error response conforming to the canonical ApiErrorEnvelope.
 * Guarantees that requestId, statusCode, error, message, and ISO timestamp are always present.
 */
export function sendApiError(
  reply: FastifyReply,
  request: FastifyRequest,
  statusCode: number,
  error: string,
  message: string,
  options?: SendErrorOptions
) {
  const envelope: ApiErrorEnvelope = {
    error,
    message,
    statusCode,
    requestId: request.id,
    timestamp: new Date().toISOString(),
    ...(options?.code ? { code: options.code } : {}),
    ...(options?.details ? { details: options.details } : {}),
  };
  return reply.status(statusCode).send(envelope);
}
