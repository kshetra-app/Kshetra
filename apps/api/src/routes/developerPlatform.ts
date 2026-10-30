/**
 * Developer Platform & API Gateway Routes (JOB 062)
 *
 * Authority: Master Product Blueprint (Jobs 062-066), DEC-188, DEC-189
 * Exposes:
 * - Developer Organization Management & Team RBAC
 * - Cryptographic API Key Lifecycle (Create, List, Revoke)
 * - Real-Time Usage Telemetry & Ledger Aggregations
 * - Subscription Billing Checkout
 * - Interactive OpenAPI 3.1 Documentation & Swagger UI
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type {
  ApiSuccessEnvelope,
  CreateDeveloperOrgRequest,
  AddDeveloperOrgMemberRequest,
  CreateDeveloperApiKeyRequest,
  DeveloperBillingCheckoutRequest,
} from '@kshetra/shared';
import { developerPlatformService } from '../services/developerPlatformService';
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

export async function developerPlatformRoutes(app: FastifyInstance) {
  // 1. POST /api/v1/developer/organizations
  app.post<{ Body: CreateDeveloperOrgRequest }>(
    '/api/v1/developer/organizations',
    async (request, reply) => {
      try {
        if (!request.body?.name || !request.body?.billingEmail || !request.body?.adminUserId) {
          return sendApiError(reply, request, 400, 'BadRequest', 'name, billingEmail, and adminUserId are required');
        }
        const org = await developerPlatformService.createOrganization(request.body);
        return sendSuccess(reply, request, org, 201);
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'InternalError', err.message);
      }
    }
  );

  // 2. GET /api/v1/developer/organizations/:id
  app.get<{ Params: { id: string } }>(
    '/api/v1/developer/organizations/:id',
    async (request, reply) => {
      try {
        const org = await developerPlatformService.getOrganization(request.params.id);
        if (!org) {
          return sendApiError(reply, request, 404, 'NotFound', `Organization '${request.params.id}' not found`);
        }
        return sendSuccess(reply, request, org);
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'InternalError', err.message);
      }
    }
  );

  // 3. POST /api/v1/developer/organizations/:id/members
  app.post<{ Params: { id: string }; Body: AddDeveloperOrgMemberRequest }>(
    '/api/v1/developer/organizations/:id/members',
    async (request, reply) => {
      try {
        if (!request.body?.userId || !request.body?.role) {
          return sendApiError(reply, request, 400, 'BadRequest', 'userId and role are required');
        }
        const member = await developerPlatformService.addOrganizationMember(request.params.id, request.body);
        return sendSuccess(reply, request, member, 201);
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'InternalError', err.message);
      }
    }
  );

  // 4. GET /api/v1/developer/organizations/:id/members
  app.get<{ Params: { id: string } }>(
    '/api/v1/developer/organizations/:id/members',
    async (request, reply) => {
      try {
        const members = await developerPlatformService.listOrganizationMembers(request.params.id);
        return sendSuccess(reply, request, members);
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'InternalError', err.message);
      }
    }
  );

  // 5. POST /api/v1/developer/organizations/:id/keys
  app.post<{ Params: { id: string }; Body: { name: string; environment?: 'live' | 'test'; scopes?: string[] } }>(
    '/api/v1/developer/organizations/:id/keys',
    async (request, reply) => {
      try {
        if (!request.body?.name) {
          return sendApiError(reply, request, 400, 'BadRequest', 'Key name is required');
        }
        const req: CreateDeveloperApiKeyRequest = {
          organizationId: request.params.id,
          name: request.body.name,
          environment: request.body.environment,
          scopes: request.body.scopes,
        };
        const keyResponse = await developerPlatformService.createApiKey(req);
        return sendSuccess(reply, request, keyResponse, 201);
      } catch (err: any) {
        const statusCode = err.message.includes('limit reached') ? 403 : 500;
        return sendApiError(reply, request, statusCode, statusCode === 403 ? 'QuotaExceeded' : 'InternalError', err.message);
      }
    }
  );

  // 6. GET /api/v1/developer/organizations/:id/keys
  app.get<{ Params: { id: string } }>(
    '/api/v1/developer/organizations/:id/keys',
    async (request, reply) => {
      try {
        const keys = await developerPlatformService.listApiKeys(request.params.id);
        return sendSuccess(reply, request, keys);
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'InternalError', err.message);
      }
    }
  );

  // 7. POST /api/v1/developer/organizations/:id/keys/:keyId/revoke
  app.post<{ Params: { id: string; keyId: string } }>(
    '/api/v1/developer/organizations/:id/keys/:keyId/revoke',
    async (request, reply) => {
      try {
        const revoked = await developerPlatformService.revokeApiKey(request.params.keyId, request.params.id);
        if (!revoked) {
          return sendApiError(reply, request, 404, 'NotFound', 'Key not found or does not belong to organization');
        }
        return sendSuccess(reply, request, { revoked: true, keyId: request.params.keyId });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'InternalError', err.message);
      }
    }
  );

  // 8. GET /api/v1/developer/organizations/:id/usage
  app.get<{ Params: { id: string } }>(
    '/api/v1/developer/organizations/:id/usage',
    async (request, reply) => {
      try {
        const summary = await developerPlatformService.getUsageSummary(request.params.id);
        return sendSuccess(reply, request, summary);
      } catch (err: any) {
        return sendApiError(reply, request, 404, 'NotFound', err.message);
      }
    }
  );

  // 9. POST /api/v1/developer/organizations/:id/billing/checkout
  app.post<{ Params: { id: string }; Body: { targetTier: 'pro' | 'enterprise'; billingCycle: 'monthly' | 'annual' } }>(
    '/api/v1/developer/organizations/:id/billing/checkout',
    async (request, reply) => {
      try {
        const req: DeveloperBillingCheckoutRequest = {
          organizationId: request.params.id,
          targetTier: request.body.targetTier || 'pro',
          billingCycle: request.body.billingCycle || 'monthly',
        };
        const checkout = await developerPlatformService.createBillingCheckout(req);
        return sendSuccess(reply, request, checkout, 201);
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'InternalError', err.message);
      }
    }
  );

  // 10. GET /api/docs/json (OpenAPI 3.1 specification)
  app.get('/api/docs/json', async (request, reply) => {
    return reply.status(200).send(developerPlatformService.getOpenApiSpec());
  });

  // 11. GET /api/docs (Interactive Swagger UI HTML)
  app.get('/api/docs', async (request, reply) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Poligram Sovereign Developer API Docs (OpenAPI 3.1)</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; background: #0f172a; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui { filter: invert(88%) hue-rotate(180deg); }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/api/docs/json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
    return reply.type('text/html').send(html);
  });
}
