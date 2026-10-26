import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { CaptureAdapter } from '../modules/delimitationWatch/captureAdapter';

describe('Delimitation Watch hardened HTTP capture', () => {
  let server: http.Server;
  let baseUrl: string;
  const repository = {
    saveSnapshot: jest.fn(async (_snapshot: any) => undefined),
    updateSourceHealth: jest.fn(async (_id: string, _updates: any) => undefined),
  };
  let adapter: CaptureAdapter;

  const source = (path: string, overrides: Record<string, unknown> = {}) => ({
    id: 'http-source',
    name: 'HTTP capture test source',
    publisher: 'Test publisher',
    sourceType: 'gazette_extraordinary',
    canonicalUrl: `${baseUrl}${path}`,
    geographicScope: 'IN-TG',
    subjectScope: 'delimitation_order',
    authorityClassification: 'statutory',
    retrievalMethod: 'http_get',
    isActive: true,
    consecutiveFailures: 0,
    metadata: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as any);

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const path = new URL(req.url || '/', 'http://127.0.0.1').pathname;
      if (path === '/ok') {
        res.writeHead(200, {
          'content-type': 'application/json',
          etag: '"capture-v1"',
          'last-modified': 'Tue, 03 Feb 2026 00:00:00 GMT',
        });
        res.end(JSON.stringify({ declaredPublicationDate: '2026-02-03', declaredEffectiveDate: '2026-03-04' }));
      } else if (path === '/not-modified') {
        res.writeHead(304, { etag: '"capture-v1"' });
        res.end();
      } else if (path === '/conditional') {
        if (req.headers['if-none-match'] === '"old-etag"' &&
            req.headers['if-modified-since'] === 'Mon, 02 Feb 2026 00:00:00 GMT') {
          res.writeHead(304);
          res.end();
        } else {
          res.writeHead(200, { 'content-type': 'text/plain' });
          res.end('conditional miss');
        }
      } else if (path === '/redirect') {
        res.writeHead(302, { location: '/ok' });
        res.end();
      } else if (path === '/loop') {
        res.writeHead(302, { location: '/loop' });
        res.end();
      } else if (path === '/no-location') {
        res.writeHead(302);
        res.end();
      } else if (path === '/redirect-private') {
        res.writeHead(302, { location: 'http://10.0.0.1/private' });
        res.end();
      } else if (path.startsWith('/redirect-depth/')) {
        const depth = Number(path.split('/').pop());
        if (depth < 4) {
          res.writeHead(302, { location: `/redirect-depth/${depth + 1}` });
          res.end();
        } else {
          res.writeHead(200);
          res.end('too deep should not be reached');
        }
      } else if (path === '/large') {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('x'.repeat(2048));
      } else if (path === '/not-found') {
        res.writeHead(404);
        res.end('missing');
      } else if (path === '/server-error') {
        res.writeHead(503);
        res.end('unavailable');
      } else if (path === '/slow') {
        // Intentionally keep the response open so the client deadline fires.
      } else {
        res.writeHead(404);
        res.end('unknown route');
      }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new CaptureAdapter(repository as any);
  });

  const capture = (path: string, overrides: Record<string, unknown> = {}, options: Record<string, unknown> = {}) =>
    adapter.capture(source(path, overrides), { allowLocalhost: true, ...options } as any);

  it('captures real HTTP bytes, response validators, dates and pinned IP diagnostics', async () => {
    const result = await capture('/ok');
    expect(result).toMatchObject({
      httpStatus: 200,
      captureOutcome: 'SUCCESS',
      etag: '"capture-v1"',
      lastModified: 'Tue, 03 Feb 2026 00:00:00 GMT',
      declaredPublicationDate: '2026-02-03',
      declaredEffectiveDate: '2026-03-04',
    });
    expect(result.diagnostics).toMatchObject({ resolvedIp: '127.0.0.1', redirectCount: 0 });
    expect(repository.saveSnapshot).toHaveBeenCalledWith(result);
    expect(repository.updateSourceHealth).toHaveBeenCalledWith('http-source', expect.objectContaining({
      lastHttpStatus: 200,
      lastEtag: '"capture-v1"',
      consecutiveFailures: 0,
    }));
  });

  it('treats 304 responses as unchanged and preserves the prior content hash', async () => {
    const result = await capture('/not-modified', { lastContentHash: 'prior-hash' });
    expect(result).toMatchObject({ httpStatus: 304, captureOutcome: 'UNCHANGED', rawContent: '', contentSha256: expect.any(String) });
    expect(repository.updateSourceHealth).toHaveBeenCalledWith('http-source', expect.objectContaining({
      lastContentHash: 'prior-hash', consecutiveFailures: 0,
    }));
  });

  it('sends conditional validators and handles a conditional 304 response', async () => {
    const result = await capture('/conditional', {
      lastEtag: '"old-etag',
      lastModifiedHeader: 'Mon, 02 Feb 2026 00:00:00 GMT',
      lastContentHash: 'known-hash',
    });
    expect(result.captureOutcome).toBe('UNCHANGED');
    expect(result.httpStatus).toBe(304);
    expect(result.rawContent).toBe('');
  });

  it('follows safe redirects and records redirect count', async () => {
    const result = await capture('/redirect');
    expect(result.captureOutcome).toBe('SUCCESS');
    expect(result.httpStatus).toBe(200);
    expect(result.diagnostics).toMatchObject({ redirectCount: 1, resolvedIp: '127.0.0.1' });
  });

  it.each([
    ['/loop', 'REDIRECT_LOOP_DETECTED'],
    ['/no-location', 'INVALID_REDIRECT'],
    ['/redirect-private', 'SSRF Blocked'],
    ['/redirect-depth/0', 'REDIRECT_LIMIT_EXCEEDED'],
  ])('fails closed for unsafe redirect path %s', async (path, expectedError) => {
    const result = await capture(path);
    expect(result.captureOutcome).toBe('FETCH_ERROR');
    expect(result.diagnostics.error).toContain(expectedError);
    expect(repository.updateSourceHealth).toHaveBeenCalledWith('http-source', expect.objectContaining({
      consecutiveFailures: 1,
    }));
  });

  it('rejects responses exceeding the configured streaming byte limit', async () => {
    const result = await capture('/large', {}, { maxResponseBytes: 128 });
    expect(result.captureOutcome).toBe('FETCH_ERROR');
    expect(result.diagnostics.error).toContain('RESPONSE_SIZE_EXCEEDED');
  });

  it.each([
    ['/not-found', 'NOT_FOUND', 404],
    ['/server-error', 'FETCH_ERROR', 503],
  ])('classifies HTTP failure %s correctly', async (path, outcome, status) => {
    const result = await capture(path);
    expect(result.captureOutcome).toBe(outcome);
    expect(result.httpStatus).toBe(status);
    expect(result.rawContent).toBe('');
  });

  it('classifies an overall HTTP deadline as TIMEOUT', async () => {
    const result = await capture('/slow', { consecutiveFailures: 2 }, { timeoutMs: 40 });
    expect(result.captureOutcome).toBe('TIMEOUT');
    expect(result.diagnostics.error).toContain('DEADLINE_EXCEEDED');
    expect(repository.updateSourceHealth).toHaveBeenCalledWith('http-source', expect.objectContaining({
      consecutiveFailures: 3,
    }));
  });
});
