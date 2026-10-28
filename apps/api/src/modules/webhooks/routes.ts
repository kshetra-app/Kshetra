/**
 * apps/api/src/modules/webhooks/routes.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Fastify REST API Routes under /api/vsaas/v1/webhooks.
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import type { ApiSuccessEnvelope } from '@kshetra/shared';
import { sendApiError } from '../../lib/replyHelper';
import { webhookService } from './webhookService';
import { createWebhookBodySchema, updateWebhookBodySchema, webhookIdParamSchema } from './schemas';

function sendSaasSuccess<T>(
  reply: FastifyReply,
  request: FastifyRequest,
  data: T,
  statusCode = 200,
) {
  const envelope: ApiSuccessEnvelope<T> = {
    success: true,
    data,
    requestId: request.id,
    timestamp: new Date().toISOString(),
  };
  return reply.status(statusCode).send(envelope);
}

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Helper to verify authenticated SaaS context from saasAuthPlugin.
   */
  function getSaasContext(request: FastifyRequest, reply: FastifyReply) {
    const auth = request.saasAuth;
    if (!auth || !auth.tenantId || !auth.applicationId) {
      sendApiError(reply, request, 401, 'Unauthorized', 'Valid SaaS API key is required.', {
        code: 'UNAUTHORIZED_SAAS_KEY',
      });
      return null;
    }
    return auth;
  }

  // 1. POST /api/vsaas/v1/webhooks — Create webhook subscription
  fastify.post(
    '/',
    {
      schema: {
        body: createWebhookBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = getSaasContext(request, reply);
      if (!auth) return;

      const body = request.body as { endpointUrl: string; subscribedEvents?: string[] };

      try {
        const result = await webhookService.createSubscription({
          tenantId: auth.tenantId,
          applicationId: auth.applicationId,
          endpointUrl: body.endpointUrl,
          subscribedEvents: body.subscribedEvents,
          allowLocalhostInTest: process.env.NODE_ENV === 'test',
        });

        return sendSaasSuccess(reply, request, result, 201);
      } catch (err: any) {
        if (
          err.message?.includes('BLOCKED_PRIVATE_IP_ADDRESS') ||
          err.message?.includes('INVALID_WEBHOOK_URL')
        ) {
          return sendApiError(reply, request, 400, 'Bad Request', err.message, {
            code: 'SSRF_VALIDATION_FAILED',
          });
        }
        return sendApiError(reply, request, 400, 'Bad Request', err.message, {
          code: 'WEBHOOK_CREATION_FAILED',
        });
      }
    },
  );

  // 2. GET /api/vsaas/v1/webhooks — List subscriptions
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = getSaasContext(request, reply);
    if (!auth) return;

    try {
      const subscriptions = await webhookService.listSubscriptions(
        auth.tenantId,
        auth.applicationId,
      );
      return sendSaasSuccess(reply, request, { subscriptions, total: subscriptions.length });
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', err.message, {
        code: 'QUERY_FAILED',
      });
    }
  });

  // 3. GET /api/vsaas/v1/webhooks/:id — Get subscription detail
  fastify.get(
    '/:id',
    {
      schema: {
        params: webhookIdParamSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = getSaasContext(request, reply);
      if (!auth) return;

      const { id } = request.params as { id: string };

      try {
        const subscription = await webhookService.getSubscription(
          auth.tenantId,
          auth.applicationId,
          id,
        );
        if (!subscription) {
          return sendApiError(reply, request, 404, 'Not Found', 'Webhook subscription not found.', {
            code: 'WEBHOOK_NOT_FOUND',
          });
        }
        return sendSaasSuccess(reply, request, { subscription });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', err.message, {
          code: 'QUERY_FAILED',
        });
      }
    },
  );

  // 4. PATCH /api/vsaas/v1/webhooks/:id — Update subscription
  fastify.patch(
    '/:id',
    {
      schema: {
        params: webhookIdParamSchema,
        body: updateWebhookBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = getSaasContext(request, reply);
      if (!auth) return;

      const { id } = request.params as { id: string };
      const body = request.body as {
        endpointUrl?: string;
        subscribedEvents?: string[];
        status?: 'active' | 'paused' | 'disabled';
      };

      try {
        const updated = await webhookService.updateSubscription({
          tenantId: auth.tenantId,
          applicationId: auth.applicationId,
          subscriptionId: id,
          endpointUrl: body.endpointUrl,
          subscribedEvents: body.subscribedEvents,
          status: body.status,
          allowLocalhostInTest: process.env.NODE_ENV === 'test',
        });

        if (!updated) {
          return sendApiError(reply, request, 404, 'Not Found', 'Webhook subscription not found.', {
            code: 'WEBHOOK_NOT_FOUND',
          });
        }

        return sendSaasSuccess(reply, request, { subscription: updated });
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, {
          code: 'UPDATE_FAILED',
        });
      }
    },
  );

  // 5. POST /api/vsaas/v1/webhooks/:id/disable — Disable subscription
  fastify.post(
    '/:id/disable',
    {
      schema: {
        params: webhookIdParamSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = getSaasContext(request, reply);
      if (!auth) return;

      const { id } = request.params as { id: string };

      try {
        const disabled = await webhookService.disableSubscription(
          auth.tenantId,
          auth.applicationId,
          id,
        );
        if (!disabled) {
          return sendApiError(reply, request, 404, 'Not Found', 'Webhook subscription not found.', {
            code: 'WEBHOOK_NOT_FOUND',
          });
        }
        return sendSaasSuccess(reply, request, { subscription: disabled });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', err.message, {
          code: 'DISABLE_FAILED',
        });
      }
    },
  );

  // 6. POST /api/vsaas/v1/webhooks/:id/rotate-secret — Rotate signing secret
  fastify.post(
    '/:id/rotate-secret',
    {
      schema: {
        params: webhookIdParamSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = getSaasContext(request, reply);
      if (!auth) return;

      const { id } = request.params as { id: string };

      try {
        const rotated = await webhookService.rotateSecret(auth.tenantId, auth.applicationId, id);
        if (!rotated) {
          return sendApiError(reply, request, 404, 'Not Found', 'Webhook subscription not found.', {
            code: 'WEBHOOK_NOT_FOUND',
          });
        }
        return sendSaasSuccess(reply, request, rotated);
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', err.message, {
          code: 'ROTATION_FAILED',
        });
      }
    },
  );

  // 7. POST /api/vsaas/v1/webhooks/:id/test — Synchronous test delivery
  fastify.post(
    '/:id/test',
    {
      schema: {
        params: webhookIdParamSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = getSaasContext(request, reply);
      if (!auth) return;

      const { id } = request.params as { id: string };

      try {
        const deliveryResult = await webhookService.testDelivery(
          auth.tenantId,
          auth.applicationId,
          id,
          {
            allowLocalhostInTest: process.env.NODE_ENV === 'test',
          },
        );

        if (!deliveryResult) {
          return sendApiError(reply, request, 404, 'Not Found', 'Webhook subscription not found.', {
            code: 'WEBHOOK_NOT_FOUND',
          });
        }

        return sendSaasSuccess(reply, request, { delivery: deliveryResult });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', err.message, {
          code: 'TEST_DELIVERY_FAILED',
        });
      }
    },
  );

  // 8. POST /api/vsaas/v1/webhooks/events — Publish event (domain event emission)
  fastify.post('/events', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = getSaasContext(request, reply);
    if (!auth) return;

    const body = request.body as {
      eventType: string;
      idempotencyKey?: string;
      payload: Record<string, unknown>;
    };

    if (!body || !body.eventType || !body.payload) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        'Missing required eventType or payload.',
        {
          code: 'INVALID_EVENT_BODY',
        },
      );
    }

    try {
      const result = await webhookService.publishEvent({
        tenantId: auth.tenantId,
        applicationId: auth.applicationId,
        eventType: body.eventType,
        idempotencyKey: body.idempotencyKey,
        payload: body.payload,
      });

      return sendSaasSuccess(reply, request, result, result.deduplicated ? 200 : 201);
    } catch (err: any) {
      if (
        err.message?.includes('VALIDATION_ERROR') ||
        err.message?.includes('UNRECOGNIZED_PAYLOAD_FIELD')
      ) {
        return sendApiError(reply, request, 422, 'Unprocessable Entity', err.message, {
          code: 'PAYLOAD_VALIDATION_FAILED',
        });
      }
      return sendApiError(reply, request, 400, 'Bad Request', err.message, {
        code: 'EVENT_PUBLISH_FAILED',
      });
    }
  });
};
