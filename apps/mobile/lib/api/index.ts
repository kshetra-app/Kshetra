/**
 * Canonical API Client Module Entry Point
 * Master Execution Framework — JOB W007
 */

import { ApiClient } from './client';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

// Production and preview builds must be explicitly bound to their authorized API.
// The test-only loopback avoids leaking a production endpoint into Jest and never
// acts as a runtime fallback in the shipped application.
if (!configuredApiUrl && process.env.NODE_ENV !== 'test') {
  throw new Error(
    'CONFIG_ERROR: EXPO_PUBLIC_API_URL is required. Configure the appropriate staging/production endpoint for this build; no production default is used.'
  );
}

export const CANONICAL_API_URL =
  configuredApiUrl || 'http://127.0.0.1:3001';

/**
 * Singleton canonical API client instance for the mobile application.
 */
export const apiClient = new ApiClient({
  baseUrl: CANONICAL_API_URL,
});

// Re-exports
export * from './types';
export * from './errors';
export * from './client';
export * from './authManager';
export * from './endpoints/config';
export * from './endpoints/pages';
export * from './endpoints/news';
export * from './endpoints/states';
export * from './endpoints/civic';
export * from './endpoints/politician';
export * from './endpoints/spatial';
export * from './endpoints/constituencies';
export * from './endpoints/elections';
export * from '../staleResponseGuard';
export {
  resolveRequestId,
  injectTracingHeaders,
  validateResponseCorrelation,
  recordNetworkBreadcrumb,
} from './interceptors/correlation';
export { applyAuthHeaders } from './interceptors/auth';
