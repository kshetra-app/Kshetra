/**
 * Canonical ApiClient Implementation
 * Master Execution Framework — JOB W007
 * 
 * Core client managing:
 * - Deterministic HTTP dispatching (GET, POST, PUT, PATCH, DELETE)
 * - Fail-safe authentication enforcement (default: authenticated)
 * - End-to-end correlation generation & response verification
 * - Overall request deadline model (default 18,000ms GET budget)
 * - Safe retry loops (idempotent GET only, 0 retries for mutations)
 * - Fastify error envelope deserialization
 */

import type {
  ApiClientConfig,
  ApiResponse,
  HttpMethod,
  RequestOptions,
} from './types';
import {
  ApiError,
  ApiNetworkError,
  ApiTimeoutError,
  createApiErrorFromResponse,
} from './errors';
import { applyAuthHeaders } from './interceptors/auth';
import {
  injectTracingHeaders,
  recordNetworkBreadcrumb,
  resolveRequestId,
  validateResponseCorrelation,
} from './interceptors/correlation';
import { ConfigEndpoint } from './endpoints/config';
import { PagesEndpoint } from './endpoints/pages';
import { NewsEndpoint } from './endpoints/news';

export class ApiClient {
  readonly baseUrl: string;
  readonly defaultTimeoutMs: number;
  readonly defaultTotalBudgetMs: number;
  readonly defaultRetries: number;

  readonly config: ConfigEndpoint;
  readonly pages: PagesEndpoint;
  readonly news: NewsEndpoint;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? 8000;
    this.defaultTotalBudgetMs = config.defaultTotalBudgetMs ?? 18000;
    this.defaultRetries = config.defaultRetries ?? 2;

    this.config = new ConfigEndpoint(this);
    this.pages = new PagesEndpoint(this);
    this.news = new NewsEndpoint(this);
  }

  /**
   * Dispatches an HTTP request through the unified canonical pipeline.
   */
  async request<TResponse, TBody = unknown>(
    path: string,
    options: RequestOptions<TBody> = {},
  ): Promise<ApiResponse<TResponse>> {
    const method: HttpMethod = options.method || 'GET';
    const isIdempotent = method === 'GET' || method === 'HEAD';

    // 1. Overall deadline budget & attempt ceiling
    const totalBudgetMs = options.totalBudgetMs ?? (isIdempotent ? this.defaultTotalBudgetMs : this.defaultTimeoutMs);
    const attemptCeilingMs = options.timeoutMs ?? this.defaultTimeoutMs;
    const maxRetries = options.retries !== undefined ? options.retries : (isIdempotent ? this.defaultRetries : 0);
    const retryDelayMs = options.retryDelayMs ?? 300;

    const startTime = Date.now();
    const deadline = startTime + totalBudgetMs;

    // 2. Correlation Request ID
    const requestId = resolveRequestId(options.customRequestId);

    // 3. Prepare headers and auth
    const headersWithAuth = await applyAuthHeaders(options.headers || {}, options.authPolicy || 'authenticated');
    const finalHeaders = injectTracingHeaders(headersWithAuth, requestId);

    // 4. Construct URL with query parameters
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      }
    }

    // 5. Serialize body if present
    let serializedBody: BodyInit | undefined;
    if (options.body !== undefined && options.body !== null) {
      if (typeof options.body === 'string' || options.body instanceof FormData || options.body instanceof Blob) {
        serializedBody = options.body as BodyInit;
      } else {
        finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
        serializedBody = JSON.stringify(options.body);
      }
    }

    // 6. Execution loop with overall deadline budget
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const remainingBudget = deadline - Date.now();
      if (remainingBudget <= 0) {
        throw new ApiTimeoutError(`Total request budget exhausted (${totalBudgetMs}ms)`, requestId);
      }

      const currentAttemptTimeout = Math.min(attemptCeilingMs, remainingBudget);
      const controller = new AbortController();
      let timedOut = false;

      const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, currentAttemptTimeout);

      const onCallerAbort = () => {
        controller.abort();
      };

      if (options.signal) {
        if (options.signal.aborted) {
          clearTimeout(timeoutId);
          throw new ApiError('Request aborted by caller', 0, requestId);
        }
        options.signal.addEventListener('abort', onCallerAbort);
      }

      try {
        const response = await fetch(url.toString(), {
          method,
          headers: finalHeaders,
          body: serializedBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        if (options.signal) {
          options.signal.removeEventListener('abort', onCallerAbort);
        }

        const durationMs = Date.now() - startTime;

        if (response.ok) {
          // Validate correlation ID (fails closed on missing or mismatch)
          const verifiedRequestId = validateResponseCorrelation(response.headers, requestId);

          let data: TResponse;
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            data = (await response.json()) as TResponse;
          } else {
            data = (await response.text()) as unknown as TResponse;
          }

          recordNetworkBreadcrumb(method, path, response.status, verifiedRequestId, durationMs);

          return {
            data,
            statusCode: response.status,
            headers: response.headers,
            requestId: verifiedRequestId,
          };
        }

        // Server returned non-2xx status code
        let errorPayload: unknown;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            errorPayload = await response.json();
          } catch {
            errorPayload = await response.text();
          }
        } else {
          errorPayload = await response.text();
        }

        const apiError = createApiErrorFromResponse(response.status, errorPayload, requestId);
        recordNetworkBreadcrumb(method, path, response.status, requestId, durationMs);

        // Check if retryable
        const isRetryableStatus = response.status === 502 || response.status === 503 || response.status === 504;
        if (isRetryableStatus && isIdempotent && attempt < maxRetries) {
          const backoff = retryDelayMs * Math.pow(2, attempt) + Math.random() * 50;
          if (Date.now() + backoff < deadline) {
            await new Promise((resolve) => setTimeout(resolve, backoff));
            continue;
          }
        }

        throw apiError;
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (options.signal) {
          options.signal.removeEventListener('abort', onCallerAbort);
        }

        // Rethrow if already an ApiError (e.g. from correlation validation or non-retryable response)
        if (err instanceof ApiError && !(err instanceof ApiTimeoutError) && !(err instanceof ApiNetworkError)) {
          throw err;
        }

        const durationMs = Date.now() - startTime;
        let mappedError: ApiError;

        if (timedOut) {
          mappedError = new ApiTimeoutError(
            `Request timed out after ${currentAttemptTimeout}ms`,
            requestId,
          );
        } else if (err instanceof ApiError) {
          mappedError = err;
        } else {
          const msg = err instanceof Error ? err.message : 'Network request failed';
          mappedError = new ApiNetworkError(msg, requestId, err);
        }

        recordNetworkBreadcrumb(method, path, mappedError.statusCode, requestId, durationMs);
        lastError = mappedError;

        if (isIdempotent && attempt < maxRetries) {
          const backoff = retryDelayMs * Math.pow(2, attempt) + Math.random() * 50;
          if (Date.now() + backoff < deadline) {
            await new Promise((resolve) => setTimeout(resolve, backoff));
            continue;
          }
        }

        throw mappedError;
      }
    }

    throw lastError || new ApiError('Request failed after max retries', 500, requestId);
  }

  // HTTP helper methods
  async get<TResponse>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<TResponse>> {
    return this.request<TResponse>(path, { ...options, method: 'GET' });
  }

  async post<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<RequestOptions<TBody>, 'method' | 'body'>,
  ): Promise<ApiResponse<TResponse>> {
    return this.request<TResponse, TBody>(path, { ...options, method: 'POST', body });
  }

  async put<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<RequestOptions<TBody>, 'method' | 'body'>,
  ): Promise<ApiResponse<TResponse>> {
    return this.request<TResponse, TBody>(path, { ...options, method: 'PUT', body });
  }

  async patch<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<RequestOptions<TBody>, 'method' | 'body'>,
  ): Promise<ApiResponse<TResponse>> {
    return this.request<TResponse, TBody>(path, { ...options, method: 'PATCH', body });
  }

  async delete<TResponse>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<TResponse>> {
    return this.request<TResponse>(path, { ...options, method: 'DELETE' });
  }
}
