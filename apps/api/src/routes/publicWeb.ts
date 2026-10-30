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
import { publicWebService } from '../services/publicWebService';
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

export async function publicWebRoutes(app: FastifyInstance) {
  // ==============================================================================
  // 1. CANONICAL SSR HTML PAGES (DEC-189 OPTION A)
  // ==============================================================================

  // A. GET /public/states/:stateCode (SSR HTML)
  app.get<{ Params: { stateCode: string } }>(
    '/public/states/:stateCode',
    async (request, reply) => {
      const state = await publicWebService.getStateOverview(request.params.stateCode);
      if (!state) {
        return reply.status(404).type('text/html').send(`<h1>State not found</h1><p>State '${request.params.stateCode}' is not registered.</p>`);
      }
      return reply.type('text/html').send(publicWebService.renderStateHtml(state));
    }
  );

  // B. GET /public/constituency/:acId (SSR HTML)
  app.get<{ Params: { acId: string } }>(
    '/public/constituency/:acId',
    async (request, reply) => {
      const profile = await publicWebService.getConstituencyProfile(request.params.acId);
      if (!profile) {
        return reply.status(404).type('text/html').send(`<h1>Constituency not found</h1>`);
      }
      return reply.type('text/html').send(publicWebService.renderConstituencyHtml(profile));
    }
  );

  // C. GET /public/districts/:districtId (SSR HTML)
  app.get<{ Params: { districtId: string } }>(
    '/public/districts/:districtId',
    async (request, reply) => {
      const district = await publicWebService.getDistrictProfile(request.params.districtId);
      return reply.type('text/html').send(`<!DOCTYPE html><html><head><title>District: ${district.name}</title></head><body style="background:#0f172a;color:#fff;padding:2rem;"><h1>District: ${district.name}</h1><p>Total Constituencies: ${district.totalConstituencies}</p></body></html>`);
    }
  );

  // D. GET /public/representatives/:repId (SSR HTML)
  app.get<{ Params: { repId: string } }>(
    '/public/representatives/:repId',
    async (request, reply) => {
      const rep = await publicWebService.getRepresentativeProfile(request.params.repId);
      if (!rep) return reply.status(404).send('Representative not found');
      return reply.type('text/html').send(`<!DOCTYPE html><html><head><title>${rep.name} MLA Profile</title></head><body style="background:#0f172a;color:#fff;padding:2rem;"><h1>${rep.name}</h1><p>Party: ${rep.party}</p><p>Attendance: ${rep.attendancePercentage}%</p></body></html>`);
    }
  );

  // E. GET /public/elections/:electionId (SSR HTML)
  app.get<{ Params: { electionId: string } }>(
    '/public/elections/:electionId',
    async (request, reply) => {
      const elec = await publicWebService.getElectionProfile(request.params.electionId);
      return reply.type('text/html').send(`<!DOCTYPE html><html><head><title>${elec.title}</title></head><body style="background:#0f172a;color:#fff;padding:2rem;"><h1>${elec.title}</h1><p>Turnout: ${elec.turnoutPercentage}%</p></body></html>`);
    }
  );

  // F. GET /public/delimitation/:acId (SSR HTML)
  app.get<{ Params: { acId: string } }>(
    '/public/delimitation/:acId',
    async (request, reply) => {
      const del = await publicWebService.getDelimitationDiff(request.params.acId);
      return reply.type('text/html').send(`<!DOCTYPE html><html><head><title>Delimitation 2026: ${del.constituencyName}</title></head><body style="background:#0f172a;color:#fff;padding:2rem;"><h1>2026 Delimitation Scenario: ${del.constituencyName}</h1><p>Shift: ${del.boundaryShiftPercent}%</p><p>Result: ${del.seatsDelta}</p></body></html>`);
    }
  );

  // ==============================================================================
  // 2. TWIN HEADLESS JSON APIS (DEC-189 OPTION B PROVISION)
  // ==============================================================================

  // A. GET /api/v1/public/states/:stateCode
  app.get<{ Params: { stateCode: string } }>(
    '/api/v1/public/states/:stateCode',
    async (request, reply) => {
      const state = await publicWebService.getStateOverview(request.params.stateCode);
      if (!state) return sendApiError(reply, request, 404, 'NotFound', 'State not found');
      return sendSuccess(reply, request, state);
    }
  );

  // B. GET /api/v1/public/constituency/:acId
  app.get<{ Params: { acId: string } }>(
    '/api/v1/public/constituency/:acId',
    async (request, reply) => {
      const profile = await publicWebService.getConstituencyProfile(request.params.acId);
      if (!profile) return sendApiError(reply, request, 404, 'NotFound', 'Constituency not found');
      return sendSuccess(reply, request, profile);
    }
  );

  // C. GET /api/v1/public/districts/:districtId
  app.get<{ Params: { districtId: string } }>(
    '/api/v1/public/districts/:districtId',
    async (request, reply) => {
      const district = await publicWebService.getDistrictProfile(request.params.districtId);
      return sendSuccess(reply, request, district);
    }
  );

  // D. GET /api/v1/public/representatives/:repId
  app.get<{ Params: { repId: string } }>(
    '/api/v1/public/representatives/:repId',
    async (request, reply) => {
      const rep = await publicWebService.getRepresentativeProfile(request.params.repId);
      if (!rep) return sendApiError(reply, request, 404, 'NotFound', 'Representative not found');
      return sendSuccess(reply, request, rep);
    }
  );

  // E. GET /api/v1/public/elections/:electionId
  app.get<{ Params: { electionId: string } }>(
    '/api/v1/public/elections/:electionId',
    async (request, reply) => {
      const elec = await publicWebService.getElectionProfile(request.params.electionId);
      return sendSuccess(reply, request, elec);
    }
  );

  // F. GET /api/v1/public/delimitation/:acId
  app.get<{ Params: { acId: string } }>(
    '/api/v1/public/delimitation/:acId',
    async (request, reply) => {
      const del = await publicWebService.getDelimitationDiff(request.params.acId);
      return sendSuccess(reply, request, del);
    }
  );

  // ==============================================================================
  // 3. CANONICAL XML SITEMAPS
  // ==============================================================================

  app.get('/sitemap.xml', async (request, reply) => {
    return reply.type('application/xml').send(publicWebService.generateSitemapXml());
  });

  app.get('/sitemap-geography.xml', async (request, reply) => {
    return reply.type('application/xml').send(publicWebService.generateGeographySitemapXml());
  });
}
