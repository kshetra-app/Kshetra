import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Boundary GeoJSON delivery (Performance Phase 3).
 *
 * Serves the optimised constituency polygon files produced by
 * `scripts/build-geo-assets.mjs` from apps/api/public/geo. Files are served
 * with aggressive caching (content is immutable per `?v=<hash>`), and a
 * pre-built `.gz` sibling is streamed with `Content-Encoding: gzip` whenever
 * the client advertises gzip support (~83% smaller over the wire).
 *
 * The mobile app downloads each state once, then caches it on-device, so these
 * boundaries no longer ship inside the JS bundle.
 */

const GEO_DIR = process.env.GEO_DIR ?? join(__dirname, '..', '..', 'public', 'geo');

/** Strict allow-list: lower-case slug + `.json` only — blocks path traversal. */
const SAFE_FILE = /^[a-z0-9-]+\.json$/;

function sendFile(
  request: FastifyRequest,
  reply: FastifyReply,
  fileName: string,
  immutable: boolean,
) {
  const plainPath = join(GEO_DIR, fileName);
  if (!existsSync(plainPath)) {
    return reply.status(404).send({ error: 'Not Found', message: `No boundary file: ${fileName}` });
  }

  reply.header('Content-Type', 'application/json; charset=utf-8');
  reply.header(
    'Cache-Control',
    immutable
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=86400, stale-while-revalidate=604800',
  );

  const acceptsGzip = (request.headers['accept-encoding'] ?? '').includes('gzip');
  const gzPath = `${plainPath}.gz`;
  if (acceptsGzip && existsSync(gzPath)) {
    reply.header('Content-Encoding', 'gzip');
    reply.header('Vary', 'Accept-Encoding');
    reply.header('Content-Length', statSync(gzPath).size);
    return reply.send(createReadStream(gzPath));
  }

  reply.header('Content-Length', statSync(plainPath).size);
  return reply.send(createReadStream(plainPath));
}

export async function geoRoutes(app: FastifyInstance) {
  // Manifest is small and changes every build → short cache, revalidate.
  app.get('/geo/manifest.json', (request, reply) => sendFile(request, reply, 'manifest.json', false));

  app.get<{ Params: { file: string } }>('/geo/:file', (request, reply) => {
    const { file } = request.params;
    if (!SAFE_FILE.test(file)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid boundary file name' });
    }
    // Versioned URLs (?v=<hash>) are immutable; bare URLs revalidate daily.
    const immutable = typeof request.query === 'object'
      && request.query !== null
      && 'v' in (request.query as Record<string, unknown>);
    return sendFile(request, reply, file, immutable);
  });
}
