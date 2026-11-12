/**
 * Public Web Discovery, SEO & Twin JSON API Routes (JOB 063)
 *
 * Authority: Master Product Blueprint (Jobs 062-066), DEC-188, DEC-189
 * Exposes:
 * - Server-Side Rendered (SSR) HTML pages with OpenGraph, Twitter Cards, Schema.org JSON-LD
 * - Twin Headless JSON API endpoints for standalone Next.js/React frontend consumption (DEC-189 Option B)
 * - Canonical XML Sitemaps (/sitemap.xml, /sitemap-geography.xml)
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ApiSuccessEnvelope } from '@kshetra/shared';
import { PublicWebDataUnavailableError, publicWebService } from '../services/publicWebService';
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

function sendUnavailable(
  reply: FastifyReply,
  request: FastifyRequest,
  error: unknown,
  html = false,
) {
  if (!(error instanceof PublicWebDataUnavailableError)) throw error;
  request.log.warn({ code: error.code }, 'Public web data is unavailable');
  if (html) {
    return reply
      .status(503)
      .type('text/html')
      .send(
        '<!doctype html><html lang="en"><head><title>Data unavailable</title></head><body><main><h1>Data temporarily unavailable</h1><p>Public data cannot be loaded right now. Please try again later.</p></main></body></html>',
      );
  }
  reply.type('application/json');
  return sendApiError(
    reply,
    request,
    503,
    'Service Unavailable',
    'Public data cannot be loaded right now.',
    {
      code: error.code,
    },
  );
}

export async function publicWebRoutes(app: FastifyInstance) {
  // ==============================================================================
  // 1. CANONICAL SSR HTML PAGES (DEC-189 OPTION A)
  // ==============================================================================

  // A. GET /public/states/:stateCode (SSR HTML)
  app.get<{ Params: { stateCode: string } }>(
    '/public/states/:stateCode',
    async (request, reply) => {
      try {
        const state = await publicWebService.getStateOverview(request.params.stateCode);
        if (!state) {
          return reply.status(404).type('text/html').send('<h1>State not found</h1>');
        }
        return reply.type('text/html').send(publicWebService.renderStateHtml(state));
      } catch (error) {
        return sendUnavailable(reply, request, error, true);
      }
    },
  );

  // B. GET /public/constituency/:acId (SSR HTML)
  app.get<{ Params: { acId: string } }>('/public/constituency/:acId', async (request, reply) => {
    try {
      const profile = await publicWebService.getConstituencyProfile(request.params.acId);
      if (!profile)
        return reply.status(404).type('text/html').send('<h1>Constituency not found</h1>');
      return reply.type('text/html').send(publicWebService.renderConstituencyHtml(profile));
    } catch (error) {
      return sendUnavailable(reply, request, error, true);
    }
  });

  // C. GET /public/districts/:districtId (SSR HTML)
  app.get<{ Params: { districtId: string } }>(
    '/public/districts/:districtId',
    async (request, reply) => {
      try {
        const district = await publicWebService.getDistrictProfile(request.params.districtId);
        if (!district)
          return reply.status(404).type('text/html').send('<h1>District not found</h1>');
        return reply.type('text/html').send(publicWebService.renderDistrictHtml(district));
      } catch (error) {
        return sendUnavailable(reply, request, error, true);
      }
    },
  );

  // D. GET /public/representatives/:repId (SSR HTML)
  app.get<{ Params: { repId: string } }>(
    '/public/representatives/:repId',
    async (request, reply) => {
      try {
        const rep = await publicWebService.getRepresentativeProfile(request.params.repId);
        if (!rep)
          return reply.status(404).type('text/html').send('<h1>Representative not found</h1>');
        return reply.type('text/html').send(publicWebService.renderRepresentativeHtml(rep));
      } catch (error) {
        return sendUnavailable(reply, request, error, true);
      }
    },
  );

  // E. GET /public/elections/:electionId (SSR HTML)
  app.get<{ Params: { electionId: string } }>(
    '/public/elections/:electionId',
    async (request, reply) => {
      try {
        const election = await publicWebService.getElectionProfile(request.params.electionId);
        if (!election)
          return reply.status(404).type('text/html').send('<h1>Election not found</h1>');
        return reply.type('text/html').send(publicWebService.renderElectionHtml(election));
      } catch (error) {
        return sendUnavailable(reply, request, error, true);
      }
    },
  );

  // F. GET /public/delimitation/:acId (SSR HTML)
  app.get<{ Params: { acId: string } }>('/public/delimitation/:acId', async (request, reply) => {
    try {
      await publicWebService.getDelimitationDiff(request.params.acId);
      return reply.status(404).type('text/html').send('<h1>Delimitation data not found</h1>');
    } catch (error) {
      return sendUnavailable(reply, request, error, true);
    }
  });

  // ==============================================================================
  // 2. TWIN HEADLESS JSON APIS (DEC-189 OPTION B PROVISION)
  // ==============================================================================

  // A. GET /api/v1/public/states/:stateCode
  app.get<{ Params: { stateCode: string } }>(
    '/api/v1/public/states/:stateCode',
    async (request, reply) => {
      try {
        const state = await publicWebService.getStateOverview(request.params.stateCode);
        if (!state) return sendApiError(reply, request, 404, 'NotFound', 'State not found');
        return sendSuccess(reply, request, state);
      } catch (error) {
        return sendUnavailable(reply, request, error);
      }
    },
  );

  // B. GET /api/v1/public/constituency/:acId
  app.get<{ Params: { acId: string } }>(
    '/api/v1/public/constituency/:acId',
    async (request, reply) => {
      try {
        const profile = await publicWebService.getConstituencyProfile(request.params.acId);
        if (!profile)
          return sendApiError(reply, request, 404, 'NotFound', 'Constituency not found');
        return sendSuccess(reply, request, profile);
      } catch (error) {
        return sendUnavailable(reply, request, error);
      }
    },
  );

  // C. GET /api/v1/public/districts/:districtId
  app.get<{ Params: { districtId: string } }>(
    '/api/v1/public/districts/:districtId',
    async (request, reply) => {
      try {
        const district = await publicWebService.getDistrictProfile(request.params.districtId);
        if (!district) return sendApiError(reply, request, 404, 'NotFound', 'District not found');
        return sendSuccess(reply, request, district);
      } catch (error) {
        return sendUnavailable(reply, request, error);
      }
    },
  );

  // D. GET /api/v1/public/representatives/:repId
  app.get<{ Params: { repId: string } }>(
    '/api/v1/public/representatives/:repId',
    async (request, reply) => {
      try {
        const rep = await publicWebService.getRepresentativeProfile(request.params.repId);
        if (!rep) return sendApiError(reply, request, 404, 'NotFound', 'Representative not found');
        return sendSuccess(reply, request, rep);
      } catch (error) {
        return sendUnavailable(reply, request, error);
      }
    },
  );

  // E. GET /api/v1/public/elections/:electionId
  app.get<{ Params: { electionId: string } }>(
    '/api/v1/public/elections/:electionId',
    async (request, reply) => {
      try {
        const election = await publicWebService.getElectionProfile(request.params.electionId);
        if (!election) return sendApiError(reply, request, 404, 'NotFound', 'Election not found');
        return sendSuccess(reply, request, election);
      } catch (error) {
        return sendUnavailable(reply, request, error);
      }
    },
  );

  // F. GET /api/v1/public/delimitation/:acId
  app.get<{ Params: { acId: string } }>(
    '/api/v1/public/delimitation/:acId',
    async (request, reply) => {
      try {
        const diff = await publicWebService.getDelimitationDiff(request.params.acId);
        return diff
          ? sendSuccess(reply, request, diff)
          : sendApiError(reply, request, 404, 'NotFound', 'Delimitation data not found');
      } catch (error) {
        return sendUnavailable(reply, request, error);
      }
    },
  );

  // ==============================================================================
  // 3. CANONICAL XML SITEMAPS
  // ==============================================================================

  app.get('/sitemap.xml', async (request, reply) => {
    try {
      return reply.type('application/xml').send(await publicWebService.generateSitemapXml());
    } catch (error) {
      return sendUnavailable(reply, request, error);
    }
  });

  app.get('/sitemap-geography.xml', async (request, reply) => {
    try {
      return reply
        .type('application/xml')
        .send(await publicWebService.generateGeographySitemapXml());
    } catch (error) {
      return sendUnavailable(reply, request, error);
    }
  });
}
