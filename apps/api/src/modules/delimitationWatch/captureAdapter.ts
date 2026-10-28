/**
 * apps/api/src/modules/delimitationWatch/captureAdapter.ts
 *
 * Stage 1: Capture Adapter
 *
 * Implements deterministic, immutable retrieval of source evidence:
 * - SHA-256 cryptographic verification
 * - HTTP validator caching (ETag, Last-Modified, 304 handling)
 * - Zero-trust SSRF-guarded HTTP fetching with pre-connect DNS resolution and socket pinning
 * - Safe manual redirect handling (loop detection, protocol downgrade rejection, re-resolved target validation)
 * - Streaming response size bounding (max 10MB limit)
 * - Fail-closed error handling (no false success, no overwriting good snapshots)
 */

import * as fs from 'fs';
import * as path from 'path';
import http from 'node:http';
import https from 'node:https';
import { createHash, randomUUID } from 'crypto';
import type {
  DelimitationWatchSource,
  DelimitationSnapshot,
  CaptureOutcome,
} from '@kshetra/shared';
import type { IDelimitationWatchRepository } from './persistence';
import { validateAndPinSourceUrl, SsrfSecurityError } from './ssrfGuard';

export const MAX_CAPTURE_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB limit
export const MAX_REDIRECT_DEPTH = 3;

export interface CaptureOptions {
  timeoutMs?: number;
  maxResponseBytes?: number;
  allowLocalhost?: boolean;
  allowInsecureInTest?: boolean;
  ca?: string | Buffer | Array<string | Buffer>;
  mockDnsResolver?: (hostname: string) => Promise<string[]>;
  mockPayloadProvider?: (
    source: DelimitationWatchSource,
  ) => Promise<{ status: number; body: string; headers?: Record<string, string> }>;
}

export class CaptureAdapter {
  private readonly repo: IDelimitationWatchRepository;

  constructor(repo: IDelimitationWatchRepository) {
    this.repo = repo;
  }

  async capture(
    source: DelimitationWatchSource,
    options: CaptureOptions = {},
  ): Promise<DelimitationSnapshot> {
    const timeoutMs = options.timeoutMs ?? 15000;
    const maxBytes = options.maxResponseBytes ?? MAX_CAPTURE_RESPONSE_BYTES;
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
      if (options.mockPayloadProvider) {
        // Test hook: mock payload provider
        const mockRes = await options.mockPayloadProvider(source);
        httpStatus = mockRes.status;
        rawContent = mockRes.body;
        etag = mockRes.headers?.etag || mockRes.headers?.ETag;
        lastModified = mockRes.headers?.['last-modified'] || mockRes.headers?.['Last-Modified'];
        contentType = mockRes.headers?.['content-type'] || 'application/json';
      } else if (source.retrievalMethod === 'file_fixture') {
        // Local file fixture retrieval
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
        // Zero-trust SSRF guarded HTTP/HTTPS retrieval with manual redirect following
        const fetchResult = await this.executeHardenedHttpGet(source.canonicalUrl, {
          timeoutMs,
          maxBytes,
          allowLocalhost: options.allowLocalhost ?? false,
          allowInsecureInTest: options.allowInsecureInTest ?? false,
          ca: options.ca,
          mockDnsResolver: options.mockDnsResolver,
          lastEtag: source.lastEtag,
          lastModifiedHeader: source.lastModifiedHeader,
        });

        httpStatus = fetchResult.status;
        etag = fetchResult.etag;
        lastModified = fetchResult.lastModified;
        contentType = fetchResult.contentType;
        rawContent = fetchResult.body;
        diagnostics.resolvedIp = fetchResult.pinnedIp;
        diagnostics.redirectCount = fetchResult.redirectCount;

        if (fetchResult.status === 304) {
          captureOutcome = 'UNCHANGED';
          rawContent = '';
        } else if (fetchResult.status < 200 || fetchResult.status >= 300) {
          throw new Error(`HTTP_ERROR: Received status ${fetchResult.status}`);
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
      if (
        source.lastContentHash &&
        source.lastContentHash === contentHash &&
        captureOutcome !== 'UNCHANGED'
      ) {
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
        lastEtag: etag || source.lastEtag,
        lastModifiedHeader: lastModified || source.lastModifiedHeader,
        lastContentHash: captureOutcome === 'UNCHANGED' ? source.lastContentHash : contentHash,
        consecutiveFailures: 0,
        lastError: undefined,
      });

      return snapshot;
    } catch (err: any) {
      // Fail-closed: record failure snapshot without overwriting prior good snapshots
      const errorOutcome: CaptureOutcome =
        err.name === 'AbortError' ||
        err.message?.includes('timeout') ||
        err.message?.includes('TIMEOUT') ||
        err.message?.includes('DEADLINE_EXCEEDED')
          ? 'TIMEOUT'
          : err.message?.includes('404')
            ? 'NOT_FOUND'
            : 'FETCH_ERROR';

      const failureSnapshot: DelimitationSnapshot = {
        id: randomUUID(),
        sourceId: source.id,
        retrievedAt: now,
        httpStatus: httpStatus || 500,
        contentType: 'text/plain',
        contentSizeBytes: 0,
        contentSha256: createHash('sha256').update('').digest('hex'),
        rawContent: '',
        captureOutcome: errorOutcome,
        diagnostics: { error: err.message, stack: err.stack, code: err.code },
        createdAt: now,
      };

      await this.repo.saveSnapshot(failureSnapshot);

      await this.repo.updateSourceHealth(source.id, {
        lastAttemptedAt: now,
        lastHttpStatus: httpStatus || 500,
        consecutiveFailures: source.consecutiveFailures + 1,
        lastError: err.message,
      });

      return failureSnapshot;
    }
  }

  /**
   * Hardened HTTP GET execution:
   * - Pre-resolves DNS and pins connection socket
   * - Manual redirect loop and depth control
   * - Protocol downgrade protection
   * - Streaming body size limit
   */
  private async executeHardenedHttpGet(
    initialUrl: string,
    opts: {
      timeoutMs: number;
      maxBytes: number;
      allowLocalhost: boolean;
      allowInsecureInTest?: boolean;
      ca?: string | Buffer | Array<string | Buffer>;
      mockDnsResolver?: (host: string) => Promise<string[]>;
      lastEtag?: string;
      lastModifiedHeader?: string;
    },
  ): Promise<{
    status: number;
    etag?: string;
    lastModified?: string;
    contentType: string;
    body: string;
    pinnedIp: string;
    redirectCount: number;
  }> {
    let currentUrl = initialUrl;
    let redirectCount = 0;
    const visitedUrls = new Set<string>([currentUrl]);

    while (redirectCount <= MAX_REDIRECT_DEPTH) {
      // 1. SSRF validate and pin destination
      const destination = await validateAndPinSourceUrl(currentUrl, {
        allowLocalhostForTests: opts.allowLocalhost,
        allowInsecureInTest: opts.allowInsecureInTest,
        mockDnsResolver: opts.mockDnsResolver,
        timeoutMs: opts.timeoutMs,
        ca: opts.ca,
      });

      // 2. Perform raw HTTP/HTTPS request using custom pinned agent
      const response = await this.performPinnedHttpRequest(destination, {
        timeoutMs: opts.timeoutMs,
        maxBytes: opts.maxBytes,
        lastEtag: redirectCount === 0 ? opts.lastEtag : undefined,
        lastModifiedHeader: redirectCount === 0 ? opts.lastModifiedHeader : undefined,
      });

      // 3. Handle redirects (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        redirectCount++;
        if (redirectCount > MAX_REDIRECT_DEPTH) {
          throw new SsrfSecurityError(
            `REDIRECT_LIMIT_EXCEEDED (MAX_REDIRECTS_EXCEEDED): Redirect depth exceeded maximum allowed (${MAX_REDIRECT_DEPTH})`,
          );
        }

        const locationHeader = response.headers.location;
        if (!locationHeader) {
          throw new SsrfSecurityError(
            `INVALID_REDIRECT: Received HTTP ${response.statusCode} without Location header`,
          );
        }

        const nextUrl = new URL(locationHeader, currentUrl).toString();

        // Prevent redirect loops
        if (visitedUrls.has(nextUrl)) {
          throw new SsrfSecurityError(
            `REDIRECT_LOOP_DETECTED: Target '${nextUrl}' previously encountered in redirect chain`,
          );
        }
        visitedUrls.add(nextUrl);

        // Protocol downgrade check: https cannot redirect to http
        const currentIsHttps = currentUrl.startsWith('https:');
        const nextIsHttps = nextUrl.startsWith('https:');
        if (currentIsHttps && !nextIsHttps && !opts.allowLocalhost) {
          throw new SsrfSecurityError(
            `PROTOCOL_DOWNGRADE_FORBIDDEN: Redirect from HTTPS to plain HTTP is prohibited ('${nextUrl}')`,
          );
        }

        currentUrl = nextUrl;
        continue;
      }

      return {
        status: response.statusCode,
        etag: (response.headers.etag as string) || undefined,
        lastModified: (response.headers['last-modified'] as string) || undefined,
        contentType: (response.headers['content-type'] as string) || 'text/plain',
        body: response.body,
        pinnedIp: destination.pinnedIp,
        redirectCount,
      };
    }

    throw new SsrfSecurityError(`MAX_REDIRECTS_EXCEEDED: Exceeded redirect limit`);
  }

  /**
   * Issues raw HTTP/HTTPS request over pinned socket with streaming size bounds
   */
  private performPinnedHttpRequest(
    destination: import('./ssrfGuard').ValidatedDestination,
    opts: {
      timeoutMs: number;
      maxBytes: number;
      lastEtag?: string;
      lastModifiedHeader?: string;
    },
  ): Promise<{
    statusCode: number;
    headers: http.IncomingHttpHeaders;
    body: string;
  }> {
    return new Promise((resolve, reject) => {
      const client = destination.isHttps ? https : http;

      const headers: Record<string, string> = {
        'User-Agent': 'Kshetra-Delimitation-Watch/1.0 (authoritative; civic-tech; anti-ssrf)',
        Accept: 'application/json, text/html, text/plain;q=0.9',
        Host: destination.hostname,
      };

      if (opts.lastEtag) {
        headers['If-None-Match'] = opts.lastEtag;
      }
      if (opts.lastModifiedHeader) {
        headers['If-Modified-Since'] = opts.lastModifiedHeader;
      }

      let isCompleted = false;
      const cleanup = () => {
        if (!isCompleted) {
          isCompleted = true;
          clearTimeout(deadlineTimer);
        }
      };

      const deadlineTimer = setTimeout(() => {
        cleanup();
        req.destroy(
          new Error(
            `DEADLINE_EXCEEDED: Overall HTTP request exceeded deadline of ${opts.timeoutMs}ms`,
          ),
        );
      }, opts.timeoutMs);

      const req = client.request(
        {
          method: 'GET',
          host: destination.hostname,
          port: destination.port,
          path: destination.parsedUrl.pathname + destination.parsedUrl.search,
          headers,
          agent: destination.agent,
          timeout: opts.timeoutMs,
        },
        (res) => {
          const statusCode = res.statusCode || 500;

          // If 304, no body expected
          if (statusCode === 304) {
            cleanup();
            res.resume();
            return resolve({ statusCode, headers: res.headers, body: '' });
          }

          let bytesReceived = 0;
          const chunks: Buffer[] = [];

          res.on('data', (chunk: Buffer) => {
            bytesReceived += chunk.length;
            if (bytesReceived > opts.maxBytes) {
              cleanup();
              req.destroy();
              res.destroy();
              reject(
                new Error(
                  `RESPONSE_SIZE_EXCEEDED (PAYLOAD_TOO_LARGE): Response exceeded maximum allowed size of ${opts.maxBytes} bytes`,
                ),
              );
              return;
            }
            chunks.push(chunk);
          });

          res.on('end', () => {
            cleanup();
            const body = Buffer.concat(chunks).toString('utf8');
            resolve({
              statusCode,
              headers: res.headers,
              body,
            });
          });

          res.on('error', (err) => {
            cleanup();
            reject(err);
          });
        },
      );

      req.on('socket', (socket) => {
        socket.setTimeout(opts.timeoutMs);
        socket.on('timeout', () => {
          cleanup();
          socket.destroy();
          req.destroy(new Error(`HTTP_TIMEOUT: Socket timed out after ${opts.timeoutMs}ms`));
        });
      });

      req.on('timeout', () => {
        cleanup();
        req.destroy();
        reject(new Error(`HTTP_TIMEOUT: Request timed out after ${opts.timeoutMs}ms`));
      });

      req.on('error', (err) => {
        cleanup();
        reject(err);
      });

      req.end();
    });
  }
}
