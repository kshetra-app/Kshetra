/**
 * Canonical API Client Types & Contracts
 * Master Execution Framework — JOB W007
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

export type AuthPolicy = 'authenticated' | 'public';

export interface RequestOptions<TBody = unknown> {
  method?: HttpMethod;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: TBody;
  authPolicy?: AuthPolicy;  // DEFAULT: 'authenticated'. Must be explicitly declared 'public'
  timeoutMs?: number;       // Per-attempt timeout ceiling (default: 8,000ms, subject to remaining total budget)
  totalBudgetMs?: number;   // Overall request deadline budget (default: 18,000ms for GET)
  retries?: number;         // DEFAULT: 2 for GET/HEAD; 0 for POST/PUT/PATCH/DELETE
  retryDelayMs?: number;    // DEFAULT: 300ms exponential base
  customRequestId?: string; // Optional correlation ID (must match ^[a-zA-Z0-9_\-]+$)
  signal?: AbortSignal;     // Optional caller cancellation signal
}

export interface ApiResponse<TData> {
  data: TData;
  statusCode: number;
  headers: Headers;
  requestId: string;        // Echoed from server response header, strictly verified to match sent ID
}

export interface ApiClientConfig {
  baseUrl: string;
  defaultTimeoutMs?: number;
  defaultTotalBudgetMs?: number;
  defaultRetries?: number;
}

// Fastify Standard Error Envelope
export interface FastifyErrorEnvelope {
  error?: string;
  message?: string;
  statusCode?: number;
  requestId?: string;
  timestamp?: string;
}

// ==========================================
// DTOs for Pioneer Endpoints
// ==========================================

// 1. Config Flags DTO
export interface FeatureFlagsResponseDTO {
  status: string;
  flags: Record<string, boolean>;
  syncedAt?: string;
}

// 2. Page Entitlement DTO
export interface PageEntitlementResponseDTO {
  success: boolean;
  pageId: string;
  isPro: boolean;
  plan: 'free' | 'pro';
  expiresAt: string | null;
}

// 3. News Feed DTOs
export interface NewsItemDTO {
  id: string;
  title: string;
  summary?: string;
  url?: string;
  source?: string;
  publishedAt?: string;
  category?: string;
  state?: string;
  imageUrl?: string;
  language?: string;
}

export interface NewsFeedFiltersDTO {
  lang?: string;
  scope?: 'national' | 'state';
  state?: string;
  category?: string;
  limit?: number;
}

export interface NewsFeedResponseDTO {
  items: NewsItemDTO[];
  total?: number;
  generatedAt: string;
  filters?: Record<string, unknown>;
  sources?: unknown[];
}
