/**
 * apps/api/src/modules/saasOnboarding/routes.ts
 *
 * Milestone W051 — B2B Political SaaS Customer Acquisition & Developer Portal
 * Fastify REST API routes for self-service signup, key management, billing, usage & docs.
 */

import path from 'node:path';
import fs from 'node:fs';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import type { ApiSuccessEnvelope } from '@kshetra/shared';
import YAML from 'yaml';
import { sendApiError } from '../../lib/replyHelper';
import { onboardingService } from './onboardingService';
import { billingService } from './billingService';
import { usageService } from './usageService';
import { renderDeveloperPortalHtml } from './docsHtml';
import {
  signupBodySchema,
  createApiKeyBodySchema,
  apiKeyIdParamSchema,
  checkoutBodySchema,
  verifyPaymentBodySchema,
} from './schemas';

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

export const saasOnboardingRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Helper to verify authenticated SaaS context from saasAuthPlugin.
   */
  function getSaasContext(request: FastifyRequest, reply: FastifyReply) {
    const auth = request.saasAuth;
    if (!auth || !auth.tenantId) {
      sendApiError(reply, request, 401, 'Unauthorized', 'Valid SaaS API key is required.', {
        code: 'UNAUTHORIZED_SAAS_KEY',
      });
      return null;
    }
    return auth;
  }

  // ============================================================================
  // 1. PUBLIC SELF-SERVICE SIGNUP & ONBOARDING
  // ============================================================================
  app.post('/api/vsaas/v1/auth/signup', async (request, reply) => {
    const parseResult = signupBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        parseResult.error.errors[0]?.message || 'Invalid signup parameters',
        {
          code: 'VALIDATION_ERROR',
          details: parseResult.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
      );
    }

    try {
      const result = await onboardingService.signup(parseResult.data);
      return sendSaasSuccess(reply, request, result, 201);
    } catch (err: any) {
      request.log.error({ err }, 'Error during partner self-service signup');
      const statusCode = err.statusCode || 500;
      const errorText = statusCode === 400 ? 'Bad Request' : statusCode === 403 ? 'Forbidden' : 'Internal Server Error';
      return sendApiError(
        reply,
        request,
        statusCode,
        errorText,
        err.message || 'Failed to complete partner onboarding. Please try again.',
        { code: err.code || 'SIGNUP_FAILED' },
      );
    }
  });

  // ============================================================================
  // 2. COMPREHENSIVE API KEY LIFECYCLE MANAGEMENT
  // ============================================================================
  app.get('/api/vsaas/v1/auth/keys', async (request, reply) => {
    const auth = getSaasContext(request, reply);
    if (!auth) return;

    try {
      const keys = await onboardingService.listApiKeys(auth.tenantId);
      return sendSaasSuccess(reply, request, keys);
    } catch (err: any) {
      request.log.error({ err, tenantId: auth.tenantId }, 'Error listing tenant API keys');
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to retrieve API keys');
    }
  });

  app.post('/api/vsaas/v1/auth/keys', async (request, reply) => {
    const auth = getSaasContext(request, reply);
    if (!auth) return;

    const parseResult = createApiKeyBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        parseResult.error.errors[0]?.message || 'Invalid API key parameters',
        {
          code: 'VALIDATION_ERROR',
          details: parseResult.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
      );
    }

    try {
      const newKey = await onboardingService.createApiKey(auth.tenantId, parseResult.data);
      return sendSaasSuccess(reply, request, newKey, 201);
    } catch (err: any) {
      request.log.error({ err, tenantId: auth.tenantId }, 'Error generating tenant API key');
      const statusCode = err.statusCode || 500;
      const errorText = statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'Not Found' : statusCode === 400 ? 'Bad Request' : 'Internal Server Error';
      return sendApiError(
        reply,
        request,
        statusCode,
        errorText,
        err.message || 'Failed to generate API key',
        { code: err.code || 'KEY_GENERATION_FAILED' },
      );
    }
  });

  app.delete('/api/vsaas/v1/auth/keys/:id', async (request, reply) => {
    const auth = getSaasContext(request, reply);
    if (!auth) return;

    const parseResult = apiKeyIdParamSchema.safeParse(request.params);
    if (!parseResult.success) {
      return sendApiError(reply, request, 400, 'Bad Request', 'Invalid API key ID parameter format');
    }

    try {
      const result = await onboardingService.revokeApiKey(auth.tenantId, parseResult.data.id);
      return sendSaasSuccess(reply, request, result);
    } catch (err: any) {
      request.log.error({ err, tenantId: auth.tenantId }, 'Error revoking API key');
      const statusCode = err.statusCode || 500;
      const errorText = statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'Not Found' : 'Internal Server Error';
      return sendApiError(
        reply,
        request,
        statusCode,
        errorText,
        err.message || 'Failed to revoke API key',
        { code: err.code || 'KEY_REVOCATION_FAILED' },
      );
    }
  });

  // ============================================================================
  // 3. COMMERCIAL PLANS & BILLING SUBSCRIPTIONS
  // ============================================================================
  app.get('/api/vsaas/v1/billing/plans', async (request, reply) => {
    const plans = billingService.getPlans();
    return sendSaasSuccess(reply, request, plans);
  });

  app.post('/api/vsaas/v1/billing/checkout', async (request, reply) => {
    const auth = getSaasContext(request, reply);
    if (!auth) return;

    const parseResult = checkoutBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        parseResult.error.errors[0]?.message || 'Invalid checkout parameters',
      );
    }

    try {
      const checkoutResult = await billingService.createCheckoutSession(auth.tenantId, parseResult.data);
      return sendSaasSuccess(reply, request, checkoutResult);
    } catch (err: any) {
      request.log.error({ err, tenantId: auth.tenantId }, 'Error creating billing checkout order');
      return sendApiError(
        reply,
        request,
        err.statusCode || 500,
        err.code || 'CHECKOUT_FAILED',
        err.message || 'Failed to initiate checkout order',
      );
    }
  });

  app.post('/api/vsaas/v1/billing/verify', async (request, reply) => {
    const auth = getSaasContext(request, reply);
    if (!auth) return;

    const parseResult = verifyPaymentBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendApiError(
        reply,
        request,
        400,
        'Bad Request',
        parseResult.error.errors[0]?.message || 'Invalid payment verification parameters',
      );
    }

    try {
      const verifyResult = await billingService.verifyPayment(auth.tenantId, parseResult.data);
      return sendSaasSuccess(reply, request, verifyResult);
    } catch (err: any) {
      request.log.error({ err, tenantId: auth.tenantId }, 'Error verifying payment signature');
      return sendApiError(
        reply,
        request,
        err.statusCode || 400,
        err.code || 'PAYMENT_VERIFICATION_FAILED',
        err.message || 'Payment signature verification failed',
      );
    }
  });

  app.post('/api/vsaas/v1/billing/webhook', async (request, reply) => {
    const signature =
      (request.headers['x-razorpay-signature'] as string) ||
      (request.headers['stripe-signature'] as string) ||
      '';

    const rawBody =
      typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body);

    try {
      const result = await billingService.processInboundWebhook(rawBody, signature, request.body);
      return reply.status(200).send({ received: true, ...result });
    } catch (err: any) {
      request.log.warn({ err }, 'Inbound billing webhook verification failed');
      return sendApiError(
        reply,
        request,
        err.statusCode || 400,
        err.code || 'WEBHOOK_VERIFICATION_FAILED',
        err.message || 'Invalid webhook signature',
      );
    }
  });

  // ============================================================================
  // 4. USAGE & QUOTA TELEMETRY
  // ============================================================================
  app.get('/api/vsaas/v1/account/usage', async (request, reply) => {
    const auth = getSaasContext(request, reply);
    if (!auth) return;

    try {
      const usage = await usageService.getUsageMetrics(auth.tenantId);
      return sendSaasSuccess(reply, request, usage);
    } catch (err: any) {
      request.log.error({ err, tenantId: auth.tenantId }, 'Error fetching tenant usage metrics');
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Failed to retrieve usage metrics');
    }
  });

  // ============================================================================
  // 5. DEVELOPER PORTAL & OPENAPI 3.1 SPECIFICATION
  // ============================================================================
  app.get('/api/vsaas/v1/docs', async (_request, reply) => {
    reply.header('Content-Type', 'text/html; charset=utf-8');
    return reply.send(renderDeveloperPortalHtml());
  });

  app.get('/api/vsaas/v1/openapi.yaml', async (_request, reply) => {
    const specPath = path.resolve(__dirname, '../../../openapi-saas-v1.yaml');
    if (fs.existsSync(specPath)) {
      const content = fs.readFileSync(specPath, 'utf8');
      reply.header('Content-Type', 'text/yaml; charset=utf-8');
      return reply.send(content);
    }
    return sendApiError(reply, _request, 404, 'Not Found', 'OpenAPI YAML specification file not found');
  });

  app.get('/api/vsaas/v1/openapi.json', async (_request, reply) => {
    const specPath = path.resolve(__dirname, '../../../openapi-saas-v1.yaml');
    if (fs.existsSync(specPath)) {
      const content = fs.readFileSync(specPath, 'utf8');
      try {
        const parsed = YAML.parse(content);
        return reply.status(200).send(parsed);
      } catch (err) {
        return sendApiError(reply, _request, 500, 'Parse Error', 'Failed to parse OpenAPI specification to JSON');
      }
    }
    return sendApiError(reply, _request, 404, 'Not Found', 'OpenAPI specification file not found');
  });
};
