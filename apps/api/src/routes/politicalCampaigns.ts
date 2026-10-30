/**
 * Political Campaigns, Team RBAC & Geographic Intelligence Routes
 * Master Product Blueprint — Domain 6 (JOB 054, JOB 055, JOB 056)
 * Ratified under DEC-186
 */

import type { FastifyPluginAsync } from 'fastify';
import { campaignService } from '../services/campaignService';
import { sendApiError } from '../lib/replyHelper';
import type {
  CreatePoliticalCampaignInput,
  CampaignRole,
  ContentModality,
} from '@kshetra/shared';

export const politicalCampaignRoutes: FastifyPluginAsync = async (app) => {
  // Create Political Campaign Workspace (JOB 054)
  app.post<{ Body: CreatePoliticalCampaignInput }>(
    '/',
    async (request, reply) => {
      try {
        const campaign = await campaignService.createCampaign(request.body);
        return reply.code(201).send(campaign);
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'BadRequest', err.message);
      }
    },
  );

  // Get Campaign by ID
  app.get<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      try {
        const campaign = await campaignService.getCampaignById(request.params.id);
        if (!campaign) {
          return sendApiError(reply, request, 404, 'NotFound', `Campaign ${request.params.id} not found`);
        }
        return reply.send(campaign);
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'InternalError', err.message);
      }
    },
  );

  // List Campaigns by Constituency or Status
  app.get<{ Querystring: { targetConstituencyId?: string; status?: string } }>(
    '/',
    async (request, reply) => {
      try {
        const list = await campaignService.listCampaigns(request.query);
        return reply.send({ campaigns: list, total: list.length });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'InternalError', err.message);
      }
    },
  );

  // Add Team Member (RBAC: 5 Roles)
  app.post<{
    Params: { id: string };
    Body: { userId: string; userName: string; role: CampaignRole; userPhone?: string };
  }>(
    '/:id/members',
    async (request, reply) => {
      try {
        const member = await campaignService.addMember(request.params.id, request.body);
        return reply.code(201).send(member);
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'BadRequest', err.message);
      }
    },
  );

  // List Team Members
  app.get<{ Params: { id: string } }>(
    '/:id/members',
    async (request, reply) => {
      try {
        const members = await campaignService.getMembers(request.params.id);
        return reply.send({ members, total: members.length });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'InternalError', err.message);
      }
    },
  );

  // Query Campaign Geographic Intelligence (JOB 055)
  app.get<{ Params: { id: string }; Querystring: { userId?: string } }>(
    '/:id/intelligence',
    async (request, reply) => {
      try {
        const report = await campaignService.getGeographicIntelligence(
          request.params.id,
          request.query.userId,
        );
        return reply.send(report);
      } catch (err: any) {
        const isAuthError = err.message.includes('not authorized');
        const status = isAuthError ? 403 : 404;
        const errType = isAuthError ? 'Forbidden' : 'NotFound';
        return sendApiError(reply, request, status, errType, err.message);
      }
    },
  );

  // Create Campaign Content across modalities (JOB 056)
  app.post<{
    Params: { id: string };
    Body: {
      userId: string;
      userName: string;
      modality: ContentModality;
      title: string;
      bodyText?: string;
      mediaUrls?: string[];
      scheduledAt?: string;
      eventLocation?: string;
    };
  }>(
    '/:id/content',
    async (request, reply) => {
      try {
        const { userId, userName, ...input } = request.body;
        const item = await campaignService.createContent(
          request.params.id,
          { userId, userName },
          input,
        );
        return reply.code(201).send(item);
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'BadRequest', err.message);
      }
    },
  );

  // Submit Content for Review
  app.post<{ Params: { id: string; contentId: string }; Body: { userId: string } }>(
    '/:id/content/:contentId/submit',
    async (request, reply) => {
      try {
        const item = await campaignService.submitContentForReview(
          request.params.contentId,
          request.body.userId,
        );
        return reply.send(item);
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'BadRequest', err.message);
      }
    },
  );

  // Review Content (Approve or Reject)
  app.post<{
    Params: { id: string; contentId: string };
    Body: { userId: string; userName: string; role: CampaignRole; decision: 'APPROVED' | 'REJECTED'; note?: string };
  }>(
    '/:id/content/:contentId/review',
    async (request, reply) => {
      try {
        const { userId, userName, role, decision, note } = request.body;
        const item = await campaignService.reviewContent(
          request.params.contentId,
          { userId, userName, role },
          decision,
          note,
        );
        return reply.send(item);
      } catch (err: any) {
        const isMgrError = err.message.includes('Only campaign managers');
        const status = isMgrError ? 403 : 400;
        const errType = isMgrError ? 'Forbidden' : 'BadRequest';
        return sendApiError(reply, request, status, errType, err.message);
      }
    },
  );

  // Publish Approved Content
  app.post<{ Params: { id: string; contentId: string }; Body: { userId: string } }>(
    '/:id/content/:contentId/publish',
    async (request, reply) => {
      try {
        const item = await campaignService.publishContent(
          request.params.contentId,
          request.body.userId,
        );
        return reply.send(item);
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'BadRequest', err.message);
      }
    },
  );

  // List Campaign Content Items
  app.get<{ Params: { id: string } }>(
    '/:id/content',
    async (request, reply) => {
      try {
        const items = await campaignService.listContent(request.params.id);
        return reply.send({ content: items, total: items.length });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'InternalError', err.message);
      }
    },
  );
};
