/**
 * Delimitation Share Card Routes (JOB 022)
 *
 * Authority: Master Product Blueprint & PLAN-DOMAIN-1-FOUNDATIONAL-GEOGRAPHY-AND-DELIMITATION-REV-1.0
 *
 * Exposes:
 * 1. POST /api/v1/delimitation/share - Generate immutable share snapshot
 * 2. GET  /api/v1/delimitation/share/:shareId - Retrieve JSON snapshot
 * 3. GET  /share/delimitation/:shareId - Public SSR HTML with Open Graph meta tags
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ApiSuccessEnvelope, CreateShareCardRequest } from '@kshetra/shared';
import { delimitationShareService } from '../services/delimitationShareService';
import { sendApiError } from '../lib/replyHelper';

function sendSuccess<T>(reply: FastifyReply, request: FastifyRequest, data: T, statusCode = 200) {
  const envelope: ApiSuccessEnvelope<T> = {
    success: true,
    data,
    requestId: request.id,
    timestamp: new Date().toISOString(),
  };
  return reply.status(statusCode).send(envelope);
}

export async function delimitationShareRoutes(app: FastifyInstance) {
  // 1. POST /api/v1/delimitation/share
  app.post<{ Body: CreateShareCardRequest }>(
    '/api/v1/delimitation/share',
    {
      schema: {
        body: {
          type: 'object',
          required: ['pinCode', 'stateCode', 'constituencyName', 'acNo'],
          properties: {
            pinCode: { type: 'string', pattern: '^[1-9][0-9]{5}$' },
            stateCode: { type: 'string', minLength: 2, maxLength: 10 },
            constituencyName: { type: 'string', minLength: 1 },
            acNo: { type: 'integer', minimum: 1, maximum: 1000 },
            impactType: { type: 'string' },
            headline: { type: 'string' },
            summary: { type: 'string' },
            domain: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const snapshot = await delimitationShareService.createShareCard(request.body);
        return sendSuccess(reply, request, snapshot, 201);
      } catch (err: any) {
        const statusCode = err.message.startsWith('INVALID') ? 400 : 500;
        return sendApiError(reply, request, statusCode, 'Bad Request', err.message);
      }
    },
  );

  // 2. GET /api/v1/delimitation/share/:shareId
  app.get<{ Params: { shareId: string } }>(
    '/api/v1/delimitation/share/:shareId',
    async (request, reply) => {
      const { shareId } = request.params;
      const snapshot = await delimitationShareService.getShareCard(shareId);
      if (!snapshot) {
        return sendApiError(reply, request, 404, 'Not Found', `Share card '${shareId}' was not found.`);
      }
      return sendSuccess(reply, request, snapshot);
    },
  );

  // 3. GET /share/delimitation/:shareId (SSR HTML)
  app.get<{ Params: { shareId: string } }>(
    '/share/delimitation/:shareId',
    async (request, reply) => {
      const { shareId } = request.params;
      const snapshot = await delimitationShareService.getShareCard(shareId);
      if (!snapshot) {
        return reply
          .status(404)
          .type('text/html')
          .send('<!DOCTYPE html><html><body><h1>404 - Share Card Not Found</h1><p>The requested delimitation share card does not exist.</p></body></html>');
      }
      const html = delimitationShareService.renderSSRHtml(snapshot);
      return reply.type('text/html').send(html);
    },
  );
}
