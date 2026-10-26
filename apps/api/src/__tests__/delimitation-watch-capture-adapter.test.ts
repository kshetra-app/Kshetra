import { createHash } from 'node:crypto';
import { CaptureAdapter } from '../modules/delimitationWatch/captureAdapter';
import type { DelimitationWatchSource } from '@kshetra/shared';

function source(overrides: Partial<DelimitationWatchSource> = {}): DelimitationWatchSource {
  return {
    id: 'source-1', name: 'Official source', publisher: 'Government of India', sourceType: 'gazette',
    canonicalUrl: 'https://example.gov.in/data.json', geographicScope: 'IN', subjectScope: 'delimitation',
    authorityClassification: 'statutory', retrievalMethod: 'http_get', isActive: true,
    consecutiveFailures: 0, metadata: {}, createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z', ...overrides,
  } as DelimitationWatchSource;
}

describe('Delimitation Watch capture adapter', () => {
  const repository = {
    saveSnapshot: jest.fn(async (_snapshot: any) => undefined),
    updateSourceHealth: jest.fn(async (_id: string, _updates: any) => undefined),
  };
  let adapter: CaptureAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new CaptureAdapter(repository as any);
  });

  it('captures mock payload bytes, hashes them, records dates and updates source health', async () => {
    const raw = JSON.stringify({ declaredPublicationDate: '2026-01-02', declaredEffectiveDate: '2026-02-01', value: 1 });
    const result = await adapter.capture(source(), {
      mockPayloadProvider: async () => ({
        status: 200, body: raw,
        headers: { etag: '"v1"', 'last-modified': 'Mon, 01 Jan 2026 00:00:00 GMT', 'content-type': 'application/json' },
      }),
    });
    expect(result).toMatchObject({
      sourceId: 'source-1', httpStatus: 200, rawContent: raw, captureOutcome: 'SUCCESS',
      etag: '"v1"', declaredPublicationDate: '2026-01-02', declaredEffectiveDate: '2026-02-01',
      contentSha256: createHash('sha256').update(raw, 'utf8').digest('hex'),
    });
    expect(repository.saveSnapshot).toHaveBeenCalledWith(result);
    expect(repository.updateSourceHealth).toHaveBeenCalledWith('source-1', expect.objectContaining({
      lastHttpStatus: 200, lastEtag: '"v1"', consecutiveFailures: 0,
    }));
  });

  it('marks identical bytes unchanged while preserving the prior source hash', async () => {
    const raw = '{"value":1}';
    const digest = createHash('sha256').update(raw, 'utf8').digest('hex');
    const result = await adapter.capture(source({ lastContentHash: digest }), {
      mockPayloadProvider: async () => ({ status: 200, body: raw }),
    });
    expect(result.captureOutcome).toBe('UNCHANGED');
    expect(result.rawContent).toBe(raw);
    expect(repository.updateSourceHealth).toHaveBeenCalledWith('source-1', expect.objectContaining({
      lastContentHash: digest, consecutiveFailures: 0,
    }));
  });

  it('supports ETag and Last-Modified header casing and defaults content type', async () => {
    const result = await adapter.capture(source(), {
      mockPayloadProvider: async () => ({
        status: 200, body: 'plain text', headers: { ETag: '"legacy"', 'Last-Modified': 'yesterday' },
      }),
    });
    expect(result).toMatchObject({ etag: '"legacy"', lastModified: 'yesterday', contentType: 'application/json' });
  });

  it('records unsupported retrieval method as a failure snapshot and increments failures', async () => {
    const result = await adapter.capture(source({ retrievalMethod: 'unknown' as any, consecutiveFailures: 2 }));
    expect(result).toMatchObject({ captureOutcome: 'FETCH_ERROR', httpStatus: 500, rawContent: '' });
    expect(result.diagnostics).toMatchObject({ error: expect.stringContaining('UNSUPPORTED_RETRIEVAL_METHOD') });
    expect(repository.updateSourceHealth).toHaveBeenCalledWith('source-1', expect.objectContaining({
      lastHttpStatus: 500, consecutiveFailures: 3,
    }));
  });

  it('records missing file fixtures without claiming successful capture', async () => {
    const result = await adapter.capture(source({
      retrievalMethod: 'file_fixture', canonicalUrl: './definitely-missing-delimitation-fixture.json',
    }));
    expect(result.captureOutcome).toBe('FETCH_ERROR');
    expect(result.httpStatus).toBe(500);
    expect(result.rawContent).toBe('');
    expect(repository.saveSnapshot).toHaveBeenCalledWith(expect.objectContaining({ captureOutcome: 'FETCH_ERROR' }));
  });

  it('records timeout-shaped errors with TIMEOUT semantics and preserves diagnostics', async () => {
    const result = await adapter.capture(source({ consecutiveFailures: 4 }), {
      mockPayloadProvider: async () => { throw new Error('HTTP_TIMEOUT: socket timeout'); },
    });
    expect(result.captureOutcome).toBe('TIMEOUT');
    expect(result.diagnostics).toMatchObject({ error: expect.stringContaining('HTTP_TIMEOUT') });
    expect(repository.updateSourceHealth).toHaveBeenCalledWith('source-1', expect.objectContaining({
      consecutiveFailures: 5, lastError: expect.stringContaining('HTTP_TIMEOUT'),
    }));
  });

  it('classifies 404 failures separately from generic fetch failures', async () => {
    const result = await adapter.capture(source(), {
      mockPayloadProvider: async () => { throw new Error('HTTP_ERROR: 404 resource missing'); },
    });
    expect(result.captureOutcome).toBe('NOT_FOUND');
  });

  it('ignores malformed JSON for date extraction without losing raw evidence', async () => {
    const raw = '{not-json';
    const result = await adapter.capture(source(), {
      mockPayloadProvider: async () => ({ status: 200, body: raw, headers: { 'content-type': 'application/json' } }),
    });
    expect(result.rawContent).toBe(raw);
    expect(result.declaredPublicationDate).toBeUndefined();
    expect(result.declaredEffectiveDate).toBeUndefined();
  });
});
