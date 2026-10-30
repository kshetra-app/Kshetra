/**
 * Media Embeds & Civic Widgets Routes (JOB 064)
 *
 * Authority: Master Product Blueprint (Jobs 062-066), DEC-188, DEC-189
 * Exposes:
 * - 7 Sandboxed, Responsive Embed Widgets: Constituency, Delimitation, Election, Candidate, Issue, Live, Short
 * - Permissive Framing Headers (X-Frame-Options: ALLOWALL, CSP: frame-ancestors *)
 * - Universal PostMessage Auto-Resizing Client Loader Script (/embed/poligram-widgets.js & legacy /embed/panin-widgets.js)
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { embedService } from '../services/embedService';
import type { PoligramEmbedWidgetType } from '@kshetra/shared';

function setEmbedHeaders(reply: FastifyReply) {
  reply.header('X-Frame-Options', 'ALLOWALL');
  reply.header('Content-Security-Policy', "frame-ancestors *");
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Cache-Control', 'public, max-age=300');
  reply.type('text/html');
}

export async function embedRoutes(app: FastifyInstance) {
  // 1. GET /embed/poligram-widgets.js & legacy /embed/panin-widgets.js
  const handleLoader = async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Content-Type', 'application/javascript');
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Cache-Control', 'public, max-age=86400');
    return reply.send(embedService.getClientLoaderScript());
  };
  app.get('/embed/poligram-widgets.js', handleLoader);
  app.get('/embed/panin-widgets.js', handleLoader);

  // 2. GET /embed/constituency/:acId
  app.get<{ Params: { acId: string } }>(
    '/embed/constituency/:acId',
    async (request, reply) => {
      setEmbedHeaders(reply);
      return reply.send(embedService.renderWidgetHtml('constituency', request.params.acId));
    }
  );

  // 3. GET /embed/delimitation/:acId
  app.get<{ Params: { acId: string } }>(
    '/embed/delimitation/:acId',
    async (request, reply) => {
      setEmbedHeaders(reply);
      return reply.send(embedService.renderWidgetHtml('delimitation', request.params.acId));
    }
  );

  // 4. GET /embed/election/:id
  app.get<{ Params: { id: string } }>(
    '/embed/election/:id',
    async (request, reply) => {
      setEmbedHeaders(reply);
      return reply.send(embedService.renderWidgetHtml('election', request.params.id));
    }
  );

  // 5. GET /embed/candidate/:id
  app.get<{ Params: { id: string } }>(
    '/embed/candidate/:id',
    async (request, reply) => {
      setEmbedHeaders(reply);
      return reply.send(embedService.renderWidgetHtml('candidate', request.params.id));
    }
  );

  // 6. GET /embed/issue/:id
  app.get<{ Params: { id: string } }>(
    '/embed/issue/:id',
    async (request, reply) => {
      setEmbedHeaders(reply);
      return reply.send(embedService.renderWidgetHtml('issue', request.params.id));
    }
  );

  // 7. GET /embed/live/:id
  app.get<{ Params: { id: string } }>(
    '/embed/live/:id',
    async (request, reply) => {
      setEmbedHeaders(reply);
      return reply.send(embedService.renderWidgetHtml('live', request.params.id));
    }
  );

  // 8. GET /embed/short/:id
  app.get<{ Params: { id: string } }>(
    '/embed/short/:id',
    async (request, reply) => {
      setEmbedHeaders(reply);
      return reply.send(embedService.renderWidgetHtml('short', request.params.id));
    }
  );
}
