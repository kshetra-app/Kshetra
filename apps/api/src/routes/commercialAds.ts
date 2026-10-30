/**
 * Commercial Advertising, Local Merchant Portal, Serving Engine & Telemetry Routes
 * Master Product Blueprint — Domain 6 (JOB 058, JOB 059, JOB 060, JOB 061)
 * Ratified under DEC-186
 */

import type { FastifyPluginAsync } from 'fastify';
import { adService } from '../services/adService';
import { sendApiError } from '../lib/replyHelper';
import type {
  CreateCommercialAccountInput,
  CreateCommercialAdInput,
  AdPlacementSlot,
  AdTelemetryEventInput,
} from '@kshetra/shared';

export const commercialAdRoutes: FastifyPluginAsync = async (app) => {
  // Onboard Local Merchant Account (JOB 061 Step 1)
  app.post<{ Body: CreateCommercialAccountInput }>(
    '/accounts',
    async (request, reply) => {
      try {
        const account = await adService.createCommercialAccount(request.body);
        return reply.code(201).send(account);
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'BadRequest', err.message);
      }
    },
  );

  // Get Merchant Account
  app.get<{ Params: { id: string } }>(
    '/accounts/:id',
    async (request, reply) => {
      try {
        const account = await adService.getCommercialAccountById(request.params.id);
        if (!account) {
          return sendApiError(reply, request, 404, 'NotFound', `Commercial account ${request.params.id} not found`);
        }
        return reply.send(account);
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'InternalError', err.message);
      }
    },
  );

  // Recharge Merchant Prepaid Wallet (JOB 060 / JOB 061 Step 6)
  app.post<{ Params: { id: string }; Body: { amountInr: number } }>(
    '/accounts/:id/recharge',
    async (request, reply) => {
      try {
        const account = await adService.rechargeCommercialWallet(
          request.params.id,
          request.body.amountInr,
        );
        return reply.send(account);
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'BadRequest', err.message);
      }
    },
  );

  // Get Merchant GST Tax Invoices
  app.get<{ Params: { id: string } }>(
    '/accounts/:id/invoices',
    async (request, reply) => {
      try {
        const invoices = await adService.getInvoices(request.params.id);
        return reply.send({ invoices, total: invoices.length });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'InternalError', err.message);
      }
    },
  );

  // Create Commercial Ad Creative (JOB 058 / JOB 061 Step 3)
  app.post<{ Body: CreateCommercialAdInput }>(
    '/',
    async (request, reply) => {
      try {
        const ad = await adService.createCommercialAd(request.body);
        return reply.code(201).send(ad);
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'BadRequest', err.message);
      }
    },
  );

  // Serve Deterministic Ad matching Constituency & Placement Slot (JOB 058 Serving Engine)
  app.get<{
    Querystring: {
      constituencyId: string;
      placementSlot?: AdPlacementSlot;
      userSessionHash?: string;
    };
  }>(
    '/serve',
    async (request, reply) => {
      try {
        const { constituencyId, placementSlot = 'feed_inline', userSessionHash = 'anon-session' } = request.query;
        if (!constituencyId) {
          return sendApiError(reply, request, 400, 'BadRequest', 'Constituency ID is required to serve ads');
        }

        const ad = await adService.serveAd(constituencyId, placementSlot, userSessionHash);
        if (!ad) {
          return reply.code(204).send(); // No ad available for this slot/AC
        }
        return reply.send(ad);
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'InternalError', err.message);
      }
    },
  );

  // Record Ad Impression Telemetry with Signed ViewToken (JOB 059)
  app.post<{ Body: AdTelemetryEventInput }>(
    '/telemetry/impression',
    async (request, reply) => {
      try {
        const result = await adService.recordImpression(request.body);
        return reply.send(result);
      } catch (err: any) {
        return sendApiError(reply, request, 401, 'Unauthorized', err.message);
      }
    },
  );

  // Record Ad Click Telemetry with Anti-Fraud IVT Filtering (JOB 059)
  app.post<{ Body: AdTelemetryEventInput }>(
    '/telemetry/click',
    async (request, reply) => {
      try {
        const result = await adService.recordClick(request.body);
        return reply.send(result);
      } catch (err: any) {
        return sendApiError(reply, request, 401, 'Unauthorized', err.message);
      }
    },
  );

  // List Admin Pricing Configurations (JOB 060)
  app.get(
    '/pricing-configurations',
    async (_request, reply) => {
      try {
        const configs = await adService.listPricingConfigs();
        return reply.send({ configurations: configs, total: configs.length });
      } catch (err: any) {
        return sendApiError(reply, _request, 500, 'InternalError', err.message);
      }
    },
  );

  // Admin Update Pricing Configuration
  app.patch<{
    Params: { key: string };
    Body: { baseRateInr?: number; seasonalMultiplier?: number; isActive?: boolean };
  }>(
    '/pricing-configurations/:key',
    async (request, reply) => {
      try {
        const updated = await adService.updatePricingConfig(
          request.params.key,
          request.body,
        );
        return reply.send(updated);
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'BadRequest', err.message);
      }
    },
  );
};
