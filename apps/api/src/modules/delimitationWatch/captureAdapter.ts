/**
 * Stage 1: Capture Adapter
 *
 * Implements deterministic, immutable retrieval of source evidence:
 * - SHA-256 cryptographic verification
 * - HTTP validator caching (ETag, Last-Modified, 304 handling)
 * - SSRF-guarded HTTP fetching
 * - Local fixture file loading
 * - In-memory mock hooks for test isolation
 * - Fail-closed error handling (no false success, no overwriting good snapshots)
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash, randomUUID } from 'crypto';
import type { DelimitationWatchSource, DelimitationSnapshot, CaptureOutcome } from '@kshetra/shared';
import type { IDelimitationWatchRepository } from './persistence';
import { validateSourceUrl } from './ssrfGuard';

export interface CaptureOptions {
  timeoutMs?: number;
  allowLocalhost?: boolean;
  mockPayloadProvider?: (source: DelimitationWatchSource) => Promise<{ status: number; body: string; headers?: Record<string, string> }>;
}

export class CaptureAdapter {
  constructor(private readonly repo: IDelimitationWatchRepository) {}

  async capture(source: DelimitationWatchSource, options: CaptureOptions = {}): Promise<DelimitationSnapshot> {
    const timeoutMs = options.timeoutMs ?? 15000;
    const now = new Date().toISOString();

    let rawContent = '';
    let httpStatus = 0;
    let contentType = 'application/json';
    let etag: string | undefined;
    let lastModified: string | undefined;
    let declaredPubDate: string | undefined;
    let declaredEffDate: string | undefined;
    let captureOutcome: CaptureOutcome = 'SUCCESS';
    const diagnostics: Record<string, unknown> = {};

    try {
      // 1. Retrieval execution according to source.retrievalMethod
      if (options.mockPayloadProvider) {
        const mockRes = await options.mockPayloadProvider(source);
        httpStatus = mockRes.status;
        rawContent = mockRes.body;
        etag = mockRes.headers?.etag || mockRes.headers?.ETag;
        lastModified = mockRes.headers?.['last-modified'] || mockRes.headers?.['Last-Modified'];
        contentType = mockRes.headers?.['content-type'] || 'application/json';
      } else if (source.retrievalMethod === 'file_fixture') {
        const filePath = path.isAbsolute(source.canonicalUrl)
          ? source.canonicalUrl
          : path.resolve(process.cwd(), source.canonicalUrl);

        if (!fs.existsSync(filePath)) {
          throw new Error(`FILE_NOT_FOUND: Fixture file not found: ${filePath}`);
        }
        rawContent = fs.readFileSync(filePath, 'utf8');
        httpStatus = 200;
        contentType = filePath.endsWith('.json') ? 'application/json' : 'text/plain';
      } else if (source.retrievalMethod === 'http_get') {
        // SSRF guard
        validateSourceUrl(source.canonicalUrl, options.allowLocalhost ?? false);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const reqHeaders: Record<string, string> = {
          'User-Agent': 'Kshetra-Delimitation-Watch/1.0 (authoritative; civic-tech)',
          'Accept': 'application/json, text/html, text/plain;q=0.9',
        };

        if (source.lastEtag) {
          reqHeaders['If-None-Match'] = source.lastEtag;
        }
        if (source.lastModifiedHeader) {
          reqHeaders['If-Modified-Since'] = source.lastModifiedHeader;
        }

        try {
          const res = await fetch(source.canonicalUrl, {
            method: 'GET',
            headers: reqHeaders,
            signal: controller.signal,
          });

          httpStatus = res.status;
          etag = res.headers.get('etag') || undefined;
          lastModified = res.headers.get('last-modified') || undefined;
          contentType = res.headers.get('content-type') || 'text/plain';

          if (res.status === 304) {
            captureOutcome = 'UNCHANGED';
            rawContent = '';
          } else if (!res.ok) {
            throw new Error(`HTTP_ERROR: Received status ${res.status} ${res.statusText}`);
          } else {
            rawContent = await res.text();
          }
        } finally {
          clearTimeout(timer);
        }
      } else {
        throw new Error(`UNSUPPORTED_RETRIEVAL_METHOD: ${source.retrievalMethod}`);
      }

      // 2. Parse dates if declared in raw JSON
      if (rawContent && (contentType.includes('json') || rawContent.trim().startsWith('{'))) {
        try {
          const parsed = JSON.parse(rawContent);
          if (parsed.declaredPublicationDate) declaredPubDate = parsed.declaredPublicationDate;
          if (parsed.declaredEffectiveDate) declaredEffDate = parsed.declaredEffectiveDate;
        } catch {
          // not valid JSON, ignore
        }
      }

      // 3. Compute SHA-256 hash
      const contentHash = createHash('sha256').update(rawContent, 'utf8').digest('hex');

      // 4. Compare with last known hash
      if (source.lastContentHash && source.lastContentHash === contentHash && captureOutcome !== 'UNCHANGED') {
        captureOutcome = 'UNCHANGED';
      }

      const snapshot: DelimitationSnapshot = {
        id: randomUUID(),
        sourceId: source.id,
        retrievedAt: now,
        httpStatus,
        etag,
        lastModified,
        contentType,
        contentSizeBytes: Buffer.byteLength(rawContent, 'utf8'),
        contentSha256: contentHash,
        rawContent,
        declaredPublicationDate: declaredPubDate,
        declaredEffectiveDate: declaredEffDate,
        captureOutcome,
        diagnostics,
        createdAt: now,
      };

      await this.repo.saveSnapshot(snapshot);

      // 5. Update source health on success
      await this.repo.updateSourceHealth(source.id, {
        lastAttemptedAt: now,
        lastSuccessfulAt: now,
        lastHttpStatus: httpStatus,
        lastEtag: etag,
        lastModifiedHeader: lastModified,
        lastContentHash: contentHash,
        consecutiveFailures: 0,
        lastError: undefined,
      });

      return snapshot;
    } catch (err: any) {
      const isTimeout = err.name === 'AbortError' || err.message.includes('timeout') || err.message.includes('TIMEOUT');
      captureOutcome = isTimeout ? 'TIMEOUT' : 'FETCH_ERROR';

      // Record snapshot with failure outcome
      const failedSnapshot: DelimitationSnapshot = {
        id: randomUUID(),
        sourceId: source.id,
        retrievedAt: now,
        httpStatus: httpStatus || (isTimeout ? 408 : 500),
        etag: undefined,
        lastModified: undefined,
        contentType: 'text/plain',
        contentSizeBytes: 0,
        contentSha256: createHash('sha256').update('', 'utf8').digest('hex'),
        rawContent: '',
        captureOutcome,
        diagnostics: { error: err.message, stack: err.stack },
        createdAt: now,
      };

      await this.repo.saveSnapshot(failedSnapshot);

      // Record source health failure without overwriting last good snapshot
      await this.repo.updateSourceHealth(source.id, {
        lastAttemptedAt: now,
        lastHttpStatus: failedSnapshot.httpStatus,
        consecutiveFailures: (source.consecutiveFailures || 0) + 1,
        lastError: err.message,
      });

      return failedSnapshot;
    }
  }
}
